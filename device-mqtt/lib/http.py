import asyncio
import json
import binascii
try:
    import typ
except ImportError:
    typ = None


def parse_url(url):
    scheme, rest = url.split('://', 1)
    hostport, _, path = rest.partition('/')
    path = '/' + path

    user = password = None
    if "@" in hostport:
        creds, hostport = hostport.rsplit('@', 1)
        user, _, password = creds.partition(':')

    host, _, port = hostport.partition(':')
    if port:
        port = int(port)
    else:
        port = 443 if scheme == 'https' else 80

    return scheme, host, port, path, user, password


def basic_auth_header(user, password):
    creds = binascii.b2a_base64(f'{user}:{password}'.encode()).strip().decode()
    return f'Basic {creds}'


async def http_get_json(path: str, host: typ.Union[str, None] = None, port: typ.Union[int, None] = None,
                        user: typ.Union[str, None] = None, password: typ.Union[str, None] = None,
                        use_ssl: typ.Union[bool, None] = None, timeout: int = 10):
    scheme, url_host, url_port, path, url_user, url_password = parse_url(path)
    if use_ssl is None:
        use_ssl = True if scheme == 'https' else False
    if port is None:
        port = url_port
    if host is None:
        host = url_host
    if user is None and url_user:
        user = url_user
    if password is None and url_password:
        password = url_password

    async def _request():

        reader, writer = await asyncio.open_connection(host, port, ssl=use_ssl)
        try:
            # HTTP/1.0 keeps servers from using chunked transfer encoding
            req = (
                f'GET {path} HTTP/1.0\r\n'
                f"Host: {host}\r\n"
                'Accept: application/json\r\n'
                'Connection: close\r\n'
            )
            if user:
                req += f'Authorization: {basic_auth_header(user, password)}\r\n'
            req += '\r\n'
            writer.write(req.encode())
            await writer.drain()

            status_line = await reader.readline()
            status = int(status_line.split()[1])

            # skip headers
            while True:
                line = await reader.readline()
                if line in (b'\r\n', b'\n', b''):
                    break

            body = await reader.read()  # read until EOF
            if status != 200:
                raise RuntimeError(f'HTTP {status}')
            return json.loads(body)
        finally:
            writer.close()
            await writer.wait_closed()

    return await asyncio.wait_for(_request(), timeout)
