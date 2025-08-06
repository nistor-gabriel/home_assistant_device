from trigger import Trigger
import time

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
    import uasyncio as asyncio


class TriggerButtonToggle(Trigger):

    def __init__(self, pin: int, loop: asyncio.AbstractEventLoop, delta_period: float = 1):
        super().__init__()
        self._loop = loop
        self._pin_number = pin
        self._delta_period = delta_period
        self._interval_check = delta_period / 10
        self._pin = Pin(self._pin_number, mode=Pin.IN, pull=Pin.PULL_DOWN)

        self._is_on = False
        self._last_is_on = False
        self._delta_time = 0

    def is_on(self):
        return self._is_on

    def clear(self):
        if self._is_on:
            self._is_on = False

    def setup(self):
        self._loop.create_task(self._run())

    async def _run(self):
        while True:
            ctime = time.time()
            if self._delta_time <= ctime:
                if self._pin.value():
                    if not self._last_is_on:
                        self._delta_time = ctime + self._delta_period
                        self._is_on = not self._is_on
                        self._last_is_on = True
                        self._listeners.notify(self)
                else:
                    self._last_is_on = False
            await asyncio.sleep(self._interval_check)
