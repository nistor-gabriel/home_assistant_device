try:
    import uos as os
except ImportError:
    import os
try:
    import ubinascii
except ImportError:
    # noinspection SpellCheckingInspection
    import binascii as ubinascii
from microdot import Microdot, Request, send_file
from auth import Auth
import hashlib


def install_fs(app: Microdot, auth: Auth):

    @app.get('/fs/<re:.*:path>')
    @auth.with_auth
    def handle_get(_request: Request, path: str):
        path = '/' + path
        try:
            st = os.stat(path)
        except OSError:
            return 'Not Found', 404
        if st[0] & 0x4000:
            files = os.listdir(path)
            files.sort()
            items = list()
            for name in files:
                fpath = '/{}'.format(name) if path == '/' else '{}/{}'.format(path, name)
                st = os.stat(fpath)
                is_dir = True if st[0] & 0x4000 else False
                item = {
                    'name': name,
                    'path': fpath,
                    'isDir': is_dir,
                }
                if not is_dir:
                    item['hash'] = hash_file(fpath)
                items.append(item)
            return {
                'path': path,
                'items': items,
            }
        return send_file(path)

    @app.post('/fs/<re:.*:path>')
    @auth.with_auth
    def handle_post(request: Request, path: str):
        path = '/' + path
        try:
            st = os.stat(path)
            if st[0] & 0x4000:
                return 'Bad Path', 400
        except OSError:
            if not mkdir(path):
                return 'Bad Path', 400
        f = open(path, 'ab' if request.query_string and request.query_string.find('append=true') >= 0 else 'wb')
        f.write(request.body)
        f.close()
        return '', 204

    @app.delete('/fs/<re:.*:path>')
    @auth.with_auth
    def handle_delete(_request: Request, path: str):
        path = '/' + path
        try:
            st = os.stat(path)
        except OSError:
            return 'Not Found', 404
        if st[0] & 0x4000:
            if not rmdir(path):
                return 'Cannot Delete Folder', 400
        else:
            try:
                os.remove(path)
            except OSError:
                return 'Cannot Delete File', 400

    def rmdir(path: str):
        items = os.listdir(path)
        folders = []
        for name in items:
            fpath = '/{}'.format(name) if path == '/' else '{}/{}'.format(path, name)
            st = os.stat(fpath)
            if st[0] & 0x4000:
                folders.append(fpath)
                continue
            os.remove(fpath)

        for folder in folders:
            rmdir(folder)

        os.rmdir(path)
        return True

    def mkdir(path: str):
        items = path.split('/')
        for k in range(2, len(items)):
            cpath = '/'.join(items[0: k])
            try:
                st = os.stat(cpath)
                if not st[0] & 0x4000:
                    return False
            except OSError:
                os.mkdir(cpath)
        return True

    def hash_file(path: str):
        sha1 = hashlib.sha1()
        with open(path, 'rb') as f:
            while True:
                data = f.read(1024)
                if not data:
                    break
                sha1.update(data)
        return ubinascii.hexlify(sha1.digest())
