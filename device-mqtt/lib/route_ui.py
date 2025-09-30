from auth import Auth
from microdot import Microdot, Request, send_file
try:
    import uos as os
except ImportError:
    import os
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
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


def install_ui(app: Microdot, auth: Auth, folder: str = '/web-ui/'):

    @app.get('/<re:.*:path>')
    @auth.with_auth
    def handle_get_api(_request: Request, path: str):
        if not path:
            path = 'index.html'
        path = folder + path + '.gz'
        try:
            st = os.stat(path)
        except OSError:
            return 'Not Found', 404
        if st[0] & 0x4000:
            return 'Not Found', 404
        return send_file(path, compressed=True, max_age=31536000)
