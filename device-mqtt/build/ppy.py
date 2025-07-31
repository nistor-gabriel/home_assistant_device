import re
import sys
import os
from pathlib import Path
from mpy_cross import run
from ampy.cli import cli

if __name__ == '__main__':
    sys.argv[0] = re.sub(r'(-script\.pyw|\.exe)?$', '', sys.argv[0])
    args = [(sys.argv[k], k) for k in range(0, len(sys.argv))]
    args.pop(0)
    in_progress = True
    while in_progress:
        in_progress = False
        for k in range(0, len(args)):
            if args[k][0].startswith("-"):
                args.pop(k)
                args.pop(k)
                in_progress = True
                break
    run(args[1][0]).wait()

    path_src_arg = Path(args[1][0])
    path_src = path_src_arg.resolve().parent.joinpath(path_src_arg.stem + '.mpy').absolute()

    path_target_arg = Path(args[2][0])
    path_target = path_target_arg.parent.joinpath(path_target_arg.stem + '.mpy')
    root_dist = Path(os.environ['dist_path']).resolve().absolute()
    path_dist = root_dist.joinpath(path_target).resolve().absolute()

    path_dist.parent.mkdir(parents=True, exist_ok=True)
    path_src.rename(path_dist)

    sys.argv[args[1][1]] = str(path_dist)
    sys.argv[args[2][1]] = str(path_target)
    print("compiled python file:", path_dist, 'to', str(path_target))
    sys.exit(cli())
