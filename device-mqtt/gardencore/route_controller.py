from microdot import Microdot, Request
from controller import Controller
from auth import Auth
import util


def install_controller(app: Microdot, auth: Auth, controller: Controller):

    def listener(event: str):
        if event == 'pressureLow':
            pass
        elif event == 'pressureHigh':
            pass
        elif event == 'pressureUpdate':
            pass

    controller.add_listener(listener)

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

        disabled_high_watchdog = util.get_body_bool(request.json, 'disabledHighWatchdog')
        if disabled_high_watchdog is not None:
            if disabled_high_watchdog is util.INVALID:
                return {'disabledHighWatchdog': 'invalid'}, 400
            controller.set_disabled_high_watchdog(disabled_high_watchdog)

        off_low_pressure = util.get_body_float(request.json, 'offLowPressure')
        if off_low_pressure is not None:
            if off_low_pressure is util.INVALID or not controller.set_off_low_pressure(off_low_pressure):
                return {'offLowPressure': 'invalid'}, 400

        off_low_period = util.get_body_float(request.json, 'offLowPeriod')
        if off_low_period is not None:
            if off_low_period is util.INVALID or not controller.set_off_low_period(off_low_period):
                return {'offLowPeriod': 'invalid'}, 400

        off_low_start_period = util.get_body_float(request.json, 'offLowStartPeriod')
        if off_low_start_period is not None:
            if off_low_start_period is util.INVALID or not controller.set_off_low_start_period(off_low_start_period):
                return {'offLowStartPeriod': 'invalid'}, 400

        off_high_pressure = util.get_body_float(request.json, 'offHighPressure')
        if off_high_pressure is not None:
            if off_high_pressure is util.INVALID or not controller.set_off_high_pressure(off_high_pressure):
                return {'offHighPressure': 'invalid'}, 400

        off_high_period = util.get_body_float(request.json, 'offHighPeriod')
        if off_high_period is not None:
            if off_high_period is util.INVALID or not controller.set_off_high_period(off_high_period):
                return {'offHighPeriod': 'invalid'}, 400
