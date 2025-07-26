import json
try:
    import typ

    T = typ.TypeVar("T")
    Generic = typ.Generic[T]
except ImportError:
    typ = None

    class Generic:
        pass
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio


class Config:

    def __init__(self, filename: str, loop: asyncio.AbstractEventLoop, interval_save: float = 30):
        self.has_changed = False
        self._entries = {}
        self._filename = filename
        self._loop = loop
        self._interval_save = interval_save

    def create(self, name, value: T):
        entry = ConfigEntry(self, value)
        self._entries[name] = entry
        return entry

    def setup(self):
        cnt = None
        try:
            f = open(self._filename, 'r')
            # noinspection PyTypeChecker
            cnt = json.load(f)
            f.close()
        except OSError:
            print('no config file available')

        if not cnt:
            return
        for key in self._entries.keys():
            if key in cnt:
                self._entries[key].set(cnt[key])

        self.has_changed = False
        self._loop.create_task(self._run())

    def reset(self):
        for key in self._entries.keys():
            self._entries[key].reset()

    async def _run(self):
        while True:
            if self.has_changed:
                self.has_changed = False
                f = open(self._filename, 'w')
                # noinspection PyTypeChecker
                json.dump({key: self._entries[key].get() for key in self._entries}, f, separators=(',', ':'))
                f.close()
                print('config file saved')
            await asyncio.sleep(self._interval_save)


class ConfigEntry(Generic):

    def __init__(self, cfg: Config, value: T):
        self._cfg = cfg
        self._default: T = value
        self._value: T = value

    def get(self) -> T:
        return self._value

    def set(self, value: T):
        self._value = value
        self._cfg.has_changed = True

    def reset(self):
        self._value = self._default
        self._cfg.has_changed = True
