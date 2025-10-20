from microdot import Microdot, Request
from mqtt_repo import MQTTRepo
from device import Device
from auth import Auth
import gc
import os
import util
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


def install_stats(app: Microdot, auth: Auth, mqtt: MQTTRepo, device: Device,
                  loop: asyncio.AbstractEventLoop, interval_refresh: float = 60):
    gc.enable()
    data = {}

    async def run():
        while True:
            gc.collect()
            stat = os.statvfs('/')
            size = stat[1] * stat[2]
            free = stat[0] * stat[3]
            used = size - free
            # noinspection PyUnresolvedReferences
            data.update(
                time=util.format_date(util.local_time()),
                tzone=util.timezone['name'],
                uptime=util.uptime(),
                memoryFree=gc.mem_free(),
                memoryUsed=gc.mem_alloc(),
                flashFree=free,
                flashUsed=used,
            )
            mqtt.put_obj('device/%(id)s/stats', data)
            await asyncio.sleep(interval_refresh)

    device.add_config('stats_config.json')
    loop.create_task(run())

    @app.get('/stats')
    @auth.with_auth
    def handle_get(_request: Request):
        return data
