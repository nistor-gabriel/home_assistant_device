try:
    import typ
except ImportError:
    typ = None
try:
    from machine import WDT
except ImportError:
    WDT = typ.Any if typ else None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class WatchDog:

    def __init__(self, loop: asyncio.AbstractEventLoop):
        self._wdt = None
        self._loop = loop

    def setup(self):
        self._wdt = WDT(timeout=8000)
        self._loop.create_task(self._run())

    async def _run(self):
        while True:
            self._wdt.feed()
            await asyncio.sleep(2)
