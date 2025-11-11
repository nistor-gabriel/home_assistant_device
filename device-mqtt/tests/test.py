import unittest
import json


class Test(unittest.TestCase):

    # @unittest.SkipTest
    def test(self):
        publish_files = set()
        aa = {'a': 'aa', 'b': 'bb'}
        publish_files.update(aa.keys())
        print(publish_files)


if __name__ == '__main__':
    unittest.main()
