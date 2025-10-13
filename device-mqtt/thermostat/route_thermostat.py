from microdot import Microdot, Request
from controller import Controller
from heating import Heating
from mqtt_repo import MQTTRepo
from device import Device
from auth import Auth
from auto_schedule import AutoSchedule
import time
import util


def install_thermostat(app: Microdot, auth: Auth, heating: Heating, controller: Controller,
                       auto_schedule: AutoSchedule, mqtt: MQTTRepo, device: Device):
    # path = 'device/%(id)s'
    # path_disabled = path + '/disabled'
    # path_offset_period = path + '/offsetperiod'
    # path_stop_period = path + '/stopperiod'
    # path_pump_cycle_period = path + '/pumpcycleperiod'
    # path_pump_period = path + '/pumpperiod'
    # path_heat = path + '/heat'
    # path_mode = path + '/mode'
    # path_delta_start = path + '/deltastart'
    # path_delta_end = path + '/deltaend'
    #
    # def listener(event: str):
    #     print(event)
    #
    # def cb_disabled(_topic: str, msg: str):
    #     if msg == 'ON':
    #         controller.set_disabled_low_watchdog(True)
    #     else:
    #         controller.set_disabled_low_watchdog(False)
    #     mqtt.put(path_disabled_low_watchdog, 'ON' if controller.get_disabled_low_watchdog() else 'OFF')
    #
    # heating.add_listener(listener)
    # controller.add_listener(listener)
    #
    # device.add_config('thermostat_config.json')

    @app.get('/thermostat')
    @auth.with_auth
    def handle_get_thermostat(_request: Request):
        data = {
            'on': controller.is_on(),
            'heatOn': heating.is_heat_on(),
            'pumpOn': heating.is_pump_on(),
            'temperature': controller.get_temp(),
            'mode': controller.get_mode(),
            'temperatureTarget': controller.get_target_temp(),
        }
        if heating.get_on_since():
            data['onSince'] = util.format_date(time.localtime(heating.get_on_since()))
            data['stopTimeout'] = heating.get_stop_time()
        if heating.get_off_since():
            data['offSince'] = util.format_date(time.localtime(heating.get_off_since()))
        return data

    @app.get('/thermostat/config')
    @auth.with_auth
    def handle_get_thermostat_config(_request: Request):
        return {
            'pumpCyclePeriod': heating.get_pump_cycle_period(),
            'pumpPeriod': heating.get_pump_period(),
            'offsetPeriod': heating.get_offset_period(),
            'deltaStart': controller.get_delta_start(),
            'deltaEnd': controller.get_delta_end(),
            'temperatureAway': controller.get_temp_away(),
            'temperatureManual': controller.get_temp_manual(),
            'temperatures': auto_schedule.get_temperatures(),
        }

    @app.put('/thermostat')
    @auth.with_auth
    def handle_put_thermostat(request: Request):
        heat_on = util.get_body_int(request.json, 'heatOn')
        if heat_on is not None:
            if heat_on is util.INVALID:
                return {'heatOn': 'invalid'}, 400
            if heat_on:
                heating.on(heat_on * 60)
            else:
                heating.off()

        mode = util.get_body_str(request.json, 'mode')
        if mode is not None:
            if mode is util.INVALID or not controller.set_mode(mode):
                return {'mode': 'invalid'}, 400

    @app.put('/thermostat/config')
    @auth.with_auth
    def handle_put_thermostat_config(request: Request):
        offset_period = util.get_body_float(request.json, 'offsetPeriod')
        if offset_period is not None:
            if offset_period is util.INVALID or not heating.set_offset_period(offset_period):
                return {'offsetPeriod': 'invalid'}, 400

        pump_cycle_period = util.get_body_float(request.json, 'pumpCyclePeriod')
        if pump_cycle_period is not None:
            if pump_cycle_period is util.INVALID or not heating.set_pump_cycle_period(pump_cycle_period):
                return {'pumpCyclePeriod': 'invalid'}, 400

        pump_period = util.get_body_float(request.json, 'pumpPeriod')
        if pump_period is not None:
            if pump_period is util.INVALID or not heating.set_pump_period(pump_period):
                return {'pumpPeriod': 'invalid'}, 400

        delta_start = util.get_body_str(request.json, 'deltaStart')
        if delta_start is not None:
            if delta_start is util.INVALID or not controller.set_delta_start(delta_start):
                return {'deltaStart': 'invalid'}, 400

        delta_end = util.get_body_str(request.json, 'deltaEnd')
        if delta_end is not None:
            if delta_end is util.INVALID or not controller.set_delta_end(delta_end):
                return {'deltaEnd': 'invalid'}, 400

        temp_away = util.get_body_float(request.json, 'temperatureAway')
        if temp_away is not None:
            if temp_away is util.INVALID or not controller.set_temp_away(temp_away):
                return {'temperatureAway': 'invalid'}, 400

        temp_manual = util.get_body_float(request.json, 'temperatureManual')
        if temp_manual is not None:
            if temp_manual is util.INVALID or not controller.set_temp_manual(temp_manual):
                return {'temperatureManual': 'invalid'}, 400

        temperatures = util.get_body_obj(request.json, 'temperatures')
        if temperatures is not None:
            if temperatures is util.INVALID or not auto_schedule.set_temperatures(temperatures):
                return {'temperatures': 'invalid'}, 400
