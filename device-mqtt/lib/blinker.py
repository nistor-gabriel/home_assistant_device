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


class Blinker:

    def __init__(self, pin: int, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._event = asyncio.Event()
        self._pin = Pin(pin, mode=Pin.OUT)
        self._pin.high()

        self._sequence: list[float] | None = None
        self._on = False
        self._index = 0

    def is_on(self):
        return bool(self._sequence)

    def on(self, *sequence: float):
        self._sequence = sequence if len(sequence) else (1,)
        self._index = 0
        self._event.set()

    def off(self):
        if self._sequence:
            self._sequence = None
            self._pin.high()

    def setup(self):
        self._loop.create_task(self._run())

    async def _run(self):
        stop_time = 0
        while True:
            if self._sequence:
                ctime = time.time()
                if self._index >= len(self._sequence):
                    self._index = 0
                if not self._index:
                    interval_sleep = self._sequence[self._index]
                    stop_time = ctime + interval_sleep
                    self._on = True
                    self._pin.low()
                    self._index += 1

                elif stop_time <= ctime:
                    interval_sleep = self._sequence[self._index]
                    stop_time = ctime + interval_sleep
                    self._on = not self._on
                    if self._on:
                        self._pin.low()
                    else:
                        self._pin.high()
                    self._index += 1
                else:
                    interval_sleep = stop_time - ctime

                await asyncio.sleep(interval_sleep)
            else:
                await self._event.wait()
                self._event.clear()
