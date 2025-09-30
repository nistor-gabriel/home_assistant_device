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
    # noinspection PyUnresolvedReferences
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
        self._configs: typ.Dict[str, typ.Union[
            typ.Callable[[], typ.Generator[typ.Dict[str, str], None, None]],
            None
        ]] = {
            'device_config.json': None,
        }
        self._has_published = False

        def publish_device_config():
            if not self._has_published:
                self._has_published = True
                self.publish_device_config()

        mqtt.add_connected_listener(publish_device_config)

    async def reset(self):
        await asyncio.sleep(0.3)
        self._config.reset()
        machine.reset()

    @staticmethod
    async def reboot():
        await asyncio.sleep(0.3)
        machine.reset()

    def get_name(self):
        return self._name.get()

    def set_name(self, name: str):
        if not util.is_str(name, min_len=3, max_len=50):
            return False
        self._name.set(name)
        self.publish_device_config()
        return True

    def get_api_type(self):
        return self._api_type

    def get_version(self):
        return self._version

    def add_config(self, file: str,
                   vars_source: typ.Callable[[], typ.Generator[typ.Dict[str, str], None, None]] = None):
        self._configs[file] = vars_source

        return lambda: self._publish_config(file)

    def publish_device_config(self):
        var_s = self._build_vars()
        template = self._read_template()

        for file in self._configs:
            self._publish_config(file, var_s=var_s, template=template)

    def _build_vars(self):
        ip = self._wlan.get_ip()
        ip = ip if ip else '?'
        return {
            'device_name': self._name.get(),
            'device_api_type': self._api_type,
            'device_version': self._version,
            'device_id': self._mqtt.get_active_client_id(),
            'device_ip': ip,
        }

    @staticmethod
    def _read_template() -> typ.Dict:
        with open('device_template.json') as json_file:
            return json.load(json_file)

    def _publish_config(self, file: str, var_s: typ.Union[typ.Dict, None] = None,
                        template: typ.Union[typ.Dict, None] = None):
        if not var_s:
            var_s = self._build_vars()
        if not template:
            template = self._read_template()

        vars_source = self._configs[file]
        if vars_source:
            for vars_extra in vars_source():
                vars_all = dict(var_s)
                vars_all.update(vars_extra)
                self._put_config(file, template, vars_all)
        else:
            self._put_config(file, template, var_s)

    def _put_config(self, file: str, template: typ.Dict, var_s: typ.Dict[str, str]):
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
            topic = topic % var_s
            msg_str = msg_str % var_s
            self._mqtt.put(topic, '', lazy=False)
            self._mqtt.put(topic, msg_str, lazy=False)
