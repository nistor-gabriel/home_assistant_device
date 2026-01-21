from auth import Auth
from log import LoggerFile
from microdot import Microdot, Request
import util


def install_log(app: Microdot, auth: Auth, logger: LoggerFile):

    @app.get('/log')
    @auth.with_auth
    def handle_get_log(_request: Request):
        return {
            'logToFile': logger.is_log_to_file(),
            'maxFileSize': logger.get_max_file_size(),
        }

    @app.put('/log')
    @auth.with_auth
    def handle_put_log(request: Request):
        log_to_file = util.get_body_bool(request.json, 'logToFile')
        if log_to_file is not None:
            if not util.is_bool(log_to_file):
                return {'logToFile': 'invalid'}, 400
            else:
                logger.set_log_to_file(log_to_file)

        max_file_size = util.get_body_int(request.json, 'maxFileSize')
        if max_file_size is not None:
            if max_file_size is util.INVALID or not logger.set_max_file_size(max_file_size):
                return {'maxFileSize': 'invalid'}, 400

    @app.delete('/log')
    @auth.with_auth
    def handle_delete_log(_request: Request):
        logger.clear_logs()
