from microdot import Microdot, Request
from switch import Switch
from auth import Auth
from mqtt_repo import MQTTRepo
from device import Device
import util
import time
try:
    import typ
except ImportError:
    typ = None


def mqtt_switch_path(switch: Switch):
    return 'device/%(id)s/switch/' + str(switch.get_id())


def install_switches(app: Microdot, auth: Auth, mqtt: MQTTRepo, device: Device, switches: typ.List[Switch]):
    def subscribe_switch(switch: Switch):
        path = mqtt_switch_path(switch)
        stop = {
            'timeout': 0,
            'enabled': False,
        }

        def cb_status(_topic: str, msg: str):
            if msg == 'online':
                switch.set_disabled(False)
            elif msg == 'offline':
                switch.set_disabled(True)

        def cb_set(_topic: str, msg: str):
            if msg == 'ON':
                if stop['enabled']:
                    switch.on(timeout=stop['timeout'] * 60)
                else:
                    switch.on()
            elif msg == 'OFF':
                switch.off()

        def cb_timeout(_topic: str, msg: str):
            try:
                stop['timeout'] = int(msg)
            except ValueError as e:
                print('ERROR: invalid stop timeout number received', msg, e)

        def cb_timeout_enabled(_topic: str, msg: str):
            stop['enabled'] = msg == 'ON'

        mqtt.subscribe(path + '/set', cb_set)
        mqtt.subscribe(path + '/status/set', cb_status)
        mqtt.subscribe(path + '/stoptimeout', cb_timeout)
        mqtt.subscribe(path + '/stoptimeout/enabled', cb_timeout_enabled)

    def publish_switch(switch: Switch):
        path = mqtt_switch_path(switch)

        mqtt.put(path, 'ON' if switch.is_on() else 'OFF')
        mqtt.put(path + '/status', 'offline' if switch.is_disabled() else 'online')
        mqtt.put_obj(path + '/stats', {
            'onSince': util.format_date(time.localtime(switch.get_on_since())),
            'stopTimeout': 'OFF' if switch.get_stop_time() == 0 else switch.get_stop_time(),
        } if switch.is_on() else {})

    def register():
        for switch in switches:
            subscribe_switch(switch)
            publish_switch(switch)
            switch.add_listener(publish_switch)

        def switches_vars():
            for sw in switches:
                yield {
                    'switch_id': str(sw.get_id()),
                    'switch_name': sw.get_name(),
                }

        device.add_config('switch_config.json', switches_vars)
        device.add_config('switch_stats_config.json', switches_vars)

    register()

    def build(switch: Switch):
        data = {
            'id': switch.get_id(),
            'name': switch.get_name(),
            'on': switch.is_on(),
            'disabled': switch.is_disabled(),
        }
        if switch.get_on_since():
            data['onSince'] = util.format_date(time.localtime(switch.get_on_since()))
            data['stopTimeout'] = switch.get_stop_time()
        return data

    def get_switch(id_: int):
        for switch in switches:
            if switch.get_id() == id_:
                return switch

    @app.get('/switch')
    @auth.with_auth
    def handle_get_switches(_request: Request):
        items = [build(switch) for switch in switches]
        return {
            'items': items,
        }

    @app.get('/switch/<int:id_>')
    @auth.with_auth
    def handle_get_switch(_request: Request, id_: int):
        switch = get_switch(id_)
        if switch is None:
            return '', 404
        return build(switch)

    @app.put('/switch/<int:id_>')
    @auth.with_auth
    def handle_put_switch(request: Request, id_: int):
        switch = get_switch(id_)
        if switch is None:
            return '', 404
        name = util.get_body_str(request.json, 'name')
        if name is not None:
            if name is util.INVALID or not switch.set_name(name):
                return {'name': 'invalid'}, 400

        on = util.get_body_int(request.json, 'on')
        if on is not None:
            if on is util.INVALID:
                on = util.get_body_bool(request.json, 'on')
                if on is util.INVALID:
                    return {'on': 'invalid'}, 400
                timeout = None
            else:
                if not util.is_int(on, min_value=0):
                    return {'on': 'invalid'}, 400
                timeout = on * 60
                on = True

            if on:
                switch.on(timeout=timeout)
            else:
                switch.off()

        disabled = util.get_body_bool(request.json, 'disabled')
        if disabled is not None:
            if disabled is util.INVALID:
                return {'disabled': 'invalid'}, 400
            switch.set_disabled(disabled)
