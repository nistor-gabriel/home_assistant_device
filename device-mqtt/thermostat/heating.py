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

    def __init__(self, config: Config, pin_pump: int, pin_heat: int,
                 stop_period: float, pump_cycle_period: float, offset_period: float, pump_period: float):

        self._pin_pump = Pin(pin_pump, mode=Pin.OUT)
        self._pin_heat = Pin(pin_heat, mode=Pin.OUT)
        self._pin_pump.high()
        self._pin_heat.high()

        self._stop_period = config.create('heating_stop_period', stop_period)
        self._pump_cycle_period = config.create('heating_pump_cycle_period', pump_cycle_period)
        self._offset_period = config.create('heating_offset_period', offset_period)
        self._pump_period = config.create('heating_pump_period', pump_period)

        self._is_pump_on = False
        self._is_heat_on = False
        self._is_start_offset = False
        self._is_stop_offset = False
        self._is_auto_stop = False
        self._is_auto_stop_pump = False
        self._offset_time = 0
        self._stop_time = 0
        self._pump_cycle_time = 0

        self._event_manager: EventManager | None = None

    def bind_event_manager(self, event_manager: EventManager):
        self._event_manager = event_manager

    def is_pump_on(self):
        return self._is_pump_on

    def is_heat_on(self):
        return self._is_heat_on

    def get_stop_period(self):
        return self._stop_period.get()

    def get_stop_timeout(self):
        if self._is_auto_stop:
            return self._stop_period.get() - (util.uptime() - self._stop_time)
        return 0

    def get_pump_cycle_period(self):
        return self._pump_cycle_period.get()

    def get_pump_period(self):
        return self._pump_period.get()

    def get_pump_cycle_timeout(self):
        if self._is_pump_on:
            return 0
        return self._pump_cycle_period.get() - (util.uptime() - self._pump_cycle_time)

    def get_offset_period(self):
        return self._offset_period.get()

    def get_offset_timeout(self):
        if self._is_start_offset or self._is_stop_offset:
            return self._offset_period.get() - (util.uptime() - self._offset_time)
        return 0

    def set_stop_period(self, seconds: float):
        if 2 * self._offset_period.get() >= seconds:
            print('ERROR: stop period needs to be more then 2 offsets')
            return False
        self._stop_period.set(seconds)
        self._dispatch()
        return True

    def set_pump_cycle_period(self, seconds: float):
        if self._stop_period.get() >= seconds:
            print('ERROR: cycle period needs to be more then stop period')
            return False
        self._pump_cycle_period.set(seconds)
        self._dispatch()
        return True

    def set_pump_period(self, seconds: float):
        if seconds < 10:
            print('ERROR: pump period needs to be more then 10 seconds')
            return False
        self._pump_period.set(seconds)
        self._dispatch()
        return True

    def set_offset_period(self, seconds):
        if 2 * seconds >= self._stop_period.get():
            print('ERROR: offset period needs to be less then half of stop period')
            return False
        self._offset_period.set(seconds)
        self._dispatch()
        return True

    def on(self):
        if self.on_continuously():
            self._is_auto_stop = True
            return True
        return False

    def on_continuously(self):
        self._is_auto_stop = False
        if self._is_pump_on and self._is_heat_on:
            return False
        if self._is_start_offset:
            return False
        print('starting heating')

        self._start_pump()
        self._is_stop_offset = self._is_auto_stop_pump = False
        self._is_start_offset = True
        self._offset_time = util.uptime()
        return True

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

    def _dispatch(self):
        if self._event_manager:
            self._event_manager.dispatch({'type': 'heating'})

    def _start_pump(self):
        self._stop_time = util.uptime()
        if self._is_pump_on:
            return
        self._is_pump_on = True
        self._pin_pump.low()
        self._dispatch()
        print('started pump')

    def _stop_pump(self):
        if not self._is_pump_on:
            return
        self._is_pump_on = self._is_auto_stop = self._is_auto_stop_pump = False
        self._pin_pump.high()
        self._pump_cycle_time = util.uptime()
        self._dispatch()
        print('stopped pump')

    def _start_heat(self):
        if self._is_heat_on:
            return
        self._is_heat_on = True
        self._pin_heat.low()
        self._dispatch()
        print('started heat')

    def _stop_heat(self):
        if not self._is_heat_on:
            return
        self._is_heat_on = False
        self._is_stop_offset = True
        self._offset_time = util.uptime()
        self._pin_heat.high()
        self._dispatch()
        print('stopped heat')

    async def run(self):
        self._pump_cycle_time = util.uptime()
        while True:
            ctime = util.uptime()
            if self._is_start_offset or self._is_stop_offset:
                if ctime - self._offset_time >= self._offset_period.get():
                    if self._is_start_offset:
                        self._is_start_offset = False
                        self._start_heat()
                    elif self._is_stop_offset:
                        self._is_stop_offset = False
                        self._stop_pump()
            elif self._is_pump_on:
                if self._is_auto_stop or self._is_auto_stop_pump:
                    delta = ctime - self._stop_time
                    if self._is_auto_stop:
                        if delta + self._offset_period.get() >= self._stop_period.get():
                            self._is_auto_stop = False
                            self._stop_heat()
                    elif self._is_auto_stop_pump and delta > self._pump_period.get():
                        self._is_auto_stop_pump = False
                        self._stop_pump()
            else:
                if ctime - self._pump_cycle_time >= self._pump_cycle_period.get():
                    self._start_pump()
                    self._is_auto_stop_pump = True

            await asyncio.sleep(1)
