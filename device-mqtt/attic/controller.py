import log
import util
import math
from config import Config
from http import http_get_json
from switch import Switch
from schedule import Schedule

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio
try:
    import dht
except ImportError:
    dht = typ.Any
try:
    from machine import Pin
except ImportError:
    Pin = typ.Any


class Controller:

    def __init__(self, config: Config, pin_dht22: int, pin_dht22_power: int, switch_ventilation: Switch,
                 schedule: Schedule, loop: asyncio.AbstractEventLoop, delta_grams: float, disabled: bool):
        self._dht22 = dht.DHT22(Pin(pin_dht22))
        self._dht22_power = Pin(pin_dht22_power, Pin.OUT)
        self._switch_ventilation = switch_ventilation
        self._schedule = schedule
        self._loop = loop
        self._hum_abs_exterior_url = config.create('hum_abs_exterior_url', '')
        self._is_disabled = config.create('controller_disabled', disabled)
        self._delta_grams = config.create('delta_grams', delta_grams)

        self._listeners = util.Listeners()

        self._temp: float | None = None
        self._hum: float | None = None
        self._hum_abs: float | None = None
        self._hum_abs_exterior: float | None = None
        self._is_on = False

    def get_hum_abs_exterior_url(self):
        return self._hum_abs_exterior_url.get()

    def set_hum_abs_exterior_url(self, url: typ.Union[str, None]):
        if url and not util.is_str(url, max_len=100):
            log.error('invalid url')
            return False
        self._hum_abs_exterior_url.set(url)
        return True

    def is_disabled(self):
        return self._is_disabled.get()

    def set_disabled(self, disabled: bool):
        if self._is_disabled.get() != disabled:
            self._is_disabled.set(disabled)
            if disabled:
                self._is_on = False
                self._switch_ventilation.off()

    def get_delta_grams(self):
        return self._delta_grams.get()

    def set_delta_grams(self, delta_grams: float):
        if not util.is_float(delta_grams, min_value=5):
            return False
        self._delta_grams.set(delta_grams)
        return True

    def setup(self):
        self._loop.create_task(self._run())

    def add_listener(self, listener: typ.Callable[[str], None]):
        return self._listeners.add(listener)

    def get_temp(self):
        return self._temp

    def get_hum(self):
        return self._hum

    def get_hum_abs(self):
        return self._hum_abs

    def get_hum_abs_exterior(self):
        return self._hum_abs_exterior

    def is_on(self):
        return self._is_on

    @staticmethod
    def _calc_abs_humidity(temp, hum):
        return math.ceil(216.7 * (hum / 100.0) * 6.112 * math.exp((17.67 * temp) / (temp + 243.5)))

    async def _power_off_dht22(self):
        log.info('power off dht22 sensors')
        self._dht22_power.value(0)
        await asyncio.sleep(3)

    async def _power_on_dht22(self):
        log.info('power on dht22 sensors')
        self._dht22_power.value(1)
        await asyncio.sleep(3)

    async def _read_dht22(self, dht22: dht.DHT22, name: str):
        k = 10
        while k > 0:
            try:
                dht22.measure()
                temp = dht22.temperature()
                hum = dht22.humidity()
                # log.info('read %s sensor, temperature %s and humidity %s' % (name, temp, hum))
                return temp, hum
            except OSError:
                log.info('failed to read %s sensor, retry %s' % (name, k))
                k -= 1
                await self._power_off_dht22()
                await self._power_on_dht22()

        return None, None

    async def _run(self):
        await self._power_on_dht22()

        while True:
            temp, hum = await self._read_dht22(self._dht22, 'dht22')
            temp_has_changed = self._temp != temp
            self._temp = temp
            hum_has_changed = self._hum != hum
            self._hum = hum

            if temp_has_changed or hum_has_changed:
                if self._hum is not None and self._temp is not None:
                    self._hum_abs = self._calc_abs_humidity(self._temp, self._hum)
                else:
                    self._hum_abs = None

            if temp_has_changed or hum_has_changed:
                self._listeners.notify('atticStatsUpdate')

            url_exterior = self._hum_abs_exterior_url.get()
            if url_exterior:
                url_exterior, _, prop = url_exterior.partition('#')
                prop = prop if prop else 'humidityAbsolute'
                try:
                    data = await http_get_json(url_exterior)
                    self._hum_abs_exterior = data.get(prop) if data and isinstance(data, dict) else None
                    # log.info('received exterior absolute humidity %s' % (self._hum_abs_exterior,))
                except Exception as e:
                    log.error('failed to get exterior absolute humidity from %s' % (url_exterior,), e)

            if not self._is_disabled.get():
                if self._is_on:
                    if self._schedule.get_state() is False or (
                            self._hum_abs_exterior is not None and self._hum_abs is not None and
                            self._hum_abs_exterior > self._hum_abs):
                        # log.info('turning off')
                        self._is_on = False
                        self._switch_ventilation.off()

                elif self._schedule.get_state() is True and (
                        (self._hum_abs_exterior is not None and self._hum_abs is not None and
                         self._hum_abs_exterior + self._delta_grams.get() < self._hum_abs)
                        or (self._hum_abs_exterior is None or self._hum_abs is None)
                ):
                    # log.info('turning on')
                    self._is_on = True
                    self._switch_ventilation.on()

            await asyncio.sleep(60)
