#!/bin/bash
ROOT_PROJ="$( cd "$( dirname "$0" )" && pwd )"
ROOT_DEV="$( cd "$ROOT_PROJ" && cd ../ && pwd )"
ROOT_DIST=$ROOT_PROJ/__dist__
ROOT_CACHE=$ROOT_PROJ/__cache__
ROOT="$( cd "$ROOT_PROJ" && cd ../.. && pwd )"
PYTHON=$ROOT/venv/bin/python

# ----------------------------------------------------------------------------------------------------------------------

. ./env-node-js.sh

cd "$ROOT_PROJ/web-ui" || exit 1
#npm run build
cd dist || exit 1
chown -R nistor-gabriel:nistor-gabriel .
rm -R -f "$ROOT_DIST"
mkdir -p "$ROOT_DIST"

# ----------------------------------------------------------------------------------------------------------------------

cd "$ROOT_PROJ" || exit 1

#$PYTHON "$ROOT_DEV/tools/synchronize.py" -d "$ROOT_DIST" remote -u admin -p sigma2000 192.168.100.80

$PYTHON "$ROOT_DEV/tools/synchronize.py" -d "$ROOT_DIST" serial -c "$ROOT_CACHE" --dry true /dev/ttyACM0

chown -R nistor-gabriel:nistor-gabriel "$ROOT_DIST"
if [ -d "$ROOT_CACHE" ]; then
  chown -R nistor-gabriel:nistor-gabriel "$ROOT_CACHE"
fi