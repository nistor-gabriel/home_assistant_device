from auth import Auth
from microdot import Microdot, Request
from mqtt_repo import MQTTRepo
import util
try:
    import typ
except ImportError:
    typ = None


def install_mqtt(app: Microdot, auth: Auth, mqtt: MQTTRepo):

    @app.get('/mqtt')
    @auth.with_auth
    def handle_get_mqtt(_request: Request):
        return {
            'server': mqtt.get_server(),
            'port': mqtt.get_port(),
            'ssl': mqtt.get_ssl(),
            'clientId': mqtt.get_client_id(),
            'defaultClientId': mqtt.get_default_client_id(),
            'disabled': mqtt.is_disabled(),
            'isConnected': mqtt.is_connected(),
        }

    @app.put('/mqtt')
    @auth.with_auth
    def handle_put_mqtt(request: Request):
        disabled = util.get_body_bool(request.json, 'disabled')

        if disabled is not None:
            if disabled is util.INVALID:
                return {'disabled': 'invalid'}, 400
            mqtt.set_disabled(disabled)

        else:
            server = util.get_body_str(request.json, 'server')
            port = util.get_body_int(request.json, 'port')
            ssl = util.get_body_bool(request.json, 'ssl')
            user = util.get_body_str(request.json, 'user')
            password = util.get_body_str(request.json, 'password')
            client_id = util.get_body_str(request.json, 'clientId')

            issue = mqtt.set_mqtt_connection(server, port, ssl, user, password, client_id)
            if issue:
                return issue, 400
