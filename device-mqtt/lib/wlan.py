# noinspection PyUnresolvedReferences
import network
import util
from config import Config, ConfigEntry
import socket

try:
    import typ
except ImportError:
    typ = None
try:
    import asyncio
except ImportError:
    import uasyncio as asyncio


class Wlan:

    def __init__(self, config: Config, name: ConfigEntry, loop: asyncio.AbstractEventLoop, ssid: str = None,
                 wpass: str = None):
        self._name = name
        self._loop = loop
        self._ssid = config.create('wifi_ssid', ssid)
        self._pass = config.create('wifi_pass', wpass)
        self._conn = False
        self._conn_ssid: str | None = None
        self._conn_pass: str | None = None
        self._ifconfig: typ.Union[(str, str, str, str), None] = None

        self._connect_listeners = util.Listeners()
        self._disconnect_listeners = util.Listeners()
        self.wlan: network.WLAN = None

    def add_connect_listener(self, listener: typ.Callable[[bool], None]):
        return self._connect_listeners.add(listener)

    def add_disconnect_listener(self, listener: typ.Callable[[], None]):
        return self._disconnect_listeners.add(listener)

    def get_ssid(self):
        return self._ssid.get()

    def get_ip(self):
        if self._ifconfig:
            return self._ifconfig[0]
        return None

    def get_subnet(self):
        if self._ifconfig:
            return self._ifconfig[1]
        return None

    def get_gateway(self):
        if self._ifconfig:
            return self._ifconfig[2]
        return None

    def get_dns(self):
        if self._ifconfig:
            return self._ifconfig[3]
        return None

    def connect(self, ssid: str, password: str):
        if not util.is_str(ssid, min_len=1, max_len=32):
            print('ERROR: invalid ssid')
            return {'ssid': 'invalid'}
        if not util.is_str(password, min_len=3, max_len=50):
            print('ERROR: invalid password')
            return {'password': 'invalid'}

        self._conn = True
        self._conn_ssid = ssid
        self._conn_pass = password

        return True

    def reset(self):
        self._ssid.reset()
        self._pass.reset()

    def is_wifi_available(self):
        return self._ssid.get() is not None

    def wifi_signal(self):
        # wlan.status('rssi')
        if not self.is_wifi_available():
            return 0
        rssi = self.wlan.status('rssi')
        rssi = max(rssi, -80)
        rssi = min(rssi, -40)
        return int(((rssi + 80) * 100) / 40)

    def setup(self):
        self._loop.create_task(self._run())

    def _on_connect(self, has_internet: bool):
        self._connect_listeners.notify(has_internet)

    def _on_disconnect(self):
        self._disconnect_listeners.notify()

    # noinspection PyBroadException
    async def _run(self):
        while True:
            network.hostname(self._name.get())
            if self.is_wifi_available() or self._conn:
                if self._conn:
                    ssid = self._conn_ssid
                    password = self._conn_pass
                else:
                    ssid = self._ssid.get()
                    password = self._pass.get()

                self.wlan = network.WLAN(network.STA_IF)
                self.wlan.active(True)
                self.wlan.connect(ssid, password)

                for _k in range(0, 60):
                    await asyncio.sleep(0.3)
                    if self.wlan.isconnected():
                        break
                if not self.wlan.isconnected():
                    print('failed to connect on', self._conn_ssid if self._conn else self._ssid.get())
                    if self._conn:
                        self._conn = False
                        self._conn_ssid = self._conn_pass = None
                    continue
                self._ifconfig = self.wlan.ifconfig()
                print('connected on IP:', self._ifconfig[0])
                if self._conn:
                    self._conn = False
                    self._ssid.set(self._conn_ssid)
                    self._pass.set(self._conn_pass)

                    self._conn_ssid = self._conn_pass = None

                # print('DEBUG: wlan connected')
                self._on_connect(True)
                # print('DEBUG: wlan after connect')

                reconnect = False
                while True:
                    # print('DEBUG: wlan pinging')
                    try:
                        sent, recv = ping(self.get_gateway(), count=1)
                        if sent != recv:
                            print('cannot ping the gateway')
                            reconnect = sent != recv
                    except OSError as e:
                        print('error on pinging the gateway', e)
                        reconnect = True

                    if self._conn or reconnect or not self.is_wifi_available():
                        print('connecting to the wifi')
                        self.wlan.disconnect()
                        self.wlan.active(False)
                        self.wlan = None
                        self._on_disconnect()
                        # print('DEBUG: wlan disconnect')
                        break

                    # print('DEBUG: wlan waiting')
                    await asyncio.sleep(10)
                    # print('DEBUG: wlan after waiting')
            else:
                # print('DEBUG: wlan starting AP')
                self.wlan = network.WLAN(network.AP_IF)
                self.wlan.active(True)
                self.wlan.config(ssid=self._name.get(), password='sigma2000',
                                 security=network.WLAN.SEC_WPA_WPA2)
                print('connected on AP:', self.wlan.ifconfig()[0])
                self._on_connect(False)

                ip = self.wlan.ifconfig()[0]
                udps = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                udps.setblocking(False)
                udps.bind(('', 53))

                while True:
                    if self._conn:
                        self.wlan.disconnect()
                        self.wlan.active(False)
                        self.wlan = None
                        self._on_disconnect()
                        # print('DEBUG: wlan disconnect AP')
                        break
                    # print('DEBUG: wlan processing DNS')
                    try:
                        data, addr = udps.recvfrom(1024)
                        p = DNSQuery(data)
                        udps.sendto(p.response(ip), addr)
                    except:
                        await asyncio.sleep(1)


class DNSQuery:
    def __init__(self, data):
        self.data = data
        self.domain = ''

        m = data[2]
        tipo = (m >> 3) & 15
        if tipo == 0:
            ini = 12
            lon = data[ini]
            while lon != 0:
                self.domain += data[ini + 1: ini + lon + 1].decode('utf-8') + '.'
                ini += lon+1
                lon = data[ini]

    def response(self, ip):
        packet = b''
        if self.domain:
            packet += self.data[:2] + b'\x81\x80'
            packet += self.data[4:6] + self.data[4:6] + b'\x00\x00\x00\x00'
            packet += self.data[12:]
            packet += b'\xc0\x0c'
            packet += b'\x00\x01\x00\x01\x00\x00\x00\x3c\x00\x04'
            packet += bytes(map(int, ip.split('.')))
        return packet


def checksum(data):
    if len(data) & 0x1:
        data += b'\0'
    cs = 0
    for pos in range(0, len(data), 2):
        b1 = data[pos]
        b2 = data[pos + 1]
        cs += (b1 << 8) + b2
    while cs >= 0x10000:
        cs = (cs & 0xffff) + (cs >> 16)
    cs = ~cs & 0xffff
    return cs


# noinspection PyUnresolvedReferences
def ping(host, count=4, timeout=5000, interval=10, size=64):
    import utime
    import uselect
    import uctypes
    import urandom

    pkt = b'Q'*size
    pkt_desc = {
        "type": uctypes.UINT8 | 0,
        "code": uctypes.UINT8 | 1,
        "checksum": uctypes.UINT16 | 2,
        "id": uctypes.UINT16 | 4,
        "seq": uctypes.INT16 | 6,
        "timestamp": uctypes.UINT64 | 8,
    }
    h = uctypes.struct(uctypes.addressof(pkt), pkt_desc, uctypes.BIG_ENDIAN)
    h.type = 8
    h.code = 0
    h.checksum = 0
    h.id = urandom.getrandbits(16)
    h.seq = 1

    sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, 1)
    sock.setblocking(False)
    sock.settimeout(timeout/1000)
    addr = socket.getaddrinfo(host, 1)[0][-1][0]
    sock.connect((addr, 1))

    seqs = list(range(1, count+1))
    c = 1
    t = 0
    n_trans = 0
    n_recv = 0
    finish = False
    while t < timeout:
        if t == interval and c <= count:
            h.checksum = 0
            h.seq = c
            h.timestamp = utime.ticks_us()
            h.checksum = checksum(pkt)
            if sock.send(pkt) == size:
                n_trans += 1
                t = 0
            else:
                seqs.remove(c)
            c += 1

        # recv packet
        while 1:
            socks, _, _ = uselect.select([sock], [], [], 0)
            if socks:
                resp = socks[0].recv(4096)
                resp_mv = memoryview(resp)
                h2 = uctypes.struct(uctypes.addressof(resp_mv[20:]), pkt_desc, uctypes.BIG_ENDIAN)
                seq = h2.seq
                if h2.type == 0 and h2.id == h.id and (seq in seqs):
                    n_recv += 1
                    seqs.remove(seq)
                    if len(seqs) == 0:
                        finish = True
                        break
            else:
                break

        if finish:
            break

        utime.sleep_ms(1)
        t += 1

    sock.close()
    return n_trans, n_recv
