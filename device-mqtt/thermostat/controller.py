from config import Config
from temperature_sensor import TemperatureSensor
from heating import Heating
from temperature import Temperature

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio


class Controller:

    def __init__(self, config: Config, temperature: Temperature, heating: Heating, temp_sensor: TemperatureSensor,
                 is_disabled: bool):
        self.config = config
        self.heating = heating
        self.temperature = temperature
        self._temp_sensor: TemperatureSensor = temp_sensor
        self._is_disabled = config.create('is_thermostat_disabled', is_disabled)
        self._devices: list | None = None
        self._temp: float | None = None
        self._is_on = False

        self._event_manager: EventManager | None = None

    def bind_event_manager(self, event_manager: EventManager):
        self._event_manager = event_manager

    def get_temp(self):
        return self._temp

    def is_disabled(self):
        return self._is_disabled.get()

    def is_on(self):
        return self._is_on

    def set_disabled(self, state: bool):
        self._is_disabled.set(state)
        if state and self._is_on:
            self._is_on = False
            self.heating.off()
        else:
            self._dispatch()

    def _dispatch(self):
        if self._event_manager:
            self._event_manager.dispatch({'type': 'thermostat'})

    async def run(self):
        while True:
            temp = self._temp_sensor.read_temperature()
            has_changed = self._temp != temp
            self._temp = temp
            if self._temp is None:
                if self._is_on:
                    self._is_on = False
                    self.heating.off()
                    self._dispatch()
                    has_changed = False
                    print('thermostat off, no temp')
                if has_changed:
                    self._dispatch()
                await asyncio.sleep(5)
                continue

            if not self._is_disabled.get():
                if self._is_on:
                    if self._temp > self.temperature.get_max_temp():
                        self._is_on = False
                        self.heating.off()
                        self._dispatch()
                        has_changed = False
                        print('thermostat off')
                elif self._temp < self.temperature.get_min_temp():
                    self._is_on = True
                    self.heating.on_continuously()
                    self._dispatch()
                    has_changed = False
                    print('thermostat on')

            if has_changed:
                self._dispatch()

            await asyncio.sleep(30)
