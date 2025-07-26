import sys

sys.modules['machine'] = sys.modules[__name__]

all_pins = {}


def unique_id():
    return b'test-unique-id'


class ConfigEntry:

    def __init__(self, value):
        self._value = value

    def get(self):
        return self._value

    def set(self, value):
        self._value = value


class Config:

    def __init__(self):
        self.config = {}

    def create(self, name, value):
        cfg = ConfigEntry(value)
        self.config[name] = cfg
        return cfg


class Pin:
    OUT = 'out'
    IN = 'in'

    def __init__(self, pin: int, **kwargs):
        all_pins[pin] = self
        self.pin = pin
        self.value = None

    def high(self):
        self.value = 'high'

    def low(self):
        self.value = 'low'
