#!/bin/bash
ROOT_PROJ="$( cd "$( dirname "$0" )" && pwd )"
PORT=/dev/ttyACM0
ROOT_DIST=$ROOT_PROJ/__dist__
ROOT_DEV="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && cd ../ && pwd )"
ROOT_DIST=$ROOT_PROJ/__dist__
ROOT_CACHE=$ROOT_PROJ/__cache__
ROOT="$( cd "$ROOT_PROJ" && cd ../ && pwd )"
PYTHON=$ROOT/venv/bin/python3.9

build_web()
{
  NODE_JS="$( cd "$ROOT" && cd ../devarch/node-v22.17.1-linux-x64/bin && pwd )"
  PATH="$NODE_JS:$PATH"
  cd "$ROOT_PROJ/web-ui" || exit 1
  npm run build
  cd dist || exit 1
  chown -R gabriel:gabriel .
}

sync()
{
  cd "$ROOT_PROJ" || exit 1
  rm -R -f "$ROOT_DIST"
  mkdir -p "$ROOT_DIST"
  $PYTHON "$ROOT_DEV/tools/synchronize.py" -d "$ROOT_DIST" remote "$@"
  chown -R gabriel:gabriel "$ROOT_DIST" "$ROOT_CACHE"
}

syncs()
{
  cd "$ROOT_PROJ" || exit 1
  rm -R -f "$ROOT_DIST"
  mkdir -p "$ROOT_DIST"
  $PYTHON "$ROOT_DEV/tools/synchronize.py" -d "$ROOT_DIST" serial -c "$ROOT_CACHE" "$@" $PORT
  chown -R gabriel:gabriel "$ROOT_DIST" "$ROOT_CACHE"
}