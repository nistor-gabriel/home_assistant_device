from microdot import Microdot, Request
from switch import Switch
from auth import Auth
from config import Config
import util
import time
try:
    import typ
except ImportError:
    typ = None


class Model:

    def __init__(self, config: Config, switch: Switch):
        self.name = config.create('switch_' + str(switch.get_id()) + '_name', 'Switch ' + str(switch.get_id()))
        self.switch = switch

    def build(self):
        data = {
            'id': self.switch.get_id(),
            'name': self.name.get(),
            'on': self.switch.is_on(),
            'disabled': self.switch.is_disabled(),
        }
        if self.switch.get_on_since():
            data['onSince'] = util.format_date(time.localtime(self.switch.get_on_since()))
            data['stopTimeout'] = self.switch.get_stop_time()
        return data


def install_switches(app: Microdot, auth: Auth, switches: typ.List[Switch]):

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
                timeout = on
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
