import unittest
from support import Config
from mqtt_repo import MQTTRepo
from pathlib import Path


class MQTTRepoTest(unittest.TestCase):

    # @unittest.SkipTest
    def test(self):
        config = Config()
        mqtt = MQTTRepo(config=config)
        file = Path(__file__).parent.joinpath('./stats_config.json').resolve()
        mqtt.put_batch(str(file))

        self.assertEqual(mqtt._data['homeassistant/sensor/746573742d756e697175652d6964/wifiSignal/config'],
                         '{"state_topic": "device/746573742d756e697175652d6964/stats", "entity_category": ' +
                         '"diagnostic", "availability_topic": "device/746573742d756e697175652d6964/status", ' +
                         '"payload_available": "online", "payload_not_available": "offline", "device": ' +
                         '{"identifiers": ["746573742d756e697175652d6964"]}, "name": "Wifi Signal", ' +
                         '"unit_of_measurement": "%", "value_template": "{{ value_json.wifiSignal }}", "unique_id": ' +
                         '"746573742d756e697175652d6964-wifiSignal", "icon": "mdi:wifi-strength-2"}')
        self.assertEqual(mqtt._data['homeassistant/sensor/746573742d756e697175652d6964/memoryFree/config'],
                         '{"state_topic": "device/746573742d756e697175652d6964/stats", "entity_category": ' +
                         '"diagnostic", "availability_topic": "device/746573742d756e697175652d6964/status", ' +
                         '"payload_available": "online", "payload_not_available": "offline", "device": ' +
                         '{"identifiers": ["746573742d756e697175652d6964"]}, "name": "Free Memory", ' +
                         '"unit_of_measurement": "Kb", "value_template": "{{ (value_json.memoryFree | float / 1024) ' +
                         '| round(2) }}", "unique_id": "746573742d756e697175652d6964-memoryFree", ' +
                         '"icon": "mdi:memory"}')


if __name__ == '__main__':
    unittest.main()
