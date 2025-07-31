from microdot import Microdot, Request, send_file
import asyncio
import os

app = Microdot()
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

folder: str = './public/'


@app.get('/<re:.*:path>')
def handle_get_api(_request: Request, path: str):
    if not path:
        path = 'index.html'
    path = folder + path + '.gz'
    try:
        st = os.stat(path)
    except OSError:
        return 'Not Found', 404
    if st[0] & 0x4000:
        return 'Not Found', 404
    return send_file(path, compressed=True, max_age=31536000)


if __name__ == '__main__':
    loop.run_until_complete(app.start_server(port=8080, debug=False))
    loop.close()
