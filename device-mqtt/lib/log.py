import sys
import os
import util
from config import Config


class Logger:

    @staticmethod
    def print_exc(e: BaseException):
        # noinspection PyUnresolvedReferences
        sys.print_exception(e)

    @staticmethod
    def print_log(msg: str):
        print(msg)


class LoggerFile(Logger):

    def __init__(self, config: Config, log_to_file: bool | None = None, max_file_size: int = 20 * 4096):
        self._log_to_file = config.create('logger_log_to_file', log_to_file or False)
        self._max_file_size = config.create('logger_max_size', max_file_size)

    def is_log_to_file(self):
        return self._log_to_file.get()

    def get_max_file_size(self):
        return self._max_file_size.get()

    def set_log_to_file(self, log_to_file: bool):
        if self._log_to_file.get() == log_to_file:
            return
        self._log_to_file.set(log_to_file)

    def set_max_file_size(self, max_file_size: bool):
        if self._max_file_size.get() == max_file_size:
            return True
        if not util.is_int(max_file_size, min_value=4096, max_value=50*4096):
            return False
        self._max_file_size.set(max_file_size)
        return True

    @staticmethod
    def clear_logs():
        try:
            os.remove('log.1.txt')
        except OSError:
            pass
        try:
            os.remove('log.2.txt')
        except OSError:
            pass

    def print_exc(self, e: BaseException):
        super().print_exc(e)
        if self._log_to_file.get():
            with open('log.1.txt', 'a+') as f:
                # noinspection PyUnresolvedReferences
                sys.print_exception(e, f)
            self._rotate()

    def print_log(self, msg: str):
        super().print_log(msg)
        if self._log_to_file.get():
            with open('log.1.txt', 'a+') as f:
                f.write(msg + '\n')
            self._rotate()

    def _rotate(self):
        size = os.stat('log.1.txt')[6]
        if size >= self.get_max_file_size():
            try:
                os.remove('log.2.txt')
            except OSError:
                pass
            os.rename('log.1.txt', 'log.2.txt')


logger = Logger()


def info(msg: str, e: BaseException = None):
    logger.print_log('INFO: ' + msg)
    if e:
        logger.print_exc(e)


def error(msg: str, e: BaseException = None):
    logger.print_log('ERROR: ' + msg)
    if e:
        logger.print_exc(e)
