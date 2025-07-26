from microdot import Microdot, Response
from wlan import Wlan
from auth import Auth
from config import Config
from device import Device
from mqtt_repo import MQTTRepo
from route_stats import install_stats
from route_fs import install_fs
from route_mqtt import install_mqtt
from route_api import install_api
import util

try:
    import asyncio
except ImportError:
    import uasyncio as asyncio

loop = asyncio.get_event_loop()
app = Microdot()
Response.default_content_type = 'application/json; charset=utf-8'


async def on_connect(has_internet: bool):
    if has_internet:
        loop.create_task(util.synchronize_time())
    loop.create_task(app.start_server(port=80, debug=False))
    loop.create_task(mqtt.start())
    print('server started')


async def on_disconnect():
    app.shutdown()
    mqtt.shutdown()
    print('server stopped')


config = Config(filename='config.json', loop=loop)
name = config.create('name', 'Sprinkler')
wlan = Wlan(config=config, name=name, on_connect=on_connect, on_disconnect=on_disconnect, loop=loop)
auth = Auth(config=config, wlan=wlan)
mqtt = MQTTRepo(config=config)
device = Device(config=config, mqtt=mqtt, wlan=wlan, name=name, api_type='sprinkler', version='3.0')

config.setup()
wlan.setup()
auth.setup()

install_mqtt(app=app, auth=auth, mqtt=mqtt)
install_api(app=app, auth=auth, device=device, loop=loop)
install_stats(app=app, auth=auth, wlan=wlan, mqtt=mqtt, device=device, loop=loop)
install_fs(app=app, auth=auth)


def run():
    try:
        loop.run_forever()
    except Exception as e:
        print('ERROR: main loop stopped with: ', e)
        loop.stop()
