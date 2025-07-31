try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio
try:
    import ubinascii
except ImportError:
    # noinspection SpellCheckingInspection
    import binascii as ubinascii
try:
    import machine
except ImportError:
    # noinspection SpellCheckingInspection
    machine = typ.Any
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio

import json
import util
from config import Config
from umqttsimple import MQTTClient
from wlan import Wlan


class MQTTRepo:

    def __init__(self, config: Config, wlan: Wlan, loop: asyncio.AbstractEventLoop, interval_mqtt_check: float = 5,
                 interval_mqtt_reconnect: float = 30, interval_mqtt_keepalive: float = 60):
        self._wlan = wlan
        self._loop = loop
        self._data: typ.Dict[str, str] = {}
        self._server = config.create('mqtt_server', '')
        self._port = config.create('mqtt_port', 0)
        self._user = config.create('mqtt_user', '')
        self._pass = config.create('mqtt_pass', '')
        self._ssl = config.create('mqtt_ssl', False)
        self._client_id = config.create('mqtt_client_id', '')
        self._default_client_id = ubinascii.hexlify(machine.unique_id()).decode()
        self._client: typ.Union[None, MQTTClient] = None
        self._is_connecting: bool = False
        self._interval_mqtt_check = interval_mqtt_check
        self._interval_mqtt_reconnect = interval_mqtt_reconnect
        self._interval_mqtt_keepalive = interval_mqtt_keepalive
        self.on_connected = util.Listeners()

    def get_server(self):
        return self._server.get()

    def get_port(self):
        return self._port.get()

    def get_ssl(self):
        return self._ssl.get()

    def get_client_id(self):
        return self._client_id.get()

    def get_default_client_id(self):
        return self._default_client_id

    def get_active_client_id(self):
        active_id = self._client_id.get()
        if not active_id:
            active_id = self._default_client_id
        return active_id

    def is_connected(self):
        return bool(self._client)

    def set_mqtt_connection(self, server: str, port: int, ssl: bool, user: str, password: str, client_id: str):
        if not util.is_ip(server):
            return {'server': 'invalid'}
        if not util.is_int(port, min_value=0):
            return {'port': 'invalid'}
        if not util.is_bool(ssl):
            return {'ssl': 'invalid'}
        if not util.is_str(user, max_len=50):
            return {'user': 'invalid'}
        if not util.is_str(password, max_len=50):
            return {'password': 'invalid'}
        if not util.is_str(client_id, max_len=23):
            return {'clientId': 'invalid'}
        self._client_id.set(client_id)
        self._server.set(server)
        self._port.set(port)
        self._ssl.set(ssl)
        self._user.set(user)
        self._pass.set(password)
        self._disconnect()

    def setup(self):
        def on_connect(has_internet: bool):
            if has_internet:
                self._loop.create_task(self._start())

        def on_disconnect():
            self._shutdown()

        self._wlan.on_connect.add(on_connect)
        self._wlan.on_disconnect.add(on_disconnect)

    async def _start(self):
        if self._is_connecting:
            return
        self._is_connecting = True

        def sub_cb(topic, msg):
            print((topic, msg))

        while self._is_connecting:
            if self._server.get() and not self._client:
                try:
                    client = MQTTClient(self.get_active_client_id().encode(), self._server.get(),
                                        user=self._user.get(), password=self._pass.get(),
                                        port=self._port.get(), ssl=self._ssl.get(),
                                        keepalive=self._interval_mqtt_keepalive)
                    client.set_last_will(
                        'device/%(id)s/status' % {'id': self.get_active_client_id()}, 'offline', True, 1)
                    client.set_callback(sub_cb)
                    client.connect()
                    # client.subscribe('test_receive')
                    self._client = client
                    print('connected to %s MQTT broker' % (self._server.get(),))
                    self._connected()
                except OSError as e:
                    print('ERROR: failed to connect to %s MQTT broker' % (self._server.get(),), e)
                    self._disconnect()
                    await asyncio.sleep(self._interval_mqtt_reconnect)
            if self._client:
                try:
                    self._client.check_msg()
                except OSError as e:
                    if str(e).find('104') >= 0:
                        self._disconnect()
                        print('ERROR: exception occurred on message check:', e)
                await asyncio.sleep(self._interval_mqtt_check)

    def _publish(self, topic: str, msg: str):
        if self._client:
            try:
                self._client.publish(topic, msg, True, 1)
            except OSError as e:
                print('ERROR: exception occurred on publish:', e)
                self._disconnect()
        else:
            self._data[topic] = msg

    def _connected(self):
        self.put('device/%(id)s/status', 'online')
        for listener in self.on_connected.iter():
            listener()
        for topic in list(self._data.keys()):
            self._publish(topic, self._data[topic])
            del self._data[topic]

    def _disconnect(self):
        if self._client:
            try:
                self._client.disconnect()
            except OSError:
                pass
            self._client = None
            print('disconnected to %s MQTT broker' % (self._server.get(),))

    def _shutdown(self):
        self._is_connecting = False
        self._disconnect()

    def put(self, topic: str, msg: str):
        topic = topic % {'id': self.get_active_client_id()}
        self._publish(topic, msg)

    def put_obj(self, topic: str, obj):
        self.put(topic, json.dumps(obj))
