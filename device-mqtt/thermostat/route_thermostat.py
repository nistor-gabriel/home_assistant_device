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
    path = 'device/%(id)s'
    path_temperature = path + '/temperature'
    path_temperature_manual = path + '/temperaturemanual'
    path_temperature_target = path + '/temperaturetarget'
    path_mode = path + '/mode'
    path_pump = path + '/pump'
    path_heat = path + '/heat'
    path_heating = path + '/heating'
    path_heating_timeout = path + '/heatingtimeout'
    path_thermostat = path + '/thermostat'

    ctx = {
        'timeout': 60
    }

    def publish_stats():
        mqtt.put_obj(path + '/heatingstats', {
            'onSince': util.format_date(time.localtime(heating.get_on_since())),
            'stopTimeout': 'off' if heating.get_stop_time() == 0 else heating.get_stop_time(),
            'offSince': 'off',
        } if heating.get_on_since() else {
            'onSince': 'off',
            'offSince': util.format_date(time.localtime(heating.get_off_since())),
            'stopTimeout': 'off',
        })

    def heating_listener(event: str):
        if event == 'heatOn':
            mqtt.put(path_heat, 'on')
        elif event == 'heatOff':
            mqtt.put(path_heat, 'off')
            mqtt.put(path_heating, 'off')
        elif event == 'pumpOn':
            mqtt.put(path_pump, 'on')
            mqtt.put(path_heating, 'on')
            publish_stats()
        elif event == 'pumpOff':
            mqtt.put(path_pump, 'off')
            publish_stats()

    def controller_listener(event: str):
        if event == 'temperature':
            mqtt.put(path_temperature, str(controller.get_temp()))
        elif event == 'thermostatOn':
            mqtt.put(path_thermostat, 'on')
            publish_stats()
        elif event == 'thermostatOff':
            mqtt.put(path_thermostat, 'off')
            publish_stats()
        elif event == 'temperatureTarget':
            mqtt.put(path_temperature_target, str(controller.get_target_temp()))

    def cb_mode(_topic: str, msg: str):
        controller.set_mode(msg)
        mqtt.put(path_mode, controller.get_mode())

    def cb_temperature_manual(_topic: str, msg: str):
        try:
            controller.set_temp_manual(float(msg))
        except ValueError:
            return
        mqtt.put(path_temperature_manual, str(controller.get_temp_manual()))

    def cb_timeout(_topic: str, msg: str):
        try:
            ctx['timeout'] = int(msg)
        except ValueError:
            print('ERROR: invalid stop timeout number received: %s' % (msg,))
            return
        mqtt.put(path_heating_timeout, str(ctx['timeout']))

    def cb_heating(_topic: str, msg: str):
        if msg == 'on':
            heating.on(timeout=ctx['timeout'] * 60)
        elif msg == 'off':
            heating.off()

    heating.add_listener(heating_listener)
    controller.add_listener(controller_listener)

    mqtt.put(path_temperature_manual, str(controller.get_temp_manual()))
    mqtt.put(path_thermostat, 'off')
    mqtt.put(path_mode, controller.get_mode())
    mqtt.put(path_heat, 'off')
    mqtt.put(path_pump, 'off')
    mqtt.put(path_heating, 'off')
    mqtt.put(path_heating_timeout, str(ctx['timeout']))
    mqtt.put(path_temperature_target, str(controller.get_target_temp()))
    publish_stats()

    mqtt.subscribe(path_heating_timeout + '/set', cb_timeout)
    mqtt.subscribe(path_heating + '/set', cb_heating)
    mqtt.subscribe(path_mode + '/set', cb_mode)
    mqtt.subscribe(path_temperature_manual + '/set', cb_temperature_manual)

    device.add_config('thermostat_config.json')
    device.add_config('thermostat_climate_config.json')
    device.add_config('thermostat_stats_config.json')

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
            else:
                mqtt.put(path_mode, mode)

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

        delta_start = util.get_body_float(request.json, 'deltaStart')
        if delta_start is not None:
            if delta_start is util.INVALID or not controller.set_delta_start(delta_start):
                return {'deltaStart': 'invalid'}, 400

        delta_end = util.get_body_float(request.json, 'deltaEnd')
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
            else:
                mqtt.put(path_temperature_manual, str(temp_manual))

        temperatures = util.get_body_obj(request.json, 'temperatures')
        if temperatures is not None:
            if temperatures is util.INVALID or not auto_schedule.set_temperatures(temperatures):
                return {'temperatures': 'invalid'}, 400
