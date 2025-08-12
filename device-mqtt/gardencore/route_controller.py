from microdot import Microdot, Request
from controller import Controller
from mqtt_repo import MQTTRepo
from device import Device
from auth import Auth
import util


def install_controller(app: Microdot, auth: Auth, controller: Controller, mqtt: MQTTRepo, device: Device):
    path = 'device/%(id)s'
    path_disabled_low_watchdog = path + '/disabledlowwatchdog'
    path_disabled_high_watchdog = path + '/disabledhighwatchdog'
    path_off_high_pressure = path + '/offhighpressure'
    path_off_high_period = path + '/offhighperiod'
    path_off_low_pressure = path + '/offlowpressure'
    path_off_low_start_period = path + '/offlowstartperiod'
    path_off_low_period = path + '/offlowperiod'

    def cb_disabled_low_watchdog(_topic: str, msg: str):
        if msg == 'ON':
            controller.set_disabled_low_watchdog(True)
        else:
            controller.set_disabled_low_watchdog(False)

    def cb_disabled_high_watchdog(_topic: str, msg: str):
        if msg == 'ON':
            controller.set_disabled_high_watchdog(True)
        else:
            controller.set_disabled_high_watchdog(False)

    def cb_off_high_pressure(_topic: str, msg: str):
        controller.set_off_high_pressure(util.as_float(msg, 'off high pressure'))

    def cb_off_high_period(_topic: str, msg: str):
        controller.set_off_high_period(util.as_int(msg, 'off high period'))

    def cb_off_low_pressure(_topic: str, msg: str):
        controller.set_off_low_pressure(util.as_float(msg, 'off low pressure'))

    def cb_off_low_start_period(_topic: str, msg: str):
        controller.set_off_low_start_period(util.as_int(msg, 'off low start period'))

    def cb_off_low_period(_topic: str, msg: str):
        controller.set_off_low_period(util.as_int(msg, 'off low period'))

    def publish_controller():
        mqtt.put(path_disabled_low_watchdog, 'ON' if controller.get_disabled_low_watchdog() else 'OFF')
        mqtt.put(path_disabled_high_watchdog, 'ON' if controller.get_disabled_high_watchdog() else 'OFF')
        mqtt.put(path_off_high_pressure, str(controller.get_off_high_pressure()))
        mqtt.put(path_off_high_period, str(controller.get_off_high_period()))
        mqtt.put(path_off_low_pressure, str(controller.get_off_low_pressure()))
        mqtt.put(path_off_low_start_period, str(controller.get_off_low_start_period()))
        mqtt.put(path_off_low_period, str(controller.get_off_low_period()))

    def listener(event: str):
        if event == 'pressureLow' or event == 'pressureHigh':
            mqtt.put('device/%(id)s/lastissue', str(controller.get_last_issue()))
        elif event == 'pressureUpdate':
            mqtt.put('device/%(id)s/pressure', str(controller.get_pressure()))

    publish_controller()
    controller.add_listener(listener)
    device.add_config('controller_config.json')
    mqtt.subscribe(path_disabled_low_watchdog + '/set', cb_disabled_low_watchdog)
    mqtt.subscribe(path_disabled_high_watchdog + '/set', cb_disabled_high_watchdog)
    mqtt.subscribe(path_off_high_pressure + '/set', cb_off_high_pressure)
    mqtt.subscribe(path_off_high_period + '/set', cb_off_high_period)
    mqtt.subscribe(path_off_low_pressure + '/set', cb_off_low_pressure)
    mqtt.subscribe(path_off_low_start_period + '/set', cb_off_low_start_period)
    mqtt.subscribe(path_off_low_period + '/set', cb_off_low_period)

    @app.get('/pump')
    @auth.with_auth
    def handle_get_pump(_request: Request):
        return {
            'disabledLowWatchdog': controller.get_disabled_low_watchdog(),
            'disabledHighWatchdog': controller.get_disabled_high_watchdog(),
            'offLowPressure': controller.get_off_low_pressure(),
            'offLowPeriod': controller.get_off_low_period(),
            'offLowStartPeriod': controller.get_off_low_start_period(),
            'offHighPressure': controller.get_off_high_pressure(),
            'offHighPeriod': controller.get_off_high_period(),
            'lastIssue': controller.get_last_issue(),
        }

    @app.get('/pump/pressure')
    @auth.with_auth
    def handle_get_pump_pressure(_request: Request):
        return {
            'pressure': controller.get_pressure(),
        }

    @app.put('/pump')
    @auth.with_auth
    def handle_put_pump(request: Request):
        disabled_low_watchdog = util.get_body_bool(request.json, 'disabledLowWatchdog')
        if disabled_low_watchdog is not None:
            if disabled_low_watchdog is util.INVALID:
                return {'disabledLowWatchdog': 'invalid'}, 400
            controller.set_disabled_low_watchdog(disabled_low_watchdog)
            publish_controller()

        disabled_high_watchdog = util.get_body_bool(request.json, 'disabledHighWatchdog')
        if disabled_high_watchdog is not None:
            if disabled_high_watchdog is util.INVALID:
                return {'disabledHighWatchdog': 'invalid'}, 400
            controller.set_disabled_high_watchdog(disabled_high_watchdog)
            publish_controller()

        off_low_pressure = util.get_body_float(request.json, 'offLowPressure')
        if off_low_pressure is not None:
            if off_low_pressure is util.INVALID or not controller.set_off_low_pressure(off_low_pressure):
                return {'offLowPressure': 'invalid'}, 400
            else:
                publish_controller()

        off_low_period = util.get_body_float(request.json, 'offLowPeriod')
        if off_low_period is not None:
            if off_low_period is util.INVALID or not controller.set_off_low_period(off_low_period):
                return {'offLowPeriod': 'invalid'}, 400
            else:
                publish_controller()

        off_low_start_period = util.get_body_float(request.json, 'offLowStartPeriod')
        if off_low_start_period is not None:
            if off_low_start_period is util.INVALID or not controller.set_off_low_start_period(off_low_start_period):
                return {'offLowStartPeriod': 'invalid'}, 400
            else:
                publish_controller()

        off_high_pressure = util.get_body_float(request.json, 'offHighPressure')
        if off_high_pressure is not None:
            if off_high_pressure is util.INVALID or not controller.set_off_high_pressure(off_high_pressure):
                return {'offHighPressure': 'invalid'}, 400
            else:
                publish_controller()

        off_high_period = util.get_body_float(request.json, 'offHighPeriod')
        if off_high_period is not None:
            if off_high_period is util.INVALID or not controller.set_off_high_period(off_high_period):
                return {'offHighPeriod': 'invalid'}, 400
            else:
                publish_controller()
