import unittest
import json

import math


class Test(unittest.TestCase):

    @staticmethod
    def _calc_abs_humidity(temp, hum):
        return math.ceil(216.7 * (hum / 100.0) * 6.112 * math.exp((17.67 * temp) / (temp + 243.5)))

    # @unittest.SkipTest
    def test(self):
        print(self._calc_abs_humidity(16.3, 68.5))
        print(self._calc_abs_humidity(16.3, 68.5))


if __name__ == '__main__':
    unittest.main()
