from config import Config, ConfigEntry
from mqtt_repo import MQTTRepo
from wlan import Wlan
import json
import util
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
except ImportError:
    machine = typ.Any


class Device:

    def __init__(self, config: Config, mqtt: MQTTRepo, wlan: Wlan, name: ConfigEntry,
                 api_type: str, version: str = '1.0'):
        self._config = config
        self._mqtt = mqtt
        self._wlan = wlan
        self._name = name
        self._api_type = api_type
        self._version = version
        self._configs: [str] = []
        self._vars = {
            'name': self._name.get(),
            'api_type': self._api_type,
            'version': self._version,
            'id': self._mqtt.id,
        }

        def publish_device_config():
            self.publish_device_config()
        mqtt.on_connected.add(publish_device_config)

    async def reset(self):
        await asyncio.sleep(1)
        self._config.reset()
        machine.reset()

    @staticmethod
    async def reboot():
        await asyncio.sleep(1)
        machine.reset()

    def get_name(self):
        return self._name.get()

    def set_name(self, name: str):
        if not util.is_str(name, min_len=3, max_len=50):
            return False
        self._name.set(name)
        self._vars['name'] = name
        self.publish_device_config()
        return True

    def get_api_type(self):
        return self._api_type

    def get_version(self):
        return self._version

    def add_config(self, config_file: str):
        self._configs.append(config_file)

    def publish_device_config(self):
        ip = self._wlan.get_ip()
        ip = ip if ip else '?'
        self._vars['ip'] = ip

        with open('device_template.json') as json_file:
            template = json.load(json_file)

        for file in self._configs:
            self._put_config(file, template)

    def _put_config(self, file: str, template: typ.Dict[str, typ.Any] | None = None):
        with open(file) as json_file:
            data = json.load(json_file)
        tpl = data.get('@template')
        tpl = {} if not tpl else tpl
        if template:
            tpl.update(template)

        for topic in data:
            if topic.startswith('@'):
                continue
            msg = dict(tpl)
            msg.update(data[topic])
            msg_str = json.dumps(msg)
            topic = topic % self._vars
            msg_str = msg_str % self._vars
            self._mqtt.put(topic, msg_str)
