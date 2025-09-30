from auth import Auth
from wlan import Wlan
from microdot import Microdot, Request
from mqtt_repo import MQTTRepo
from device import Device
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


def install_wlan(app: Microdot, auth: Auth, wlan: Wlan, mqtt: MQTTRepo, device: Device,
                 loop: asyncio.AbstractEventLoop, interval_refresh: float = 60):
    data = {}
    event = asyncio.Event()

    def on_connect(_has_internet: bool):
        event.set()

    def on_disconnect():
        event.set()

    wlan.add_connect_listener(on_connect)
    wlan.add_disconnect_listener(on_disconnect)

    async def run():
        while True:
            try:
                data.update(
                    ssid=wlan.get_ssid(),
                    ip=wlan.get_ip(),
                    subnet=wlan.get_subnet(),
                    dns=wlan.get_dns(),
                    signal=wlan.wifi_signal(),
                    gateway=wlan.get_gateway(),
                )
            except Exception as e:
                print('ERROR: failed to process wlan route', e)
            mqtt.put_obj('device/%(id)s/wlan', data)
            try:
                await asyncio.wait_for(event.wait(), timeout=interval_refresh)
            except asyncio.TimeoutError:
                pass
            else:
                event.clear()

    device.add_config('wlan_config.json')
    loop.create_task(run())

    @app.get('/wlan')
    @auth.with_auth
    def handle_get_wlan(_request: Request):
        return data

    @app.put('/wlan')
    @auth.with_auth
    def handle_put_wlan(request: Request):
        ssid = util.get_body_str(request.json, 'ssid')
        password = util.get_body_str(request.json, 'password')

        result = wlan.connect(ssid, password)
        if result is not True:
            return result, 400

    @app.delete('/wlan')
    @auth.with_auth
    def handle_delete_wlan(_request: Request):
        wlan.reset()
