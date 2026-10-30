import json
import util
import log

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Schedule:

    def __init__(self, loop: asyncio.AbstractEventLoop, filename: str, on: bool):
        self._loop = loop
        self._has_changed = False
        self._filename = filename
        self._schedule = {str(week_day): {str(hour): on for hour in range(0, 24)} for week_day in range(0, 7)}

    def setup(self):
        try:
            f = open(self._filename, 'r')
            # noinspection PyTypeChecker
            self._schedule = json.load(f)
            f.close()
        except OSError:
            log.info('no schedule file available')

        self._has_changed = False
        self._loop.create_task(self._run())

    def get_schedule(self):
        return self._schedule

    def set_schedule(self, schedule):
        if not isinstance(schedule, dict):
            return False

        for week_day in range(0, 7):
            day = schedule.get(str(week_day))
            if not isinstance(day, dict):
                return False
            for hour in range(0, 24):
                value = day.get(str(hour))
                if not util.is_bool(value):
                    return False

        self._schedule = schedule
        self._has_changed = True
        return True

    def get_state(self):
        ctime = util.local_time()
        return self._schedule[str(ctime[6])][str(ctime[3])]

    async def _run(self):
        while True:
            if self._has_changed:
                self._has_changed = False
                f = open(self._filename, 'w')
                # noinspection PyTypeChecker
                json.dump(self._schedule, f, separators=(',', ':'))
                f.close()
                log.info('schedule file saved')
            await asyncio.sleep(5)
