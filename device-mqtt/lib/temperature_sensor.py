# noinspection PyUnresolvedReferences
import ds18x20
# noinspection PyUnresolvedReferences
import onewire
try:
    import typ
except ImportError:
    typ = None
try:
    from machine import Pin
except ImportError:
    Pin = typ.Any


class TemperatureSensor:

    def __init__(self, sensor_pin: int, device_index: int = 0):
        self._temp_sensor: ds18x20.DS18X20 = ds18x20.DS18X20(onewire.OneWire(Pin(sensor_pin)))
        self._device_index = device_index
        self._temp_devices: [] = None

    def read_temperature(self):
        if self._temp_devices is None:
            self._temp_devices = self._temp_sensor.scan()
            # Reading once to get rid of the first 85
            self._read_temp_val()
        else:
            temp = self._read_temp_val()
            if temp is None:
                self._temp_devices = None
            return temp

    def _read_temp_val(self):
        try:
            if len(self._temp_devices):
                self._temp_sensor.convert_temp()  # convert temperature
                return self._temp_sensor.read_temp(self._temp_devices[self._device_index])
        except onewire.OneWireError:
            print('failed to read temperature')
