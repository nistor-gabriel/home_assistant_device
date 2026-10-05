from microdot import Microdot, Request
from controller import Controller
from mqtt_repo import MQTTRepo
from device import Device
from auth import Auth
import util


def install_controller(app: Microdot, auth: Auth, controller: Controller, mqtt: MQTTRepo, device: Device):
    path = 'device/%(id)s'
    path_box1_disabled = path + '/disabledbox1'
    path_box2_disabled = path + '/disabledbox2'

    def cb_box1_disabled(_topic: str, msg: str):
        if msg == 'ON':
            controller.set_box1_disabled(True)
        else:
            controller.set_box1_disabled(False)
        mqtt.put(path_box1_disabled, 'ON' if controller.is_box1_disabled() else 'OFF')

    def cb_box2_disabled(_topic: str, msg: str):
        if msg == 'ON':
            controller.set_box2_disabled(True)
        else:
            controller.set_box2_disabled(False)
        mqtt.put(path_box2_disabled, 'ON' if controller.is_box2_disabled() else 'OFF')

    def listener(event: str):
        if event == 'box1StatsUpdate':
            mqtt.put_obj('device/%(id)s/box1/stats', {
                'temperature': controller.get_temp_box1(),
                'humidity': controller.get_hum_box1(),
                'humidityAbsolute': controller.get_hum_abs_box1(),
            })
        elif event == 'box2StatsUpdate':
            mqtt.put_obj('device/%(id)s/box2/stats', {
                'temperature': controller.get_temp_box2(),
                'humidity': controller.get_hum_box2(),
                'humidityAbsolute': controller.get_hum_abs_box2(),
            })
        elif event == 'exteriorStatsUpdate':
            mqtt.put_obj('device/%(id)s/exterior/stats', {
                'temperature': controller.get_temp_exterior(),
                'humidity': controller.get_hum_exterior(),
                'humidityAbsolute': controller.get_hum_abs_exterior(),
            })

    def config_vars():
        yield {
            'name_box1': controller.get_name_box1(),
            'name_box2': controller.get_name_box2(),
        }

    mqtt.put(path_box1_disabled, 'ON' if controller.is_box1_disabled() else 'OFF')
    mqtt.put(path_box2_disabled, 'ON' if controller.is_box2_disabled() else 'OFF')

    controller.add_listener(listener)
    publish_config = device.add_config('controller_config.json', config_vars)

    mqtt.subscribe(path_box1_disabled + '/set', cb_box1_disabled)
    mqtt.subscribe(path_box2_disabled + '/set', cb_box2_disabled)

    @app.get('/shed')
    @auth.with_auth
    def handle_get_shed(_request: Request):
        return {
            'temperature': controller.get_temp_exterior(),
            'humidity': controller.get_hum_exterior(),
            'humidityAbsolute': controller.get_hum_abs_exterior(),
            'nameBox1': controller.get_name_box1(),
            'temperatureBox1': controller.get_temp_box1(),
            'humidityBox1': controller.get_hum_box1(),
            'humidityAbsoluteBox1': controller.get_hum_abs_box1(),
            'box1On': controller.is_box1_on(),
            'box1Disabled': controller.is_box1_disabled(),
            'nameBox2': controller.get_name_box2(),
            'temperatureBox2': controller.get_temp_box2(),
            'humidityBox2': controller.get_hum_box2(),
            'humidityAbsoluteBox2': controller.get_hum_abs_box2(),
            'box2On': controller.is_box2_on(),
            'box2Disabled': controller.is_box2_disabled(),
            'deltaGrams': controller.get_delta_grams()
        }

    @app.put('/shed')
    @auth.with_auth
    def handle_put_box1(request: Request):
        disabled = util.get_body_bool(request.json, 'box1Disabled')
        if disabled is not None:
            if disabled is util.INVALID:
                return {'box1Disabled': 'invalid'}, 400
            controller.set_box1_disabled(disabled)
            mqtt.put(path_box1_disabled, 'ON' if controller.is_box1_disabled() else 'OFF')
        name = util.get_body_str(request.json, 'nameBox1')
        if name is not None:
            if name is util.INVALID or not controller.set_name_box1(name):
                return {'nameBox1': 'invalid'}, 400
            else:
                publish_config()

        disabled = util.get_body_bool(request.json, 'box2Disabled')
        if disabled is not None:
            if disabled is util.INVALID:
                return {'box2Disabled': 'invalid'}, 400
            controller.set_box2_disabled(disabled)
            mqtt.put(path_box2_disabled, 'ON' if controller.is_box2_disabled() else 'OFF')
        name = util.get_body_str(request.json, 'nameBox2')
        if name is not None:
            if name is util.INVALID or not controller.set_name_box2(name):
                return {'nameBox2': 'invalid'}, 400
            else:
                publish_config()

        delta_grams = util.get_body_float(request.json, 'deltaGrams')
        if delta_grams is not None:
            if delta_grams is util.INVALID or not controller.set_delta_grams(delta_grams):
                return {'deltaGrams': 'invalid'}, 400
