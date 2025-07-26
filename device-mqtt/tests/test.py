import unittest
import re
import util


class Test(unittest.TestCase):

    # @unittest.SkipTest
    def test(self):
        print('sadasd %(id)s asas' % {'id': '%(id)s'})


if __name__ == '__main__':
    unittest.main()
