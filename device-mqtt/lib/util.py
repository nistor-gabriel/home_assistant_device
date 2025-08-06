import time

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio
try:
    import ntptime
except ImportError:
    ntptime = typ.Any


class Invalid:
    pass


INVALID = Invalid()


class Listeners:

    def __init__(self):
        self._listeners: {typ.Callable} = {}
        self._id = 1

    def add(self, listener: typ.Callable):
        self._id += 1
        _id = str(self._id)
        self._listeners[_id] = listener

        def remove():
            del self._listeners[_id]
        return remove

    def iter(self):
        return self._listeners.values()

    def notify(self, *args, **kwargs):
        for listener in self._listeners.values():
            listener(*args, **kwargs)


is_time_synchronized: bool = False
start_time = time.time()


def uptime():
    return time.time() - start_time


async def synchronize_time():
    # print('DEBUG: synchronize time')
    global is_time_synchronized, start_time
    while not is_time_synchronized:
        try:
            ntptime.host = '89.36.93.8'
            ntptime.settime()
            print('local time after synchronization：%s' % format_date(time.localtime()))
            start_time = time.time()
            is_time_synchronized = True
            break
        except OSError as e:
            print('failed to synchronize time:', e)
        await asyncio.sleep(10)


def format_date(curt: time.struct_time):
    tm_year, tm_mon, tm_day, tm_hour, tm_min, tm_sec, _wd, _yd = curt
    return '{}-{:02d}-{:02d}T{:02d}:{:02d}:{:02d}.000Z'.format(tm_year, tm_mon, tm_day, tm_hour, tm_min, tm_sec)


def is_str(value, min_len: int | None = None, max_len: int | None = None):
    if not isinstance(value, str):
        return False
    if min_len is not None:
        if len(value) < min_len:
            return False
    if max_len is not None:
        if len(value) > max_len:
            return False
    return True


def is_bool(value):
    if value is True or value is False:
        return True
    return False


def is_ip(value):
    if not isinstance(value, str):
        return False
    parts = value.split('.')
    if len(parts) != 4:
        return False
    for part in parts:
        try:
            int(part)
        except ValueError:
            return False
    return True


def is_float(value, min_value: float | None = None, max_value: float | None = None,
             min_ex_value: float | None = None, max_ex_value: float | None = None):
    if not (isinstance(value, float) or isinstance(value, int)):
        return False
    if min_value is not None:
        if value < min_value:
            return False
    if max_value is not None:
        if value > max_value:
            return False
    if min_ex_value is not None:
        if value <= min_ex_value:
            return False
    if max_ex_value is not None:
        if value >= max_ex_value:
            return False
    return True


def is_int(value, min_value: int | None = None, max_value: int | None = None,
           min_ex_value: int | None = None, max_ex_value: int | None = None):
    if not isinstance(value, int):
        return False
    if min_value is not None:
        if value < min_value:
            return False
    if max_value is not None:
        if value > max_value:
            return False
    if min_ex_value is not None:
        if value <= min_ex_value:
            return False
    if max_ex_value is not None:
        if value >= max_ex_value:
            return False
    return True


def get_body_str(body, key: str):
    if body is None:
        return None
    if key not in body:
        return None
    value = body[key]
    if isinstance(value, str):
        return value
    return INVALID


def get_body_bool(body, key: str):
    if body is None:
        return None
    if key not in body:
        return None
    value = body[key]
    if value is True or value is False:
        return value
    return INVALID


def get_body_float(body, key: str):
    if body is None:
        return None
    if key not in body:
        return None
    value = body[key]
    if isinstance(value, float) or isinstance(value, int):
        return value
    return INVALID


def get_body_int(body, key: str):
    if body is None:
        return None
    if key not in body:
        return None
    value = body[key]
    if isinstance(value, int):
        return value
    return INVALID


def get_body_obj(body, key: str):
    if body is None:
        return None
    if key not in body:
        return None
    value = body[key]
    if isinstance(value, dict):
        return value
    return INVALID
