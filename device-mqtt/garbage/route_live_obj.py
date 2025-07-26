from microdot import Microdot, Request
from live_obj import Context
from auth import Auth


def install_live_obj(app: Microdot, auth: Auth, ctx: Context):

    def build_model(path: str):
        coll = ctx.collections.get(path)
        if coll:
            return {
                'items': [item.clone_props() for item in coll]
            }
        obj = ctx.objects.get(path)
        if obj:
            return obj.clone_props()

    @app.get('/<re:.*:path>')
    @auth.with_auth
    def handle_get_live_obj(_request: Request, path: str):
        if not path.startswith('/'):
            path = '/' + path
        # print("received path:", path)
        obj = build_model(path)
        if not obj:
            # print("no live object for path:", path)
            return 404, ''

        # print("found live object for path:", path)
        return obj
