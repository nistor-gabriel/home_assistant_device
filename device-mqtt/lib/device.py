from config import Config, ConfigEntry
from mqtt_repo import MQTTRepo
from wlan import Wlan
import json
import util
import gc

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

    def __init__(self, config: Config, mqtt: MQTTRepo, wlan: Wlan, loop: asyncio.AbstractEventLoop, name: ConfigEntry,
                 api_type: str, version: str = '1.0'):
        self._config = config
        self._mqtt = mqtt
        self._wlan = wlan
        self._loop = loop
        self._name = name
        self._api_type = api_type
        self._version = version
        self._configs: typ.Dict[str, typ.Union[
            typ.Callable[[], typ.Generator[typ.Dict[str, str], None, None]],
            None
        ]] = {
            'device_config.json': None,
        }
        self._is_reboot = False
        self._is_reset = False
        self._published: typ.Set[str] = set()
        self._publishing = True

    def setup(self):
        self._loop.create_task(self._run())

    def reset(self):
        self._is_reset = True

    def reboot(self):
        self._is_reboot = True

    def get_name(self):
        return self._name.get()

    def set_name(self, name: str):
        if not util.is_str(name, min_len=3, max_len=50):
            return False
        self._name.set(name)
        self._publishing = True
        self._published.clear()
        return True

    def get_api_type(self):
        return self._api_type

    def get_version(self):
        return self._version

    def add_config(self, file: str,
                   vars_source: typ.Callable[[], typ.Generator[typ.Dict[str, str], None, None]] = None):
        self._configs[file] = vars_source
        return lambda: self._clear_publish(file)

    def _clear_publish(self, file: str):
        file_prefix = file + ':'
        self._published = set(path for path in self._published if not path.startswith(file_prefix))
        self._publishing = True

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

    def _iter_all_configs(self):
        for file in self._configs:
            var_s = self._build_vars()
            template = self._read_template()

            vars_source = self._configs[file]
            if vars_source:
                for vars_extra in vars_source():
                    vars_all = dict(var_s)
                    vars_all.update(vars_extra)
                    for pkg in self._iter_config(file, template, vars_all):
                        yield pkg
            else:
                for pkg in self._iter_config(file, template, var_s):
                    yield pkg

            gc.collect()

    @staticmethod
    def _iter_config(file: str, template: typ.Dict, var_s: typ.Dict[str, str]):
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
            msg_str = json.dumps(msg, separators=(',', ':'))
            topic = topic % var_s
            msg_str = msg_str % var_s
            msg_str = msg_str + ' '
            # we need a whitespace at the end because somme times the last character  is lost in communication.
            # print('DEBUG: publishing message "%s": %s' % (topic, msg_str))
            yield file, topic, msg_str

    async def _run(self):
        while True:

            if self._is_reset:
                self._config.reset()
                machine.reset()
                return

            if self._is_reboot:
                machine.reset()
                return

            if self._publishing and self._mqtt.is_connected():
                # print('DEBUG: publishing the device configurations')
                self._publishing = False
                for (file, topic, msg) in self._iter_all_configs():
                    path = file + ':' + topic
                    if path in self._published:
                        continue
                    if not self._mqtt.put(topic, '', lazy=False):
                        self._publishing = True
                        break

                    await asyncio.sleep(0.5)

                    if not self._mqtt.put(topic, msg, lazy=False):
                        self._publishing = True
                        break
                    # print('DEBUG: published %s from file %s' % (topic, file))
                    self._published.add(path)
                    await asyncio.sleep(0.5)

            await asyncio.sleep(1)
