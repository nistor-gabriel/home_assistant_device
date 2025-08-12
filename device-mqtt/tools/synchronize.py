import yaml
import subprocess
import json
import shutil
import typing as typ
import requests
from pathlib import Path
from mpy_cross import run
import hashlib
import binascii
import click
import base64
import re
import posixpath
from ampy import pyboard, files as afiles

MAX_DATA_SIZE = 8 * 1024


class Context(typ.TypedDict, total=False):
    port: str
    host: str
    authorization: str
    dist: Path
    cache: Path
    resources: typ.List[typ.Dict]
    has_changed: bool
    has_error: bool
    board: pyboard.Pyboard
    board_files: afiles.Files
    exclude_reg: typ.List[typ.Pattern]
    only_reg: typ.List[typ.Pattern]


ctx: Context = {}


def add_raw(path_src: Path, path_dst: Path, root_dist: Path, files: typ.List[str]):
    path_dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path_src, path_dst)
    files.append(str(path_dst.relative_to(root_dist)))


def add_py(src: str, path_src: Path, path_dst: Path, root_dist: Path, files: typ.List[str]):
    path_dst_mpy = path_dst.parent.joinpath(path_dst.stem + '.mpy').absolute()
    path_src_mpy = path_src.parent.joinpath(path_src.stem + '.mpy').absolute()
    path_dst.parent.mkdir(parents=True, exist_ok=True)
    run(src).wait()
    path_src_mpy.rename(path_dst_mpy)
    files.append(str(path_dst_mpy.relative_to(root_dist)))


def add_json(path_src: Path, path_dst: Path, root_dist: Path, files: typ.List[str]):
    with open(path_src) as json_file:
        data = json.load(json_file)
    with open(path_dst, 'w') as json_file:
        json.dump(data, json_file, separators=(',', ':'))
    files.append(str(path_dst.relative_to(root_dist)))


def add_gzip(path_src: Path, path_dst: Path, root_dist: Path, files: typ.List[str]):
    path_dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path_src, path_dst)

    subprocess.run(['gzip', '-9', '-n', path_dst.name], cwd=path_dst.parent)
    files.append(str(path_dst.relative_to(root_dist)) + '.gz')


def hash_file(path):
    sha1 = hashlib.sha1()
    try:
        with open(path, 'rb') as f:
            while True:
                data = f.read(1024)
                if not data:
                    break
                sha1.update(data)
        return binascii.hexlify(sha1.digest()).decode()
    except FileNotFoundError:
        return None


def collect_local_resources():
    file_names = []
    files = []

    for entry in ctx['resources']:
        dst = entry['dst']
        src = entry.get('src')
        if not src:
            src = dst
        path_src = Path(src).resolve().absolute()
        type_ = entry.get('type')
        ignore_ = entry.get('ignore')
        if type_ == 'raw':
            if ignore_:
                files.append({'file': posixpath.normpath(dst), 'ignore': True, 'hash': ''})
            else:
                add_raw(path_src, ctx['dist'].joinpath(dst).resolve().absolute(), ctx['dist'], file_names)
        elif type_ == 'gzip':
            if ignore_:
                files.append({'file': posixpath.normpath(dst + '.gz'), 'ignore': True, 'hash': ''})
            else:
                add_gzip(path_src, ctx['dist'].joinpath(dst).resolve().absolute(), ctx['dist'], file_names)
        elif path_src.name.endswith('.py'):
            if ignore_:
                files.append({'file': posixpath.normpath(dst.rstrip('.py') + '.mpy'), 'ignore': True, 'hash': ''})
            else:
                add_py(src, path_src, ctx['dist'].joinpath(dst).resolve().absolute(), ctx['dist'], file_names)
        elif path_src.name.endswith('.json'):
            if ignore_:
                files.append({'file': posixpath.normpath(dst), 'ignore': True, 'hash': ''})
            else:
                add_json(path_src, ctx['dist'].joinpath(dst).resolve().absolute(), ctx['dist'], file_names)

    for file in file_names:
        files.append({'file': posixpath.normpath(file), 'hash': hash_file(ctx['dist'].joinpath(file))})

    return files


def collect_remote_resources():
    files = []
    tails = ['']
    while len(tails):
        tail = tails.pop(0)
        path = ctx['host'] + '/fs/' + tail
        response = requests.get(path, headers={'authorization': ctx['authorization']})
        if not response.ok:
            raise Exception('Failed to get a response for "' + path + '" with code ' + str(response.status_code))
        for entry in response.json()['items']:
            if entry['isDir']:
                tails.append(entry['path'][1:])
            else:
                files.append({'file': entry['path'][1:], 'hash': entry.get('hash')})
    return files


def collect_serial_resources():
    files = []

    cache = ctx.get('cache')
    for f in ctx['board_files'].ls('/', long_format=False, recursive=True):
        name = f[1:]
        if cache:
            cached_file = cache.joinpath(name)
            file_hash = hash_file(cached_file)
            if not file_hash:
                cached_file.parent.mkdir(parents=True, exist_ok=True)
                contents = ctx['board_files'].get(f)
                cached_file.write_bytes(contents)
            file_hash = hash_file(cached_file)
            files.append({'file': name, 'hash': file_hash})
        else:
            files.append({'file': name, 'hash': ''})
    return files


def update_serial(to_update: typ.List[typ.Dict]):
    for item in to_update:
        if is_excluded(item['file']):
            print('excluded file', item['file'])
            continue
        print('updating file', item['file'])
        remote_parent = posixpath.normpath(posixpath.join(item['file'], '../'))
        try:
            # Create remote parent directory.
            ctx['board_files'].mkdir(remote_parent)
        except afiles.DirectoryExistsError:
            # Ignore errors for directories that already exist.
            pass

        with open(ctx['dist'].joinpath(item['file']), 'rb') as f:
            ctx['board_files'].put(item['file'], f.read())
            ctx['has_changed'] = True
        if ctx.get('cache'):
            ctx['cache'].joinpath(item['file']).unlink(missing_ok=True)


def remove_serial(to_remove: typ.List[typ.Dict]):
    for item in to_remove:
        if is_excluded(item['file']):
            print('excluded file', item['file'])
            continue
        print('removing file', item['file'])
        ctx['board_files'].rm(item['file'])
        ctx['has_changed'] = True
        if ctx.get('cache'):
            ctx['cache'].joinpath(item['file']).unlink(missing_ok=True)


def is_excluded(file: str):
    for reg in ctx['exclude_reg']:
        if reg.match(file):
            return True
    for reg in ctx['only_reg']:
        if not reg.match(file):
            return True
    return False


# noinspection PyShadowingNames
def compare(local_files: typ.List[typ.Dict], remote_files: typ.List[typ.Dict]):
    local_files.sort(key=lambda item: item['file'])
    remote_files.sort(key=lambda item: item['file'])
    to_remove = []
    to_update = []
    for remote in remote_files:
        local = next((item for item in local_files if item['file'] == remote['file']), None)
        if not local:
            to_remove.append(remote)
        elif remote['hash'] != local['hash']:
            if not local.get('ignore'):
                to_update.append(local)

    for local in local_files:
        remote = next((item for item in remote_files if item['file'] == local['file']), None)
        if not remote:
            if not local.get('ignore'):
                to_update.append(local)

    return to_update, to_remove


def update(to_update: typ.List[typ.Dict]):
    for item in to_update:
        if is_excluded(item['file']):
            print('excluded file', item['file'])
            continue
        append = False
        with open(ctx['dist'].joinpath(item['file']), 'rb') as f:
            size = 0
            while True:
                data = f.read(MAX_DATA_SIZE)
                if not data:
                    break
                size += len(data)
                response = requests.post(ctx['host'] + '/fs/' + item['file'] + ('?append=true' if append else ''),
                                         data, headers={
                        'authorization': ctx['authorization'],
                        'content-type': 'application/octet-stream'
                    })
                if not response.ok:
                    print('ERROR: cannot synchronize', item['file'], response.status_code, response.text)
                    ctx['has_error'] = True
                    ctx['has_changed'] = True
                elif append:
                    print('appended file', item['file'], size, response.text)
                    ctx['has_changed'] = True
                else:
                    print('updated file', item['file'], size, response.text)
                    ctx['has_changed'] = True
                    append = True


def remove(to_remove: typ.List[typ.Dict]):
    for item in to_remove:
        if is_excluded(item['file']):
            print('excluded file', item['file'])
            continue
        response = requests.delete(ctx['host'] + '/fs/' + item['file'],
                                   headers={'authorization': ctx['authorization']})
        if not response.ok:
            print('ERROR: cannot remove', item['file'], response.status_code, response.text)
            ctx['has_error'] = True
            ctx['has_changed'] = True
        else:
            print('removed file', item['file'], response.text)
            ctx['has_changed'] = True


@click.group()
@click.option(
    '--dist',
    '-d',
    required=True,
    type=click.STRING,
    help='The distribution folder.',

)
@click.option(
    '--resources',
    '-r',
    default='resources.yaml',
    type=click.File('r'),
    help='The yaml file with the resources to be synchronized.',
)
@click.option(
    '--exclude',
    '-e',
    type=click.STRING,
    help='The pattern to exclude files by.',
    required=False,
    multiple=True,
)
@click.option(
    '--only',
    '-o',
    type=click.STRING,
    help='The pattern to only synchronize files by.',
    required=False,
    multiple=True,
)
@click.version_option()
def cli(dist, resources, exclude, only):
    ctx['dist'] = Path(dist).resolve().absolute()
    ctx['has_changed'] = False
    ctx['has_error'] = False
    ctx['exclude_reg'] = [re.compile(reg.replace('*', '[^/]*')) for reg in exclude]
    ctx['only_reg'] = [re.compile(reg.replace('*', '[^/]*')) for reg in only]

    resc = yaml.safe_load(resources)
    for item in resc:
        if item.get('ignore'):
            continue
        if is_excluded(item['dst']):
            print('excluded file', item['dst'])
            item['ignore'] = True

    ctx['resources'] = resc


@cli.command()
@click.argument('ip', type=click.STRING, required=True)
@click.option(
    '--user',
    '-u',
    default='admin',
    type=click.STRING,
    help='The user name used on the remote device.',
)
@click.option(
    '--password',
    '-p',
    default='admin',
    type=click.STRING,
    help='The password name used on the remote device.',
)
@click.option(
    '--dry',
    '-r',
    default=False,
    type=click.BOOL,
    help='Just report the changes but without actually making them.',
)
def remote(ip, user, password, dry):
    ctx['host'] = 'http://' + ip
    ctx['authorization'] = 'Basic ' + (base64.b64encode((user + ':' + password).encode("ascii"))).decode()

    local_files = collect_local_resources()
    remote_files = collect_remote_resources()

    to_update, to_remove = compare(local_files, remote_files)
    if dry:
        for item in to_update:
            if is_excluded(item['file']):
                print('excluded file', item['file'])
                continue
            print('updating file', item['file'])
        for item in to_remove:
            if is_excluded(item['file']):
                print('excluded file', item['file'])
                continue
            print('removing file', item['file'])
        if not len(to_update) or not len(to_remove):
            print('Device is up to date, no updates required')
    else:
        update(to_update)
        remove(to_remove)
        if not ctx['has_changed']:
            print('Device is up to date, no updates required')
        elif ctx['has_error']:
            print('Done with errors, pleas try again!')
        else:
            print('All Done, rebooting device!')
            requests.delete('http://' + ip + '/api', headers={'authorization': ctx['authorization']})


@cli.command()
@click.argument('port', type=click.STRING, required=True)
@click.option(
    '--cache',
    '-c',
    type=click.STRING,
    help='The folder where the device files will be dumped in order to be handled',
)
@click.option(
    '--dry',
    '-r',
    default=False,
    type=click.BOOL,
    help='Just report the changes but without actually making them.',
)
def serial(port, cache, dry):
    board = pyboard.Pyboard(port, baudrate=115200, rawdelay=0)
    board_files = afiles.Files(board)
    ctx['port'] = port
    ctx['board'] = board
    ctx['board_files'] = board_files
    if cache:
        ctx['cache'] = Path(cache).joinpath(port[1:].replace('/', '-')).resolve().absolute()

    local_files = collect_local_resources()
    serial_files = collect_serial_resources()

    to_update, to_remove = compare(local_files, serial_files)
    if dry:
        for item in to_update:
            if is_excluded(item['file']):
                print('excluded file', item['file'])
                continue
            print('updating file', item['file'])
        for item in to_remove:
            if is_excluded(item['file']):
                print('excluded file', item['file'])
                continue
            print('removing file', item['file'])
        if not len(to_update) or not len(to_remove):
            print('Device is up to date, no updates required')
    else:
        update_serial(to_update)
        remove_serial(to_remove)
        if not ctx['has_changed']:
            print('Device is up to date, no updates required')
        elif ctx['has_error']:
            print('Done with errors, pleas try again!')
        else:
            print('All Done, rebooting device!')

    board.enter_raw_repl()
    board.exec_raw_no_follow('''
import machine
machine.reset()''')
    board.exit_raw_repl()


if __name__ == '__main__':
    cli()
