from microdot import Microdot, Request
from controller import Controller
from mqtt_repo import MQTTRepo
from device import Device
from auth import Auth
from schedule import Schedule
import util


def install_controller(app: Microdot, auth: Auth, controller: Controller, schedule: Schedule,
                       mqtt: MQTTRepo, device: Device):
    path = 'device/%(id)s'
    path_disabled = path + '/disabled'

    def listener(event: str):
        if event == 'atticStatsUpdate':
            mqtt.put_obj('device/%(id)s/attic/stats', {
                'temperature': controller.get_temp(),
                'humidity': controller.get_hum(),
                'humidityAbsolute': controller.get_hum_abs(),
            })

    controller.add_listener(listener)
    device.add_config('controller_config.json')

    @app.get('/attic')
    @auth.with_auth
    def handle_get_attic(_request: Request):
        return {
            'temperature': controller.get_temp(),
            'humidity': controller.get_hum(),
            'humidityAbsolute': controller.get_hum_abs(),
            'humidityAbsoluteExterior': controller.get_hum_abs_exterior(),
            'on': controller.is_on()
        }

    @app.get('/attic/config')
    @auth.with_auth
    def handle_get_attic_config(_request: Request):
        return {
            'schedule': schedule.get_schedule(),
            'deltaGrams': controller.get_delta_grams(),
            'humidityAbsoluteExteriorURL': controller.get_hum_abs_exterior_url(),
            'disabled': controller.is_disabled()
        }

    @app.put('/attic/config')
    @auth.with_auth
    def handle_put_attic_config(request: Request):
        disabled = util.get_body_bool(request.json, 'disabled')
        if disabled is not None:
            if disabled is util.INVALID:
                return {'disabled': 'invalid'}, 400
            controller.set_disabled(disabled)
            mqtt.put(path_disabled, 'ON' if controller.is_disabled() else 'OFF')

        delta_grams = util.get_body_float(request.json, 'deltaGrams')
        if delta_grams is not None:
            if delta_grams is util.INVALID or not controller.set_delta_grams(delta_grams):
                return {'deltaGrams': 'invalid'}, 400

        url = util.get_body_str(request.json, 'humidityAbsoluteExteriorURL')
        if url is not None:
            if url is util.INVALID or not controller.set_hum_abs_exterior_url(url):
                return {'humidityAbsoluteExteriorURL': 'invalid'}, 400

        schedule_ = util.get_body_obj(request.json, 'schedule')
        if schedule_ is not None:
            if schedule_ is util.INVALID or not schedule.set_schedule(schedule_):
                return {'schedule': 'invalid'}, 400
