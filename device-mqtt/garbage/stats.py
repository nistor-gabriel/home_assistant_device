import gc
import os
import time
import util
from wlan import Wlan
from mqtt_repo import MQTTRepo
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio
try:
    import stats_typ as typ
except ImportError:
    typ = None


class Stats:

    def __init__(self, wlan: Wlan, mqtt: MQTTRepo, loop: asyncio.AbstractEventLoop, interval_refresh: float = 60):
        self._wlan = wlan
        self._mqtt = mqtt
        self._loop = loop
        self._interval_refresh = interval_refresh
        self._data: typ.Union[typ.StatsDict, None] = None

    def data(self):
        return self._data

    def setup(self):
        gc.enable()
        self._mqtt.put_batch('stats_config.json')
        self._loop.create_task(self._run())

    async def _run(self):
        while True:
            gc.collect()
            stat = os.statvfs('/')
            size = stat[1] * stat[2]
            free = stat[0] * stat[3]
            used = size - free
            # noinspection PyUnresolvedReferences
            self._data: typ.StatsDict = {
                'time': util.format_date(time.localtime()),
                'uptime': util.uptime(),
                'wifiSignal': self._wlan.wifi_signal(),
                'memoryFree': gc.mem_free(),
                'memoryUsed': gc.mem_alloc(),
                'flashFree': free,
                'flashUsed': used,
            }
            self._mqtt.put_obj('device/%(id)s/stats', self._data)
            await asyncio.sleep(self._interval_refresh)
