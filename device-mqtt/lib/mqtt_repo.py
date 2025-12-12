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
import log
from config import Config
from umqttsimple import MQTTClient
from wlan import Wlan


class MQTTRepo:

    def __init__(self, config: Config, wlan: Wlan, loop: asyncio.AbstractEventLoop, interval_mqtt_check: float = 0.1,
                 interval_mqtt_reconnect: float = 5, interval_mqtt_keepalive: float = 60):
        self._wlan = wlan
        self._loop = loop
        self._pending: typ.Union[None, typ.Dict[str, (str, bool)]] = None
        self._lazy: typ.Dict[str, str] = {}
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
        self._subscriptions: typ.Dict[str, typ.List[typ.Callable[[str, str], None]]] = {}
        self._connected_processed = False

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
        self._loop.create_task(self._run())

    async def _run(self):
        def sub_cb(topic, msg):
            topic_str = topic.decode()
            msg_str = msg.decode()
            # print('DEBUG: received for topic %s the message %s' % (topic_str, msg_str))
            cbs = self._subscriptions.get(topic_str)
            if cbs:
                for cb in cbs:
                    cb(topic_str, msg_str)

        # last_ping = util.uptime()
        count = 0
        while True:
            if self._wlan.wlan and self._wlan.wlan.isconnected():
                if not self._client and self._server.get():
                    try:
                        client = MQTTClient(self.get_active_client_id().encode(), self._server.get(),
                                            user=self._user.get(), password=self._pass.get(),
                                            port=self._port.get(), ssl=self._ssl.get(),
                                            keepalive=self._interval_mqtt_keepalive)
                        client.set_last_will(
                            'device/%(id)s/status' % {'id': self.get_active_client_id()}, 'offline', True)
                        client.set_callback(sub_cb)
                        client.connect(clean_session=True)
                        self._client = client
                        # print('DEBUG: processing subscriptions')
                        self.put('device/%(id)s/status', 'online')
                        for topic_sub in self._subscriptions:
                            self._subscribe(topic_sub)
                        log.info('connected to %s MQTT broker' % (self._server.get(),))
                    except Exception as e:
                        log.error('failed to connect to %s MQTT broker' % (self._server.get(),), e)
                        self._disconnect()
                        await asyncio.sleep(self._interval_mqtt_reconnect)

            # if self._client:
            #     if util.uptime() - last_ping > self._interval_mqtt_keepalive / 2:
            #         try:
            #             self._client.ping()
            #             last_ping = util.uptime()
            #         except OSError as e:
            #             print('ERROR: exception occurred on ping:', e)
            #             # noinspection PyUnresolvedReferences
            #             sys.print_exception(e)
            #             self._disconnect()

            if self._client:
                try:
                    self._client.check_msg()
                except OSError as e:
                    log.error('exception occurred on message check:', e)
                    self._disconnect()

            if count > 5 and self._client and self._pending is not None:
                count = 0  # We push pending message every 10 msg checks
                try:
                    topic_pending, (msg_pending, lazy_pending) = self._pending.popitem()
                    self.put(topic_pending, msg_pending, lazy_pending)
                    # print('DEBUG: put pending %s' % (topic_pending,))
                except KeyError:
                    self._pending = None

            count += 1
            await asyncio.sleep(self._interval_mqtt_check)

    def _publish(self, topic: str, msg: str, lazy: bool):
        if self._client:
            if lazy:
                msg_lazy = self._lazy.get(topic, None)
                if msg_lazy is not None and msg_lazy == msg:
                    return True
            try:
                self._client.publish(topic, msg, True)
                if lazy:
                    self._lazy[topic] = msg
                return True
            except Exception as e:
                log.error('exception occurred on publish "%s": "%s"' % (topic, msg), e)
                self._disconnect()

        self._pending = self._pending if self._pending else {}
        self._pending[topic] = (msg, lazy)
        return False

    def _subscribe(self, topic: str):
        if self._client:
            try:
                self._client.subscribe(topic)
            except Exception as e:
                log.error('exception occurred on subscribe "%s"' % (topic,), e)
                self._disconnect()

    def _disconnect(self):
        self._connected_processed = False
        self._lazy.clear()
        if self._client:
            try:
                self._client.disconnect()
            except OSError:
                pass
            self._client = None
            log.info('disconnected from %s MQTT broker' % (self._server.get(),))

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
        return self._publish(topic, msg, lazy)

    def put_obj(self, topic: str, obj, lazy: bool = True):
        return self.put(topic, json.dumps(obj, separators=(',', ':')), lazy)
