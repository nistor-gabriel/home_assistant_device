try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio
try:
    import machine
    import ubinascii
except ImportError:
    # noinspection SpellCheckingInspection
    machine = ubinascii = typ.Any
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio

from config import Config
from umqttsimple import MQTTClient


class Context:

    def __init__(self, config: Config, interval_mqtt_check: float):
        self.objects: typ.Dict[str, LiveObj] = {}
        self.collections: typ.Dict[str, typ.List[LiveObj]] = {}
        self._mqtt_server = config.create('mqtt_server', '')
        self._mqtt_user = config.create('mqtt_user', '')
        self._mqtt_pass = config.create('mqtt_pass', '')
        self.client_id = ubinascii.hexlify(machine.unique_id())
        self._client: typ.Union[None, MQTTClient] = None
        self._is_connecting: bool = False
        self._interval_mqtt_check: float = interval_mqtt_check

    async def start_mqtt(self):
        def sub_cb(topic, msg):
            print((topic, msg))

        self._is_connecting = True
        while self._is_connecting:
            if self._mqtt_server.get() and not self._client:
                try:
                    client = MQTTClient(self.client_id, self._mqtt_server.get(),
                                        user=self._mqtt_user.get(), password=self._mqtt_pass.get(),
                                        keepalive=60)
                    client.set_callback(sub_cb)
                    client.connect()
                    client.subscribe('test_receive')
                    self._client = client
                    print('connected to %s MQTT broker' % (self._mqtt_server.get(),))
                except OSError as e:
                    self._disconnect()
                    print('failed to connect to %s MQTT broker' % (self._mqtt_server.get(),), e)
                    await asyncio.sleep(10)
            if self._client:
                try:
                    self._client.check_msg()
                except OSError as e:
                    if str(e).find('104') >= 0:
                        self._disconnect()
                        print('exception occurred on message check:', e)
                await asyncio.sleep(self._interval_mqtt_check)

    def shutdown(self):
        self._is_connecting = False
        self._disconnect()

    def _disconnect(self):
        if self._client:
            try:
                self._client.disconnect()
            except OSError:
                pass
            self._client = None
            print('disconnected to %s MQTT broker' % (self._mqtt_server.get(),))

    '''
    '''
    def publish(self, topic: str, msg: str, retain: bool = False, qos: typ.Union[0, 1, 2] = 0):
        """
        Publish to MQTT

        :param topic:
        :param msg:
        :param retain:
            A retained message is a normal MQTT message with the retained flag set to true. The broker stores the last
            retained message and the corresponding QoS for that topic. Each client that subscribes to a topic pattern
            that matches the topic of the retained message receives the retained message immediately after they
            subscribe. The broker stores only one retained message per topic
        :param qos:
            QoS 0 (At Most Once):
            The message is sent once, and no acknowledgement is expected. It's a "fire and forget" approach, meaning
            the sender doesn't retry if delivery fails, and the receiver doesn't acknowledge receipt.
            QoS 1 (At Least Once):
            The message is sent at least once, and the sender retries until it receives an acknowledgement from the
            receiver. This ensures delivery but potentially allows for duplicate messages.
            QoS 2 (Exactly Once):
            The message is delivered exactly once, using a two-level handshake between sender and receiver to ensure
            no duplicates. This is the most reliable but also the most complex and resource-intensive method.
       :return:
        """
        if self._client:
            try:
                self._client.publish(topic, msg, retain, qos)
            except OSError as e:
                self._disconnect()
                print('exception occurred on publish:', e)


class LiveObj:

    def __init__(self, ctx: Context, mount_on: str = ''):
        self.mount_on = mount_on
        self._ctx = ctx
        self._props: typ.Dict[str, typ.Union[int, str, float]] = {}

    def put(self, name: str, value: typ.Union[int, str, float]):
        try:
            if self._props[name] == value:
                return self
        except KeyError:
            pass
        self._props[name] = value
        self._ctx.publish('test', str(value), True, 1)
        return self

    def use_item(self, mount_on: str, id_: typ.Union[int, str]):
        path_coll = self.mount_on + mount_on
        path_full = path_coll + '/' + str(id_)
        item = self._ctx.objects.get(path_full)
        if not item:
            item = LiveObj(ctx=self._ctx, mount_on=path_full)
            item.put('id', id_)
            coll = self._ctx.collections.get(path_coll)
            if not coll:
                coll = []
                self._ctx.collections[path_coll] = coll
            coll.append(item)
            self._ctx.objects[path_full] = item

        return item

    def use_obj(self, mount_on: str):
        path_full = self.mount_on + mount_on
        item = self._ctx.objects.get(path_full)
        if not item:
            item = LiveObj(ctx=self._ctx, mount_on=path_full)
            self._ctx.objects[path_full] = item
        return item

    def clone_props(self):
        return dict(self._props)
