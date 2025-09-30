from microdot import Microdot, Response
from wlan import Wlan
from auth import Auth
from config import Config
from event import EventManager
from heating import Heating
from stats import Stats
from device import Device
from controller import Controller
from temperature_sensor import TemperatureSensor
from temperature import Temperature
from route_api import install_api
from route_wlan import install_wlan
from route_fs import install_fs
from route_event import install_event
from route_stats import install_stats
from route_thermostat import install_thermostat
import util
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio
try:
    import typ
except ImportError:
    typ = None
try:
    import machine
except ImportError:
    machine = typ.Any

loop = asyncio.get_event_loop()
app = Microdot()
Response.default_content_type = 'application/json; charset=utf-8'

config = Config(filename='config.json')
event_manager = EventManager()


async def on_connect(has_internet: bool):
    if has_internet:
        loop.create_task(util.synchronize_time())
    loop.create_task(app.start_server(port=80, debug=False))
    print('server started')


async def on_disconnect():
    app.shutdown()
    print('server stopped')


name = config.create('name', 'thermostat')
wlan = Wlan(config=config, name=name, on_connect=on_connect, on_disconnect=on_disconnect)
auth = Auth(config=config, wlan=wlan)
device = Device(config=config, auth=auth)
stats = Stats(wlan=wlan)
# The temperature sensor, found on PIN 22
temp_sensor = TemperatureSensor(sensor_pin=22)
temperature = Temperature(config=config, filename='temperature.json',
                          # The default temperature.
                          temperature=18,
                          # The default delta temperature start.
                          delta_start=0.5,
                          # The default delta temperature end.
                          delta_end=0.5)
heating = Heating(config=config, pin_pump=27, pin_heat=26,
                  # The default heating stop period will be 1 hour, the time is in seconds.
                  stop_period=60 * 60,
                  # By default, it will 4 days the pump cycle, the time is in seconds.
                  pump_cycle_period=60 * 60 * 24 * 4,
                  # By default, it will 10 seconds the pump/heating offset, the time is in seconds.
                  offset_period=10,
                  # The pump running time for inactivity cycle, it wil be 7 minutes, the time is in seconds.
                  pump_period=7 * 60)

heating.bind_event_manager(event_manager)

controller = Controller(config=config, heating=heating, temperature=temperature, temp_sensor=temp_sensor,
                        is_disabled=True)
controller.bind_event_manager(event_manager)

install_api(app=app, auth=auth, device=device, name=name, api_type='thermostat', version='2.0')
install_wlan(app=app, auth=auth, wlan=wlan)
install_fs(app=app, auth=auth)
install_stats(app=app, auth=auth, stats=stats)
install_event(app=app, auth=auth, manager=event_manager)
install_thermostat(app=app, auth=auth, controller=controller, heating=heating, temperature=temperature)

config.load()
temperature.load()
auth.setup()


async def run():
    await asyncio.gather(
        wlan.run(),
        config.run(),
        device.run(),
        stats.run(),
        heating.run(),
        controller.run(),
        temperature.run(),
    )

loop.create_task(run())
try:
    loop.run_forever()
except Exception as e:
    print('ERROR: main loop stopped with: ', e)
    loop.stop()
    machine.reset()
