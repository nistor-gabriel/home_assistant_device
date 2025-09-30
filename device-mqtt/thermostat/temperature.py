from config import Config
import time
import json
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


class Temperature:

    MODE_MANUAL = "manual"
    MODE_AWAY = "away"
    MODE_AUTO = "auto"

    @staticmethod
    def _check_temp(temp: float):
        if not isinstance(temp, (int, float)):
            return False
        if temp < 5:
            return False
        if temp > 30:
            return False
        return True

    def __init__(self, config: Config, filename: str, temperature: float, delta_start: float, delta_end: float):
        self.has_changed = False
        self._filename = filename
        self._temp = {
            self.MODE_MANUAL: temperature,
            self.MODE_AWAY: temperature,
        }
        for week_day in range(0, 7):
            self._temp[str(week_day)] = {str(hour): temperature for hour in range(0, 24)}

        self._mode = config.create('temperature_mode', self.MODE_MANUAL)
        self._delta_start = config.create('temperature_delta_start', delta_start)
        self._delta_end = config.create('temperature_delta_end', delta_end)

    def load(self):
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
        self.has_changed = False

    def get_mode(self):
        return self._mode.get()

    def get_delta_start(self):
        return self._delta_start.get()

    def set_delta_start(self, delta_start: float):
        if delta_start < 0 or delta_start > 5:
            return False
        self._delta_start.set(delta_start)
        self._dispatch()
        return True

    def get_delta_end(self):
        return self._delta_end.get()

    def set_delta_end(self, delta_end: float):
        if delta_end < 0 or delta_end > 5:
            return False
        self._delta_end.set(delta_end)
        self._dispatch()
        return True

    def set_mode(self, mode: str):
        if mode != self.MODE_MANUAL and mode != self.MODE_AWAY and mode != self.MODE_AUTO:
            return False
        self._mode.set(mode)
        self._dispatch()
        return True

    def get_temperatures(self):
        return self._temp

    def set_temperatures(self, temp):
        if not isinstance(temp, dict):
            return False
        value = temp.get(self.MODE_MANUAL)
        if not self._check_temp(value):
            return False
        value = temp.get(self.MODE_AWAY)
        if not self._check_temp(value):
            return False

        for week_day in range(0, 7):
            day = temp.get(str(week_day))
            if not isinstance(day, dict):
                return False
            for hour in range(0, 24):
                value = day.get(str(hour))
                if not self._check_temp(value):
                    return False

        self._temp = temp
        self.has_changed = True
        self._dispatch()
        return True

    def get_min_temp(self):
        return self.get_temp() - self._delta_start.get()

    def get_max_temp(self):
        return self.get_temp() + self._delta_end.get()

    def get_temp(self):
        mode = self._mode.get()
        if not util.is_time_synchronized:
            return self._temp[self.MODE_MANUAL]
        if mode == self.MODE_AWAY or mode == self.MODE_MANUAL:
            return self._temp[mode]

        ctime = time.localtime()
        return self._temp[str(ctime[6])][str(ctime[3])]

    def _dispatch(self):
        if self._event_manager:
            self._event_manager.dispatch({'type': 'temperature'})

    async def run(self):
        while True:
            if self.has_changed:
                self.has_changed = False
                f = open(self._filename, 'w')
                # noinspection PyTypeChecker
                json.dump(self._temp, f)
                f.close()
                print('temperature file saved')
            await asyncio.sleep(5)
