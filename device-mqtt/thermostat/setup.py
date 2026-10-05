import log
from microdot import Microdot, Response
from wlan import Wlan
from auth import Auth
from config import Config
from heating import Heating
from device import Device
from mqtt_repo import MQTTRepo
from controller import Controller
from temperature_sensor import TemperatureSensor
from auto_schedule import AutoSchedule
# from watchdog import WatchDog
from route_api import install_api
from route_wlan import install_wlan
from route_fs import install_fs
from route_mqtt import install_mqtt
from route_stats import install_stats
from route_thermostat import install_thermostat
from route_ui import install_ui
from route_log import install_log
import util

try:
    import typ
except ImportError:
    typ = None
try:
    import machine
except ImportError:
    machine = typ.Any
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio

loop = asyncio.get_event_loop()

app = Microdot()
Response.default_content_type = 'application/json; charset=utf-8'

util.set_timezone(
    name='Europe/Bucharest',
    std_offset=2 * 3600,  # UTC+2
    dst_offset=3 * 3600,  # UTC+3
    dst_start=lambda y: (util.last_sunday(y, 3), 3, 0),   # Last Sunday of March, 03:00
    dst_end=lambda y: (util.last_sunday(y, 10), 4, 0),    # Last Sunday of October, 04:00
)

__starting: bool = False


async def start_server():
    global __starting
    if __starting:
        return
    __starting = True
    count = 1
    while __starting:
        try:
            await app.start_server(port=80, debug=False)
            __starting = False
        except OSError as e:
            log.error('start server failed %s:' % (count,), e)
            if count >= 10:     # Will reboot if failed to start the server 10 times
                device.reboot()
            else:
                count += 1
                await asyncio.sleep(3)


def on_connect(has_internet: bool):
    if has_internet:
        loop.create_task(util.synchronize_time())
    loop.create_task(start_server())
    log.info('server started')


def on_disconnect():
    global __starting
    __starting = False
    if app.server:
        app.shutdown()
        log.info('server stopped')


config = Config(filename='config.json', loop=loop)
logger = log.logger = log.LoggerFile(config=config, log_to_file=True, max_file_size=5 * 4096)
name = config.create('name', 'Thermostat')
wlan = Wlan(config=config, name=name, loop=loop)
auth = Auth(config=config, wlan=wlan)
mqtt = MQTTRepo(config=config, wlan=wlan, loop=loop)
device = Device(config=config, mqtt=mqtt, wlan=wlan, loop=loop, name=name, api_type='thermostat', version='3.0')
# watchdog = WatchDog(loop=loop)

# The temperature sensor, found on PIN 22
temp_sensor = TemperatureSensor(sensor_pin=22)
auto_schedule = AutoSchedule(loop=loop, filename='temperature.json',
                             # The default temperature.
                             temperature=18)
heating = Heating(config=config, loop=loop, pin_pump=27, pin_heat=26,
                  # By default, it will 4 days the pump cycle, the time is in seconds.
                  pump_cycle_period=60 * 60 * 24 * 4,
                  # By default, it will 10 seconds the pump/heating offset, the time is in seconds.
                  offset_period=10,
                  # The pump running time for inactivity cycle, it wil be 7 minutes, the time is in seconds.
                  pump_period=7 * 60)

controller = Controller(config=config, heating=heating, loop=loop, temp_sensor=temp_sensor,
                        auto_schedule=auto_schedule,
                        # The default away temperature.
                        temp_away=10,
                        # The default manual temperature.
                        temp_manual=18,
                        # The default delta temperature start.
                        delta_start=0.5,
                        # The default delta temperature end.
                        delta_end=0.5)

wlan.add_connect_listener(on_connect)
wlan.add_disconnect_listener(on_disconnect)

config.setup()
auth.setup()
mqtt.setup()
wlan.setup()
device.setup()
auto_schedule.setup()
heating.setup()
controller.setup()
# watchdog.setup()

install_log(app=app, auth=auth, logger=logger)
install_mqtt(app=app, auth=auth, mqtt=mqtt)
install_api(app=app, auth=auth, device=device)
install_stats(app=app, auth=auth, mqtt=mqtt, device=device, loop=loop)
install_wlan(app=app, auth=auth, wlan=wlan, mqtt=mqtt, device=device, loop=loop)
install_fs(app=app, auth=auth)
install_stats(app=app, auth=auth, mqtt=mqtt, device=device, loop=loop)
install_thermostat(app=app, auth=auth, heating=heating, controller=controller, auto_schedule=auto_schedule,
                   mqtt=mqtt, device=device)
install_ui(app=app, auth=auth)


def run():
    try:
        loop.run_forever()
    except BaseException as e:
        log.error('main loop stopped with', e)
        loop.stop()
