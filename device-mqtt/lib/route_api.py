from auth import Auth
from device import Device
from microdot import Microdot, Request
import util
try:
    import typ
except ImportError:
    typ = None
try:
    import machine
except ImportError:
    machine = typ.Any
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio


def install_api(app: Microdot, auth: Auth, device: Device, loop: asyncio.AbstractEventLoop):

    @app.get('/api')
    @auth.with_auth
    def handle_get_api(_request: Request):
        return {
            'name': device.get_name(),
            'type': device.get_api_type(),
            'version': device.get_version(),
        }

    @app.put('/api')
    @auth.with_auth
    def handle_put_api(request: Request):
        new_name = util.get_body_str(request.json, 'name')
        if new_name is not None:
            if not util.is_str(new_name, min_len=3, max_len=50) or not device.set_name(new_name):
                return {'name': 'invalid'}, 400

        new_pass = util.get_body_str(request.json, 'password')
        if new_pass is not None:
            if new_pass is util.INVALID or not auth.set_password(new_pass):
                return {'password': 'invalid'}, 400

    @app.post('/api')
    @auth.with_auth
    def handle_post_api(request: Request):
        is_reset = util.get_body_bool(request.json, 'reset')
        if is_reset is not None:
            if is_reset is util.INVALID:
                return {'reset': 'invalid'}, 400
            if is_reset is True:
                loop.create_task(device.reset())

    @app.delete('/api')
    @auth.with_auth
    def handle_delete_api(_request: Request):
        loop.create_task(device.reboot())
