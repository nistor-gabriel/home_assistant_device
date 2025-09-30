from config import Config
from switch import Switch
from blinker import Blinker
import util

try:
    import typ
except ImportError:
    typ = None
try:
    import machine
except ImportError:
    machine = typ.Any
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Controller:

    def __init__(self, config: Config, pin: int, off_low_pressure: float, off_low_period: float,
                 off_low_start_period: float, off_high_pressure: float, off_high_period: float,
                 switch_pump: Switch, blinker_pump: Blinker, loop: asyncio.AbstractEventLoop,
                 interval_update_pressure: float = 10,
                 disable_low_watchdog: bool = False, disable_high_watchdog: bool = False):
        self._listeners = util.Listeners()
        self._pin_number = pin
        self._switch_pump = switch_pump
        self._blinker_pump = blinker_pump
        self._loop = loop

        self._pin = machine.ADC(pin)
        self._off_low_pressure = config.create('cntrl_off_low_pressure', off_low_pressure)
        self._off_low_period = config.create('cntrl_off_low_period', off_low_period)
        self._off_low_start_period = config.create('cntrl_off_low_start_period', off_low_start_period)
        self._off_high_pressure = config.create('cntrl_off_high_pressure', off_high_pressure)
        self._off_high_period = config.create('cntrl_off_high_period', off_high_period)
        self._disabled_low_watchdog = config.create('cntrl_disable_low_watchdog', disable_low_watchdog)
        self._disabled_high_watchdog = config.create('cntrl_disable_high_watchdog', disable_high_watchdog)
        self._interval_update_pressure = interval_update_pressure
        self._pressure = 0.0
        self._is_pump_on = False
        self._off_low_time = 0
        self._off_high_time = 0
        self._last_issue: typ.Union[str, None] = None

    def add_listener(self, listener: typ.Callable[[str], None]):
        return self._listeners.add(listener)

    def get_pressure(self):
        return self._pressure

    def get_off_low_pressure(self):
        return self._off_low_pressure.get()

    def get_interval_update_pressure(self):
        return self._interval_update_pressure

    def set_off_low_pressure(self, off_low_pressure: float):
        if not util.is_float(off_low_pressure, min_value=0, max_ex_value=self._off_high_pressure.get()):
            print('ERROR: invalid off low pressure')
            return False
        if self._off_low_pressure.get() != off_low_pressure:
            self._off_low_pressure.set(off_low_pressure)
        return True

    def get_off_low_period(self):
        return self._off_low_period.get()

    def get_last_issue(self):
        return self._last_issue

    def set_off_low_period(self, off_low_period: int):
        if not util.is_int(off_low_period, min_ex_value=0):
            print('ERROR: invalid off low timeout')
            return False
        if self._off_low_period.get() != off_low_period:
            self._off_low_period.set(off_low_period)
        return True

    def get_off_low_start_period(self):
        return self._off_low_start_period.get()

    def set_off_low_start_period(self, off_low_start_period: int):
        if not util.is_int(off_low_start_period, min_ex_value=0):
            print('ERROR: invalid off low start timeout')
            return False
        if self._off_low_start_period.get() != off_low_start_period:
            self._off_low_start_period.set(off_low_start_period)
        return True

    def get_off_high_pressure(self):
        return self._off_high_pressure.get()

    def set_off_high_pressure(self, off_high_pressure: float):
        if not util.is_float(off_high_pressure, min_ex_value=self._off_low_pressure.get()):
            print('ERROR: invalid off high pressure')
            return False
        if self._off_high_pressure.get() != off_high_pressure:
            self._off_high_pressure.set(off_high_pressure)
        return True

    def get_off_high_period(self):
        return self._off_high_period.get()

    def set_off_high_period(self, off_high_period: int):
        if not util.is_int(off_high_period, min_ex_value=0):
            print('ERROR: invalid off high timeout')
            return False
        if self._off_high_period.get() != off_high_period:
            self._off_high_period.set(off_high_period)
        return True

    def get_disabled_low_watchdog(self):
        return self._disabled_low_watchdog.get()

    def set_disabled_low_watchdog(self, disabled: bool):
        if self._disabled_low_watchdog.get() != disabled:
            self._disabled_low_watchdog.set(disabled)
            if self._disabled_low_watchdog.get():
                self._off_low_time = 0

    def get_disabled_high_watchdog(self):
        return self._disabled_high_watchdog.get()

    def set_disabled_high_watchdog(self, disabled: bool):
        if self._disabled_high_watchdog.get() != disabled:
            self._disabled_high_watchdog.set(disabled)
            if self._disabled_high_watchdog.get():
                self._off_high_time = 0

    def setup(self):
        self._switch_pump.add_listener(lambda switch: self._switch_on() if switch.is_on() else self._switch_off())
        self._loop.create_task(self._run())

    async def _run(self):
        while True:
            pressure = self._pin.read_u16()
            has_changed = self._pressure != pressure
            self._pressure = round(pressure / 10000, 2)
            if has_changed:
                self._listeners.notify('pressureUpdate')
            if not self._disabled_low_watchdog.get() or not self._disabled_high_watchdog.get():
                if self._is_pump_on:
                    pressure = float(self._pressure)
                    high_pressure = float(self._off_high_pressure.get())
                    low_pressure = float(self._off_low_pressure.get())
                    if pressure <= low_pressure:
                        if not self._disabled_low_watchdog.get():
                            if self._off_low_time <= 0:
                                self._switch_pump.off()
                                if self._blinker_pump:
                                    self._blinker_pump.on(0.5, 0.5)
                                self._last_issue = 'pressureLow'
                                self._listeners.notify(self._last_issue)
                            else:
                                self._off_low_time -= 1
                    elif pressure >= high_pressure:
                        if not self._disabled_high_watchdog.get():
                            if self._off_high_time <= 0:
                                self._switch_pump.off()
                                self._last_issue = 'pressureHigh'
                                self._listeners.notify(self._last_issue)
                            else:
                                self._off_high_time -= 1
                    else:
                        self._off_low_time = int(self._off_low_period.get() / self._interval_update_pressure)
                        self._off_high_time = int(self._off_high_period.get() / self._interval_update_pressure)

            await asyncio.sleep(self._interval_update_pressure)

    def _switch_on(self):
        self._last_issue = None
        self._off_low_time = int(
            (self._off_low_start_period.get() + self._off_low_period.get()) / self._interval_update_pressure)
        self._off_high_time = int(self._off_high_period.get() / self._interval_update_pressure)
        self._is_pump_on = True
        self._listeners.notify('pumpOn')
        print('DEBUG: started pump off high time', self._off_high_time)

    def _switch_off(self):
        self._off_low_time = 0
        self._off_high_time = 0
        self._is_pump_on = False
        self._listeners.notify('pumpOff')
