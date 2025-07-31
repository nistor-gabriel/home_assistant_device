import re
import sys
from pathlib import Path
from ampy.cli import cli
import subprocess
import shutil
import os

if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw|\.exe)?$', '', sys.argv[0])
    path_src = Path(sys.argv[4]).resolve().absolute()
    path_target = Path(sys.argv[5])
    root_dist = Path(os.environ['dist_path']).resolve().absolute()
    path_dist = root_dist.joinpath(path_target).resolve().absolute()

    path_dist.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path_src, path_dist)

    subprocess.run(["gzip", "-9", path_dist.name], cwd=path_dist.parent)

    sys.argv[4] = str(path_dist) + '.gz'
    sys.argv[5] = str(path_target) + '.gz'
    print('gzip web ui file:', str(path_dist) + '.gz', 'to', str(path_target) + '.gz')
    sys.exit(cli())
