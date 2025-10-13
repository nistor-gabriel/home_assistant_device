import time
import json
import util_temp

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class AutoSchedule:

    def __init__(self, loop: asyncio.AbstractEventLoop, filename: str, temperature: float):
        self._loop = loop
        self._has_changed = False
        self._filename = filename
        self._temp = {str(week_day): {str(hour): temperature for hour in range(0, 24)} for week_day in range(0, 7)}

    def setup(self):
        cnt = None
        try:
            f = open(self._filename, 'r')
            # noinspection PyTypeChecker
            cnt = json.load(f)
            f.close()
        except OSError:
            print('no temperature file available')

        if not cnt:
            return
        self._temp = cnt
        self._has_changed = False
        self._loop.create_task(self._run())

    def get_temperatures(self):
        return self._temp

    def set_temperatures(self, temp):
        if not isinstance(temp, dict):
            return False

        for week_day in range(0, 7):
            day = temp.get(str(week_day))
            if not isinstance(day, dict):
                return False
            for hour in range(0, 24):
                value = day.get(str(hour))
                if not util_temp.is_valid_temp(value):
                    return False

        self._temp = temp
        self._has_changed = True
        return True

    def get_temp(self):
        ctime = time.localtime()
        return self._temp[str(ctime[6])][str(ctime[3])]

    async def _run(self):
        while True:
            if self.has_changed:
                self.has_changed = False
                f = open(self._filename, 'w')
                # noinspection PyTypeChecker
                json.dump(self._temp, f)
                f.close()
                print('temperature file saved')
            await asyncio.sleep(5)
