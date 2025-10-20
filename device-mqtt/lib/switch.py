import util
import time
from config import Config
try:
    import typ
except ImportError:
    typ = None
try:
    from blinker import Blinker
except ImportError:
    Blinker = None
try:
    from trigger import Trigger
except ImportError:
    Trigger = None
try:
    from machine import Pin
except ImportError:
    Pin = typ.Any if typ else None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Switch:

    def __init__(self, pin: int, id_: int, config: Config, loop: asyncio.AbstractEventLoop,
                 blinker: Blinker | None = None, trigger: Trigger | None = None):
        self._listeners = util.Listeners()
        self._id = id_
        self._name = config.create('switch_' + str(id_) + '_name', 'Switch ' + str(id_))
        self._disabled = config.create('switch_' + str(id_) + '_disabled', False)
        self._disabled_blinker_time = 0
        self._loop = loop
        self._event = asyncio.Event()
        self._is_on = False
        self._on_since = None
        self._stop_time = 0

        self._pin = Pin(pin, mode=Pin.OUT)
        self._pin.high()

        self._blinker = blinker
        self._trigger = trigger

    def get_id(self):
        return self._id

    def get_name(self):
        return self._name.get()

    def set_name(self, name: str):
        if not util.is_str(name, min_len=3, max_len=50):
            print('ERROR: invalid relay name')
            return False
        self._name.set(name)
        return True

    def is_disabled(self):
        return self._disabled.get()

    def set_disabled(self, disabled: bool):
        if self._disabled.get() == disabled:
            return
        self._disabled.set(disabled)
        if not disabled and self._blinker:
            self._blinker.off()
            self._disabled_blinker_time = 0
        if self._is_on:
            self.off()
        self._listeners.notify(self)

    def add_listener(self, listener: typ.Callable[['Switch'], None]):
        return self._listeners.add(listener)

    def setup(self):
        if self._trigger:
            self._trigger.add_listener(lambda trigger_: self.on() if self._trigger.is_on() else self.off())
        self._loop.create_task(self._run())

    def get_on_since(self):
        return self._on_since

    def get_stop_time(self):
        return self._stop_time

    def is_on(self):
        return self._is_on

    def on(self, timeout: float | None = None):
        if self._disabled.get():
            if self._trigger:
                self._trigger.clear()
            if self._blinker:
                self._blinker.on(0.3, 0.1, 0.3, 0.1)
                self._disabled_blinker_time = 5
                self._event.set()
            return
        if timeout:
            self._stop_time = timeout
            if self._blinker:
                self._blinker.on(1, 0.75, 0.75, 0.75)
        else:
            self._stop_time = 0
            if self._blinker:
                self._blinker.on()
        if self._is_on:
            return
        self._on_since = util.time()
        self._is_on = True
        self._event.set()
        self._pin.low()
        self._listeners.notify(self)

    def off(self):
        if not self._is_on:
            return False
        self._on_since = None
        self._is_on = False
        self._pin.high()
        self._stop_time = 0
        if self._blinker:
            self._blinker.off()
        self._listeners.notify(self)
        if self._trigger:
            self._trigger.clear()
        return True

    async def _run(self):
        while True:
            if self._disabled.get() and self._disabled_blinker_time > 0:
                self._disabled_blinker_time -= 1
                # print('DEBUG:', self._disabled_blinker_time)
                if not self._disabled_blinker_time:
                    self._blinker.off()
                await asyncio.sleep(1)

            elif self._is_on and self._stop_time:
                ctime = time.time()
                stop_time = self._on_since + self._stop_time
                if stop_time <= ctime:
                    self.off()
                else:
                    await asyncio.sleep(stop_time - ctime)
            else:
                await self._event.wait()
                self._event.clear()
