import re
import json
import sys
from pathlib import Path
from ampy.cli import cli

if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw|\.exe)?$', '', sys.argv[0])
    path_src = Path(sys.argv[4]).resolve().absolute()

    path_root = Path('.').resolve().absolute()
    path_target = Path(sys.argv[5])
    path_dist = path_root.joinpath('__dist__').joinpath(path_target).resolve().absolute()

    path_dist.parent.mkdir(parents=True, exist_ok=True)

    with open(path_src) as json_file:
        data = json.load(json_file)

    with open(path_dist, 'w') as json_file:
        json.dump(data, json_file, separators=(',', ':'))

    sys.argv[4] = str(path_dist)
    sys.argv[5] = str(path_target)
    print("minified json file:", path_dist, 'to', str(path_target))
    sys.exit(cli())
