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


class MQTTRepo:

    def __init__(self, config: Config, interval_mqtt_check: float = 5, interval_mqtt_reconnect: float = 30,
                 interval_mqtt_keepalive: float = 60):
        self._data: typ.Dict[str, str] = {}
        self._mqtt_server = config.create('mqtt_server', '')
        self._mqtt_user = config.create('mqtt_user', '')
        self._mqtt_pass = config.create('mqtt_pass', '')
        self._client_id = ubinascii.hexlify(machine.unique_id())
        self._client: typ.Union[None, MQTTClient] = None
        self._is_connecting: bool = False
        self._interval_mqtt_check = interval_mqtt_check
        self._interval_mqtt_reconnect = interval_mqtt_reconnect
        self._interval_mqtt_keepalive = interval_mqtt_keepalive
        self.id = self._client_id.decode()
        self.on_connected = util.Listeners()
        self._vars = {'id': self.id}

    def get_mqtt_server(self):
        return self._mqtt_server.get()

    def is_connected(self):
        return bool(self._client)

    def set_mqtt_connection(self, server: str, user: str, password: str):
        if not util.is_str(server, max_len=50):
            return {'server': 'invalid'}
        if not util.is_str(user, max_len=50):
            return {'user': 'invalid'}
        if not util.is_str(password, max_len=50):
            return {'password': 'invalid'}
        self._mqtt_server.set(server)
        self._mqtt_user.set(user)
        self._mqtt_pass.set(password)
        self._disconnect()

    async def start(self):
        if self._is_connecting:
            return
        self._is_connecting = True

        def sub_cb(topic, msg):
            print((topic, msg))

        while self._is_connecting:
            if self._mqtt_server.get() and not self._client:
                try:
                    client = MQTTClient(self._client_id, self._mqtt_server.get(),
                                        user=self._mqtt_user.get(), password=self._mqtt_pass.get(),
                                        keepalive=self._interval_mqtt_keepalive)
                    client.set_last_will('device/%(id)s/status' % self._vars, 'offline', True, 1)
                    client.set_callback(sub_cb)
                    client.connect()
                    # client.subscribe('test_receive')
                    self._client = client
                    print('connected to %s MQTT broker' % (self._mqtt_server.get(),))
                    self._connected()
                except OSError as e:
                    print('ERROR: failed to connect to %s MQTT broker' % (self._mqtt_server.get(),), e)
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
            print('disconnected to %s MQTT broker' % (self._mqtt_server.get(),))

    def shutdown(self):
        self._is_connecting = False
        self._disconnect()

    def put(self, topic: str, msg: str):
        topic = topic % self._vars
        self._publish(topic, msg)

    def put_obj(self, topic: str, obj):
        self.put(topic, json.dumps(obj))
