import util
try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Trigger:

    def __init__(self):
        self._listeners = util.Listeners()

    def add_listener(self, listener: typ.Callable[['Trigger'], None]):
        return self._listeners.add(listener)

    def is_on(self) -> bool:
        pass

    def clear(self) -> None:
        pass
