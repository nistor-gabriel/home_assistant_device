import unittest
import json


class Test(unittest.TestCase):

    # @unittest.SkipTest
    def test(self):
        with open('../thermostat/thermostat_config.json', 'r', encoding='utf-8') as data:
            cnt = data.read()
            topic = cnt % {
                'device_id': 'test'
            }
            print(topic)


if __name__ == '__main__':
    unittest.main()
