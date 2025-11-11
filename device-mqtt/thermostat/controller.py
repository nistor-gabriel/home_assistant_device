from config import Config
from temperature_sensor import TemperatureSensor
from heating import Heating
from auto_schedule import AutoSchedule
import util
import util_temp

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Controller:

    MODE_MANUAL = 'manual'
    MODE_AWAY = 'away'
    MODE_AUTO = 'auto'
    MODE_DISABLED = 'disabled'

    MODES = [MODE_AUTO, MODE_MANUAL, MODE_AWAY, MODE_DISABLED]

    def __init__(self, config: Config, heating: Heating, loop: asyncio.AbstractEventLoop,
                 temp_sensor: TemperatureSensor, auto_schedule: AutoSchedule, temp_away: float, temp_manual: float,
                 delta_start: float, delta_end: float):
        self._heating = heating
        self._auto_schedule = auto_schedule
        self._loop = loop
        self._temp_sensor: TemperatureSensor = temp_sensor
        self._mode = config.create('temperature_mode', self.MODE_MANUAL)
        self._temp_away = config.create('temperature_away', temp_away)
        self._temp_manual = config.create('temperature_manual', temp_manual)
        self._delta_start = config.create('temperature_delta_start', delta_start)
        self._delta_end = config.create('temperature_delta_end', delta_end)

        self._listeners = util.Listeners()

        self._devices: list | None = None
        self._temp: float | None = None
        self._is_on = False
        self._temp_target: float = self.get_target_temp()
        self._last_mode = self.get_mode()

    def setup(self):
        self._loop.create_task(self._run())

    def add_listener(self, listener: typ.Callable[[str], None]):
        return self._listeners.add(listener)

    def get_mode(self):
        mode = self._mode.get()
        if mode == self.MODE_AUTO and not util.is_time_synchronized:
            return self.MODE_MANUAL
        return self._mode.get()

    def get_delta_start(self):
        return self._delta_start.get()

    def set_delta_start(self, delta_start: float):
        if delta_start < 0 or delta_start > 5:
            return False
        self._delta_start.set(delta_start)
        return True

    def get_delta_end(self):
        return self._delta_end.get()

    def set_delta_end(self, delta_end: float):
        if delta_end < 0 or delta_end > 5:
            return False
        self._delta_end.set(delta_end)
        return True

    def set_mode(self, mode: str):
        if mode not in self.MODES:
            return False
        if mode == self.MODE_DISABLED:
            self._is_on = False
            self._heating.off()
        self._mode.set(mode)
        return True

    def get_temp_away(self):
        return self._temp_away.get()

    def get_temp_manual(self):
        return self._temp_manual.get()

    def set_temp_away(self, temp: float):
        if not util_temp.is_valid_temp(temp):
            return False
        self._temp_away.set(temp)
        return True

    def set_temp_manual(self, temp: float):
        if not util_temp.is_valid_temp(temp):
            return False
        self._temp_manual.set(temp)
        return True

    def get_target_temp(self):
        mode = self.get_mode()
        if mode == self.MODE_AWAY:
            return self._temp_away.get()
        if mode == self.MODE_MANUAL:
            return self._temp_manual.get()
        if mode == self.MODE_DISABLED:
            return None
        return self._auto_schedule.get_temp()

    def get_temp(self):
        return self._temp

    def is_on(self):
        return self._is_on

    def is_disabled(self):
        return self._mode == self.MODE_DISABLED

    async def _run(self):
        await asyncio.sleep(25)  # wait 25 seconds so the time can be synchronized
        while True:
            temp = self._temp_sensor.read_temperature()
            has_changed = self._temp != temp
            self._temp = temp
            if self._temp is None:
                if self._is_on:
                    self._is_on = False
                    self._heating.off()
                    self._listeners.notify('thermostatOn')
                    print('thermostat off, no temp')
                if has_changed:
                    self._listeners.notify('temperature')
                await asyncio.sleep(5)
                continue

            mode = self.get_mode()
            if self._last_mode != mode:
                self._listeners.notify('mode')
                self._last_mode = mode

            temp_target = self.get_target_temp()
            if self._temp_target != temp_target:
                self._listeners.notify('temperatureTarget')
                self._temp_target = temp_target
            if self._mode.get() != self.MODE_DISABLED:
                if self._is_on:
                    if self._temp > self._temp_target + self._delta_end.get():
                        self._is_on = False
                        self._heating.off()
                        self._listeners.notify('thermostatOff')
                        print('thermostat off')
                elif self._temp < self._temp_target - self._delta_start.get():
                    self._is_on = True
                    self._heating.on_continuously()
                    self._listeners.notify('thermostatOn')
                    print('thermostat on')

            if has_changed:
                self._listeners.notify('temperature')

            await asyncio.sleep(30)
