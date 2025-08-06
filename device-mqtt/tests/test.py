import unittest
import os
import hashlib


class Test(unittest.TestCase):

    # @unittest.SkipTest
    def test(self):
        sha1 = hashlib.sha1()
        with open('/home/nistor-gabriel/personal/work/casa/start-eclipse.sh', 'rb') as f:
            while True:
                data = f.read(1024)
                if not data:
                    break
                sha1.update(data)
        print("MD5: {0}".format(sha1.hexdigest()))


if __name__ == '__main__':
    unittest.main()
