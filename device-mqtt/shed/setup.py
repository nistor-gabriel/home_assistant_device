from microdot import Microdot, Response
from wlan import Wlan
from auth import Auth
from config import Config
# from watchdog import WatchDog
from device import Device
from mqtt_repo import MQTTRepo
from switch import Switch
from controller import Controller
from route_stats import install_stats
from route_fs import install_fs
from route_mqtt import install_mqtt
from trigger_button_toggle import TriggerButtonToggle
from route_api import install_api
from route_wlan import install_wlan
from route_ui import install_ui
from route_switch import install_switches
from route_log import install_log
from route_controller import install_controller
import util
import log

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
    while __starting:
        try:
            await app.start_server(port=80, debug=False)
            __starting = False
        except OSError as e:
            log.error('start server', e)


def on_connect(has_internet: bool):
    if has_internet:
        loop.create_task(util.synchronize_time())
    loop.create_task(start_server())
    log.info('server started')


def on_disconnect():
    global __starting
    __starting = False
    app.shutdown()
    log.info('server stopped')


config = Config(filename='config.json', loop=loop)
logger = log.logger = log.LoggerFile(config=config, log_to_file=True, max_file_size=10 * 4096)

name = config.create('name', 'Shed')
wlan = Wlan(config=config, name=name, loop=loop)
auth = Auth(config=config, wlan=wlan)
mqtt = MQTTRepo(config=config, wlan=wlan, loop=loop)
device = Device(config=config, mqtt=mqtt, wlan=wlan, loop=loop, name=name, api_type='shed', version='1.0')
# watchdog = WatchDog(loop=loop)

triggers = [
    TriggerButtonToggle(pin=16, loop=loop),
    TriggerButtonToggle(pin=17, loop=loop)
]


def name_box1():
    return 'Ventilation ' + controller.get_name_box1()


def name_box2():
    return 'Ventilation ' + controller.get_name_box2()


switches = [
    Switch(pin=21, id_=1, config=config, loop=loop, trigger=triggers[0]),
    Switch(pin=22, id_=2, config=config, loop=loop, trigger=triggers[1]),
    Switch(pin=26, id_=3, config=config, loop=loop, name_source=name_box1),
    Switch(pin=27, id_=4, config=config, loop=loop, name_source=name_box2)
]

controller = Controller(config=config, pin_dht22_box1=2, pin_dht22_box2=3, pin_dht22_exterior=4, pin_dht22_power=20,
                        switch_box1=switches[2], switch_box2=switches[3], loop=loop,
                        delta_grams=10.0, box1_disabled=True, box2_disabled=True)

wlan.add_connect_listener(on_connect)
wlan.add_disconnect_listener(on_disconnect)

config.setup()
auth.setup()
mqtt.setup()
wlan.setup()
device.setup()
# watchdog.setup()
[switch.setup() for switch in switches]
[trigger.setup() for trigger in triggers]
controller.setup()

install_log(app=app, auth=auth, logger=logger)
install_mqtt(app=app, auth=auth, mqtt=mqtt)
install_api(app=app, auth=auth, device=device)
install_stats(app=app, auth=auth, mqtt=mqtt, device=device, loop=loop)
install_wlan(app=app, auth=auth, wlan=wlan, mqtt=mqtt, device=device, loop=loop)
install_switches(app=app, auth=auth, mqtt=mqtt, device=device, loop=loop, switches=switches)
install_controller(app=app, auth=auth, controller=controller, mqtt=mqtt, device=device)
install_fs(app=app, auth=auth)
install_ui(app=app, auth=auth)


def run():
    try:
        loop.run_forever()
    except BaseException as e:
        log.error('main loop stopped with error', e)
        loop.stop()
