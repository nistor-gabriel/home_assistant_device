from config import Config
from switch import Switch
import log
import util
import math

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

    def __init__(self, config: Config, pin_dht22_box1: int, pin_dht22_box2: int, pin_dht22_exterior: int,
                 pin_dht22_power: int, switch_box1: Switch, switch_box2: Switch, loop: asyncio.AbstractEventLoop,
                 delta_grams: float, box1_disabled: bool, box2_disabled: bool):
        self._dht22_box1 = dht.DHT22(Pin(pin_dht22_box1))
        self._switch_box1 = switch_box1
        self._dht22_box2 = dht.DHT22(Pin(pin_dht22_box2))
        self._switch_box2 = switch_box2
        self._dht22_exterior = dht.DHT22(Pin(pin_dht22_exterior))
        self._dht22_power = Pin(pin_dht22_power, Pin.OUT)
        self._loop = loop
        self._name_box1 = config.create('name_box1', 'Box 1')
        self._name_box2 = config.create('name_box2', 'Box 2')
        self._delta_grams = config.create('delta_grams', delta_grams)

        self._listeners = util.Listeners()

        self._temp_box1: float | None = None
        self._hum_box1: float | None = None
        self._hum_abs_box1: float | None = None
        self._is_box1_on = False
        self._is_box1_disabled = config.create('box1_disabled', box1_disabled)
        self._temp_box2: float | None = None
        self._hum_box2: float | None = None
        self._hum_abs_box2: float | None = None
        self._is_box2_on = False
        self._is_box2_disabled = config.create('box2_disabled', box2_disabled)
        self._temp_exterior: float | None = None
        self._hum_exterior: float | None = None
        self._hum_abs_exterior: float | None = None

    def setup(self):
        self._loop.create_task(self._run())

    def add_listener(self, listener: typ.Callable[[str], None]):
        return self._listeners.add(listener)

    def get_name_box1(self):
        return self._name_box1.get()

    def get_name_box2(self):
        return self._name_box2.get()

    def get_delta_grams(self):
        return self._delta_grams.get()

    def get_switch_box1(self):
        return self._switch_box1

    def get_switch_box2(self):
        return self._switch_box2

    def is_box1_disabled(self):
        return self._is_box1_disabled.get()

    def is_box1_on(self):
        return self._is_box1_on

    def is_box2_disabled(self):
        return self._is_box2_disabled.get()

    def is_box2_on(self):
        return self._is_box2_on

    def get_temp_box1(self):
        return self._temp_box1

    def get_hum_box1(self):
        return self._hum_box1

    def get_hum_abs_box1(self):
        return self._hum_abs_box1

    def get_temp_box2(self):
        return self._temp_box2

    def get_hum_box2(self):
        return self._hum_box2

    def get_hum_abs_box2(self):
        return self._hum_abs_box2

    def get_temp_exterior(self):
        return self._temp_exterior

    def get_hum_exterior(self):
        return self._hum_exterior

    def get_hum_abs_exterior(self):
        return self._hum_abs_exterior

    def set_name_box1(self, name: str):
        if not util.is_str(name, min_len=3, max_len=50):
            log.error('invalid box1 name')
            return False
        self._name_box1.set(name)
        return True

    def set_name_box2(self, name: str):
        if not util.is_str(name, min_len=3, max_len=50):
            log.error('invalid box2 name')
            return False
        self._name_box2.set(name)
        return True

    def set_delta_grams(self, delta_grams: float):
        if not util.is_float(delta_grams, min_value=5):
            return False
        self._delta_grams.set(delta_grams)
        return True

    def set_box1_disabled(self, disabled: bool):
        if self._is_box1_disabled.get() != disabled:
            self._is_box1_disabled.set(disabled)
            if disabled:
                self._is_box1_on = False
                self._switch_box1.off()

    def set_box2_disabled(self, disabled: bool):
        if self._is_box2_disabled.get() != disabled:
            self._is_box2_disabled.set(disabled)
            if disabled:
                self._is_box2_on = False
                self._switch_box2.off()

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
            temp_box1, hum_box1 = await self._read_dht22(self._dht22_box1, 'box1')
            temp_has_changed = self._temp_box1 != temp_box1
            self._temp_box1 = temp_box1
            hum_has_changed = self._hum_box1 != hum_box1
            self._hum_box1 = hum_box1

            if temp_has_changed or hum_has_changed:
                if self._hum_box1 is not None and self._temp_box1 is not None:
                    self._hum_abs_box1 = self._calc_abs_humidity(self._temp_box1, self._hum_box1)
                else:
                    self._hum_abs_box1 = None

            if temp_has_changed or hum_has_changed:
                self._listeners.notify('box1StatsUpdate')

            temp_box2, hum_box2 = await self._read_dht22(self._dht22_box2, 'box2')
            temp_has_changed = self._temp_box2 != temp_box2
            self._temp_box2 = temp_box2
            hum_has_changed = self._hum_box2 != hum_box2
            self._hum_box2 = hum_box2

            if temp_has_changed or hum_has_changed:
                if self._hum_box2 is not None and self._temp_box2 is not None:
                    self._hum_abs_box2 = self._calc_abs_humidity(self._temp_box2, self._hum_box2)
                else:
                    self._hum_abs_box2 = None

            if temp_has_changed or hum_has_changed:
                self._listeners.notify('box2StatsUpdate')

            temp_exterior, hum_exterior = await self._read_dht22(self._dht22_exterior, 'exterior')
            temp_has_changed = self._temp_exterior != temp_exterior
            self._temp_exterior = temp_exterior
            hum_has_changed = self._hum_exterior != hum_exterior
            self._hum_exterior = hum_exterior

            if temp_has_changed or hum_has_changed:
                if self._hum_exterior is not None and self._temp_exterior is not None:
                    self._hum_abs_exterior = self._calc_abs_humidity(self._temp_exterior, self._hum_exterior)
                else:
                    self._hum_abs_exterior = None

            if temp_has_changed or hum_has_changed:
                self._listeners.notify('exteriorStatsUpdate')

            if not self._is_box1_disabled.get():
                # log.info('box1 stats abs exterior %s, abs box1 %s' % (self._hum_abs_exterior, self._hum_abs_box1))
                if self._is_box1_on:
                    if self._hum_abs_exterior is None or self._hum_abs_box1 is None or \
                            self._hum_abs_exterior + self._delta_grams.get() >= self._hum_abs_box1:
                        # log.info('turning box1 off')
                        self._is_box1_on = False
                        self._switch_box1.off()
                elif self._hum_abs_exterior is not None and self._hum_abs_box1 is not None and \
                        self._hum_abs_exterior + self._delta_grams.get() < self._hum_abs_box1:
                    # log.info('turning box1 on')
                    self._is_box1_on = True
                    self._switch_box1.on()

            if not self._is_box2_disabled.get():
                if self._is_box2_on:
                    if self._hum_abs_exterior is None or self._hum_abs_box2 is None or \
                            self._hum_abs_exterior + self._delta_grams.get() >= self._hum_abs_box2:
                        self._is_box2_on = False
                        self._switch_box2.off()
                elif self._hum_abs_exterior is not None and self._hum_abs_box2 is not None and \
                        self._hum_abs_exterior + self._delta_grams.get() < self._hum_abs_box2:
                    self._is_box2_on = True
                    self._switch_box2.on()

            await asyncio.sleep(60)
