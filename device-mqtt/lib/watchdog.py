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
        self._loop = loop

    def setup(self):
        self._loop.create_task(self._run())

    # noinspection PyMethodMayBeStatic
    async def _run(self):
        await asyncio.sleep(30)  # 30 seconds until we start the watchdog
        wdt = WDT(timeout=8000)
        while True:
            wdt.feed()
            await asyncio.sleep(2)
