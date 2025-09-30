try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
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

import json
import util
from config import Config
from umqttsimple import MQTTClient
from wlan import Wlan


class DataEntry:

    def __init__(self, msg: str, lazy: bool):
        self.msg = msg
        self.lazy = lazy


class MQTTRepo:

    def __init__(self, config: Config, wlan: Wlan, loop: asyncio.AbstractEventLoop, interval_mqtt_check: float = 0.5,
                 interval_mqtt_reconnect: float = 30, interval_mqtt_keepalive: float = 60):
        self._wlan = wlan
        self._loop = loop
        self._data: typ.Dict[str, DataEntry] = {}
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
        self._connected_listeners = util.Listeners()
        self._subscriptions: typ.Dict[str, typ.List[typ.Callable[[str, str], None]]] = {}

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

    def add_connected_listener(self, listener: typ.Callable[[], None]):
        return self._connected_listeners.add(listener)

    def setup(self):
        def on_connect(has_internet: bool):
            if has_internet:
                self._loop.create_task(self._start())

        def on_disconnect():
            self._shutdown()

        self._wlan.add_connect_listener(on_connect)
        self._wlan.add_disconnect_listener(on_disconnect)

    async def _start(self):
        if self._is_connecting:
            return
        self._is_connecting = True

        def sub_cb(topic, msg):
            topic_str = topic.decode()
            msg_str = msg.decode()
            # print('DEBUG: received for topic', topic_str, 'the message', msg_str)
            cbs = self._subscriptions.get(topic_str)
            if cbs:
                for cb in cbs:
                    cb(topic_str, msg_str)

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
                    self._client = client
                    print('connected to %s MQTT broker' % (self._server.get(),))
                    self._connected()
                except Exception as e:
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
            else:
                await asyncio.sleep(self._interval_mqtt_reconnect)

    def _publish(self, topic: str, msg: str, lazy: bool):
        if self._client:
            if lazy:
                data = self._data.get(topic)
                if data and data.msg == msg:
                    return
            try:
                self._client.publish(topic, msg, True, 1)
            except Exception as e:
                print('ERROR: exception occurred on publish:', e)
                self._disconnect()

        if not self._client or lazy:
            self._data[topic] = DataEntry(msg, lazy)

    def _subscribe(self, topic: str):
        if self._client:
            try:
                self._client.subscribe(topic, 1)
            except Exception as e:
                print('ERROR: exception occurred on subscribe:', e)
                self._disconnect()

    def _connected(self):
        self.put('device/%(id)s/status', 'online')
        self._connected_listeners.notify()
        for topic in self._subscriptions:
            self._subscribe(topic)
        for topic in list(self._data.keys()):
            data = self._data[topic]
            self._publish(topic, data.msg, False)
            if not data.lazy:
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

    def subscribe(self, topic: str, cb: typ.Callable[[str, str], None]):
        topic = topic % {'id': self.get_active_client_id()}
        cbs = self._subscriptions.get(topic)
        if not cbs:
            cbs = []
            self._subscriptions[topic] = cbs
        cbs.append(cb)
        self._subscribe(topic)
        # print('DEBUG: subscribed to topic', topic, 'with call back', cb)

    def put(self, topic: str, msg: str, lazy: bool = True):
        topic = topic % {'id': self.get_active_client_id()}
        self._publish(topic, msg, lazy)

    def put_obj(self, topic: str, obj, lazy: bool = True):
        self.put(topic, json.dumps(obj, separators=(',', ':')), lazy)
