from config import Config
import util

try:
    from event import EventManager
except ImportError:
    EventManager = None
try:
    import typ
except ImportError:
    typ = None
try:
    from machine import Pin
except ImportError:
    Pin = typ.Any
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Heating:

    def __init__(self, config: Config, loop: asyncio.AbstractEventLoop, pin_pump: int, pin_heat: int,
                 pump_cycle_period: float, offset_period: float, pump_period: float):

        self._loop = loop
        self._pin_pump = Pin(pin_pump, mode=Pin.OUT)
        self._pin_heat = Pin(pin_heat, mode=Pin.OUT)
        self._pin_pump.high()
        self._pin_heat.high()

        self._pump_cycle_period = config.create('heating_pump_cycle_period', pump_cycle_period)
        self._offset_period = config.create('heating_offset_period', offset_period)
        self._pump_period = config.create('heating_pump_period', pump_period)

        self._listeners = util.Listeners()

        self._is_pump_on = False
        self._is_heat_on = False
        self._stop_time = 0
        self._is_start_offset = False
        self._is_stop_offset = False
        self._is_auto_stop = False
        self._is_auto_stop_pump = False
        self._on_since = None
        self._off_since = util.time()

    def setup(self):
        self._loop.create_task(self._run())

    def add_listener(self, listener: typ.Callable[[str], None]):
        return self._listeners.add(listener)

    def is_pump_on(self):
        return self._is_pump_on

    def is_heat_on(self):
        return self._is_heat_on

    def get_stop_time(self):
        return self._stop_time

    def get_pump_cycle_period(self):
        return self._pump_cycle_period.get()

    def get_pump_period(self):
        return self._pump_period.get()

    def get_offset_period(self):
        return self._offset_period.get()

    def get_on_since(self):
        return self._on_since

    def get_off_since(self):
        return self._off_since

    def set_pump_cycle_period(self, seconds: float):
        if seconds < 24 * 3600:  # Minimum time will be a day
            print('ERROR: cycle period needs to be more then a day')
            return False
        self._pump_cycle_period.set(seconds)
        return True

    def set_pump_period(self, seconds: float):
        if seconds < 10:
            print('ERROR: pump period needs to be more then 10 seconds')
            return False
        self._pump_period.set(seconds)
        return True

    def set_offset_period(self, seconds):
        self._offset_period.set(seconds)
        return True

    # The default heating stop period will be 1 hour, the time is in seconds.
    def on(self, timeout: float):
        if self._start(timeout, True):
            return True
        return False

    def on_continuously(self):
        self._is_auto_stop = False
        self._stop_time = 0
        return self._start(0, False)

    def off(self):
        if not self._is_pump_on:
            return False
        if self._is_stop_offset:
            return False
        if self._is_heat_on:
            print('stopping heating')
            self._stop_heat()
        else:
            self._is_start_offset = False
            self._stop_pump()
        return True

    def _start(self, timeout, is_auto_stop):
        if self._is_pump_on and self._is_heat_on:
            return False
        if self._is_start_offset:
            return False
        print('starting heating')

        self._stop_time = timeout
        self._is_auto_stop = is_auto_stop

        self._start_pump()
        self._is_stop_offset = self._is_auto_stop_pump = False
        self._is_start_offset = True
        return True

    def _start_pump(self):
        if self._is_pump_on:
            return
        self._is_pump_on = True
        self._pin_pump.low()
        self._on_since = util.time()
        self._listeners.notify('pumpOn')
        print('started pump')

    def _start_maintenance(self):
        self._start_pump()
        self._is_auto_stop_pump = True

    def _stop_pump(self):
        if not self._is_pump_on:
            return
        self._is_pump_on = self._is_auto_stop = self._is_auto_stop_pump = False
        self._pin_pump.high()
        self._off_since = util.time()
        self._on_since = None
        self._stop_time = 0
        self._listeners.notify('pumpOff')
        print('stopped pump')

    def _start_heat(self):
        if self._is_heat_on:
            return
        self._is_heat_on = True
        self._pin_heat.low()
        self._listeners.notify('heatOn')
        print('started heat')

    def _stop_heat(self):
        if not self._is_heat_on:
            return
        self._is_heat_on = False
        self._is_stop_offset = True
        self._on_since = util.time()
        self._pin_heat.high()
        self._listeners.notify('heatOff')
        print('stopped heat')

    async def _run(self):
        await asyncio.sleep(20)  # wait 20 seconds so the time can be synchronized
        self._start_maintenance()
        while True:
            ctime = util.time()
            if self._is_start_offset or self._is_stop_offset:
                if ctime - self._on_since >= self._offset_period.get():
                    if self._is_start_offset:
                        self._is_start_offset = False
                        self._start_heat()
                    elif self._is_stop_offset:
                        self._is_stop_offset = False
                        self._stop_pump()
            elif self._is_pump_on:
                if self._is_auto_stop or self._is_auto_stop_pump:
                    delta = ctime - self._on_since
                    if self._is_auto_stop:
                        if delta + self._offset_period.get() >= self._stop_time:
                            self._is_auto_stop = False
                            self._stop_heat()
                    elif self._is_auto_stop_pump and delta > self._pump_period.get():
                        self._is_auto_stop_pump = False
                        self._stop_pump()
            else:
                if ctime - self._off_since >= self._pump_cycle_period.get():
                    self._start_maintenance()

            await asyncio.sleep(1)
