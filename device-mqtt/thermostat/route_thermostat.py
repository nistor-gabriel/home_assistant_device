from microdot import Microdot, Request
from controller import Controller
from temperature import Temperature
from heating import Heating
from auth import Auth
import util


def install_thermostat(app: Microdot, auth: Auth, heating: Heating, temperature: Temperature, controller: Controller):

    @app.get('/thermostat')
    @auth.with_auth
    def handle_get_thermostat(_request: Request):
        return {
            'isDisabled': controller.is_disabled(),
            'isOn': controller.is_on(),
            'isHeatOn': heating.is_heat_on(),
            'isPumpOn': heating.is_pump_on(),
            'stopPeriod': heating.get_stop_period(),
            'stopTimeout': heating.get_stop_timeout(),
            'pumpCyclePeriod': heating.get_pump_cycle_period(),
            'pumpPeriod': heating.get_pump_period(),
            'pumpCycleTimeout': heating.get_pump_cycle_timeout(),
            'offsetPeriod': heating.get_offset_period(),
            'offsetTimeout': heating.get_offset_timeout(),
            'temperature': controller.get_temp(),
            'mode': temperature.get_mode(),
            'deltaStart': temperature.get_delta_start(),
            'deltaEnd': temperature.get_delta_end(),
            'temperatureTarget': temperature.get_temp(),
            'temperatures': temperature.get_temperatures(),
        }

    @app.put('/thermostat')
    @auth.with_auth
    def handle_put_thermostat(request: Request):
        is_disabled = util.get_body_bool(request.json, 'isDisabled')
        if is_disabled is not None:
            if is_disabled is util.INVALID:
                return {'isDisabled': 'invalid'}, 400
            controller.set_disabled(is_disabled)

        offset_period = util.get_body_float(request.json, 'offsetPeriod')
        if offset_period is not None:
            if offset_period is util.INVALID or not heating.set_offset_period(offset_period):
                return {'offsetPeriod': 'invalid'}, 400

        stop_period = util.get_body_float(request.json, 'stopPeriod')
        if stop_period is not None:
            if stop_period is util.INVALID or not heating.set_stop_period(stop_period):
                return {'stopPeriod': 'invalid'}, 400

        pump_cycle_period = util.get_body_float(request.json, 'pumpCyclePeriod')
        if pump_cycle_period is not None:
            if pump_cycle_period is util.INVALID or not heating.set_pump_cycle_period(pump_cycle_period):
                return {'pumpCyclePeriod': 'invalid'}, 400

        pump_period = util.get_body_float(request.json, 'pumpPeriod')
        if pump_period is not None:
            if pump_period is util.INVALID or not heating.set_pump_period(pump_period):
                return {'pumpPeriod': 'invalid'}, 400

        is_on = util.get_body_bool(request.json, 'isHeatOn')
        if is_on is not None:
            if is_on is util.INVALID:
                return {'isHeatOn': 'invalid'}, 400
            if is_on:
                heating.on()
            else:
                heating.off()

        mode = util.get_body_str(request.json, 'mode')
        if mode is not None:
            if mode is util.INVALID or not temperature.set_mode(mode):
                return {'mode': 'invalid'}, 400

        delta_start = util.get_body_str(request.json, 'deltaStart')
        if delta_start is not None:
            if delta_start is util.INVALID or not temperature.set_delta_start(delta_start):
                return {'deltaStart': 'invalid'}, 400

        delta_end = util.get_body_str(request.json, 'deltaEnd')
        if delta_end is not None:
            if delta_end is util.INVALID or not temperature.set_delta_end(delta_end):
                return {'deltaEnd': 'invalid'}, 400

        temperatures = util.get_body_obj(request.json, 'temperatures')
        if temperatures is not None:
            if temperatures is util.INVALID or not temperature.set_temperatures(temperatures):
                return {'temperatures': 'invalid'}, 400
