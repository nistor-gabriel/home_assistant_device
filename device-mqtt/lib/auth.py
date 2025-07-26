from microdot import Request, Response
from config import Config
from wlan import Wlan
import binascii
import util

AUTH_PREFIX = 'Basic '


class Auth:

    def __init__(self, config: Config, wlan: Wlan):
        self._user_password = config.create('user_password', 'user')
        self._wlan = wlan
        self.auth_user = None

    def setup(self):
        self.auth_user = self._process_user_auth()

    def set_user_password(self, password: str):
        if not util.is_str(password, min_len=3, max_len=30):
            return False
        self._user_password.set(password)
        self.auth_user = self._process_user_auth()
        return True

    def with_auth(self, fn):
        def wrapper_user_auth(request: Request, *args, **kwargs):
            auth: str = request.headers.get('authorization')
            if self._wlan.is_wifi_available() and auth != self.auth_user:
                return Response(headers={
                    'www-authenticate': 'Basic realm = "Login Required"',
                }, status_code=401)
            return fn(request, *args, **kwargs)
        return wrapper_user_auth

    def _process_user_auth(self):
        return AUTH_PREFIX + binascii.b2a_base64('user:' + self._user_password.get()).rstrip().decode('utf-8')
