from microdot import Microdot, Response
from wlan import Wlan
from auth import Auth
from config import Config
from watchdog import WatchDog
from device import Device
from mqtt_repo import MQTTRepo
from switch import Switch
from route_stats import install_stats
from route_fs import install_fs
from route_mqtt import install_mqtt
from route_api import install_api
from route_wlan import install_wlan
from route_ui import install_ui
from route_switch import install_switches
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
name = config.create('name', 'Sprinkler 2')
wlan = Wlan(config=config, name=name, loop=loop)
auth = Auth(config=config, wlan=wlan)
mqtt = MQTTRepo(config=config, wlan=wlan, loop=loop)
device = Device(config=config, mqtt=mqtt, wlan=wlan, loop=loop, name=name, api_type='sprinkler', version='3.0')
watchdog = WatchDog(loop=loop)

switches = [
    Switch(pin=28, id_=1, config=config, loop=loop),
    Switch(pin=27, id_=2, config=config, loop=loop)
]

wlan.add_connect_listener(on_connect)
wlan.add_disconnect_listener(on_disconnect)

config.setup()
auth.setup()
mqtt.setup()
wlan.setup()
device.setup()
watchdog.setup()
[switch.setup() for switch in switches]

install_mqtt(app=app, auth=auth, mqtt=mqtt)
install_api(app=app, auth=auth, device=device)
install_stats(app=app, auth=auth, mqtt=mqtt, device=device, loop=loop)
install_wlan(app=app, auth=auth, wlan=wlan, mqtt=mqtt, device=device, loop=loop)
install_switches(app=app, auth=auth, mqtt=mqtt, device=device, loop=loop, switches=switches)
install_fs(app=app, auth=auth)
install_ui(app=app, auth=auth)


def run():
    try:
        loop.run_forever()
    except BaseException as e:
        log.error('main loop stopped with error', e)
        loop.stop()
