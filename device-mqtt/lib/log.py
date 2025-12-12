import sys


def _print_exc(e: BaseException):
    # noinspection PyUnresolvedReferences
    sys.print_exception(e)
    with open('log.txt', 'a+') as f:
        # noinspection PyUnresolvedReferences
        sys.print_exception(e, f)


def _print_log(msg: str):
    print(msg)
    with open('log.txt', 'a+') as f:
        f.write(msg + '\n')


def info(msg: str, e: BaseException = None):
    _print_log('INFO: ' + msg)
    if e:
        _print_exc(e)


def error(msg: str, e: BaseException = None):
    _print_log('ERROR: ' + msg)
    if e:
        _print_exc(e)
