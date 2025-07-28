from microdot import Microdot, Request, send_file
import asyncio

app = Microdot()
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)


@app.get('/index.html')
async def serve_index(_request: Request):
    return send_file('public/index.html')


@app.get('/assets/index-k8s8ycNW.css')
async def serve_index(_request: Request):
    return send_file('public/assets/index-k8s8ycNW.css', compressed=True)


@app.get('/assets/index-RTjFbtjn.js')
async def serve_index(_request: Request):
    return send_file('public/assets/index-RTjFbtjn.js', compressed=True, max_age=31536000)
    # return open('public/assets/index-RTjFbtjn.js'), {'Content-Encoding': 'gzip', 'Content-Type': 'application/javascript'}


@app.get('/assets/react-h3aPdYU7.svg')
async def serve_index(_request: Request):
    return send_file('public/assets/react-h3aPdYU7.svg', content_type='image/svg+xml')


@app.get('/vite.svg')
async def serve_index(_request: Request):
    return send_file('public/vite.svg', content_type='image/svg+xml', compressed=True)


loop.run_until_complete(app.start_server(port=8080, debug=False))
loop.close()

# class Serv(BaseHTTPRequestHandler):
#
#     def do_GET(self):
#         if self.path == '/index.html':
#             self.path = '/public/index.html'
#         if self.path == '/assets/index-k8s8ycNW.css':
#             self.path = '/public/assets/index-k8s8ycNW.css'
#         if self.path == '/assets/index-RTjFbtjn.js':
#             self.path = '/public/assets/index-RTjFbtjn.js'
#         if self.path == '/assets/react-h3aPdYU7.svg':
#             self.path = '/public/assets/react-h3aPdYU7.svg'
#         if self.path == '/vite.svg':
#             self.path = '/public/vite.svg'
#         try:
#             print('----------------------', self.path[1:])
#             file_to_open = open(self.path[1:]).read()
#             self.send_response(200)
#         except:
#             file_to_open = "File not found"
#             self.send_response(404)
#         self.end_headers()
#         self.wfile.write(bytes(file_to_open, 'utf-8'))
#
#
# httpd = HTTPServer(('localhost', 8080), Serv)
# httpd.serve_forever()
