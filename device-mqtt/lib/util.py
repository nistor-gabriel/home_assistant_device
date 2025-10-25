import time as mtime
import sys

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    # noinspection PyUnresolvedReferences
    import uasyncio as asyncio
try:
    import ntptime
except ImportError:
    # noinspection SpellCheckingInspection
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
            try:
                listener(*args, **kwargs)
            except Exception as e:
                print('ERROR: failed to run listener %s' % (listener,))
                # noinspection PyUnresolvedReferences
                sys.print_exception(e)


is_time_synchronized: bool = False
hosts = ['pool.ntp.org', '89.36.93.8']
start_time = mtime.time()
timezone = {
    'name': 'GMT',
    'std_offset': 0,
    'dst_offset': 0,
    'dst_start': lambda y: (1, 0, 0),  # dummy, not used
    'dst_end': lambda y: (1, 0, 0),    # dummy, not used
}


def set_timezone(name: str, std_offset: int, dst_offset: int, dst_start: typ.Callable, dst_end: typ.Callable):
    timezone['name'] = name
    timezone['std_offset'] = std_offset
    timezone['dst_offset'] = dst_offset
    timezone['dst_start'] = dst_start
    timezone['dst_end'] = dst_end


# noinspection PyTypeChecker
def is_dst(year, month, day, hour):
    start_day, start_hour, _ = timezone['dst_start'](year)
    end_day, end_hour, _ = timezone['dst_end'](year)
    start_ts = mtime.mktime((year, 3, start_day, start_hour, 0, 0, 0, 0))
    end_ts = mtime.mktime((year, 10 if timezone['name'].startswith('Europe') else 11, end_day, end_hour, 0, 0, 0, 0, 0))
    now_ts = mtime.mktime((year, month, day, hour, 0, 0, 0, 0))
    return start_ts <= now_ts < end_ts


# noinspection PyTypeChecker
def last_sunday(year: int, month: int):
    # Find the date of the last Sunday in a given month
    for day in range(31, 24, -1):  # Always within last week
        if mtime.localtime(mtime.mktime((year, month, day, 0, 0, 0, 0, 0)))[6] == 6:
            return day
    return 31


# noinspection PyTypeChecker
def first_sunday(year: int, month: int):
    for day in range(1, 8):
        if mtime.localtime(mtime.mktime((year, month, day, 0, 0, 0, 0, 0)))[6] == 6:
            return day
    return 1


# noinspection PyTypeChecker
def second_sunday(year: int, month: int):
    found = 0
    for day in range(1, 15):
        if mtime.localtime(mtime.mktime((year, month, day, 0, 0, 0, 0, 0)))[6] == 6:
            found += 1
            if found == 2:
                return day
    return 8


def time():
    t = mtime.gmtime()
    year, month, day, hour = t[0], t[1], t[2], t[3]
    offset = timezone['dst_offset'] if is_dst(year, month, day, hour) else timezone['std_offset']
    return mtime.mktime(t) + offset


def local_time():
    return mtime.localtime(time())


def uptime():
    return mtime.time() - start_time


async def synchronize_time():
    # print('DEBUG: synchronize time')
    global is_time_synchronized, start_time
    while not is_time_synchronized:
        for host in hosts:
            try:
                ntptime.host = host
                ntptime.settime()
                is_time_synchronized = True
                break
            except OSError as e:
                print('failed to synchronize time on host "%s"' % (host,))
                # noinspection PyUnresolvedReferences
                sys.print_exception(e)
        if is_time_synchronized:
            start_time = mtime.mktime(local_time())
            print('local time after synchronization：%s' % format_date(local_time()))
            break

        await asyncio.sleep(10)


def format_date(curt: mtime.struct_time):
    tm_year, tm_mon, tm_day, tm_hour, tm_min, tm_sec, _wd, _yd = curt
    return '{}-{:02d}-{:02d}T{:02d}:{:02d}:{:02d}'.format(tm_year, tm_mon, tm_day, tm_hour, tm_min, tm_sec)


def as_float(msg: str, target: str = ''):
    try:
        return float(msg)
    except ValueError as e:
        print('ERROR: invalid %s number received: %s' % (target, msg))
        # noinspection PyUnresolvedReferences
        sys.print_exception(e)


def as_int(msg: str, target: str = ''):
    try:
        return int(msg)
    except ValueError as e:
        print('ERROR: invalid int %s number received: %s' % (target, msg))
        # noinspection PyUnresolvedReferences
        sys.print_exception(e)


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
