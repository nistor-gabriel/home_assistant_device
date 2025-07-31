try:
    import uos as os
except ImportError:
    import os
from microdot import Microdot, Request, send_file
from auth import Auth


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
                items.append({
                    'name': name,
                    'path': fpath,
                    'isDir': True if st[0] & 0x4000 else False,
                })
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
        f = open(path, 'w')
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
