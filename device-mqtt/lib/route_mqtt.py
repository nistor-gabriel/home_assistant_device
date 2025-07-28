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
            'server': mqtt.get_mqtt_server(),
            'port': mqtt.get_mqtt_port(),
            'ssl': mqtt.get_mqtt_ssl(),
            'isConnected': mqtt.is_connected(),
        }

    @app.put('/mqtt')
    @auth.with_auth
    def handle_put_mqtt(request: Request):
        server = util.get_body_str(request.json, 'server')
        port = util.get_body_int(request.json, 'port')
        ssl = util.get_body_bool(request.json, 'ssl')
        user = util.get_body_str(request.json, 'user')
        password = util.get_body_str(request.json, 'password')

        issue = mqtt.set_mqtt_connection(server, port, ssl, user, password)
        if issue:
            return issue, 400
