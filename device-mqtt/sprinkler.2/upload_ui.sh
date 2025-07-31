#!/bin/bash
ROOT_PROJ="$( cd "$( dirname "$0" )" && pwd )"
ROOT_DIST=$ROOT_PROJ/__dist__
ROOT="$( cd $ROOT_PROJ && cd ../.. && pwd )"

. ./env-device.sh
. ./env-node-js.sh

cd $ROOT_PROJ/web-ui
npm run build
cd dist
rm -R -f $ROOT_DIST
mkdir -p $ROOT_DIST
# ----------------------------------------------------------------------------------------------------------------------
#ampy mkdir web-ui
# ----------------------------------------------------------------------------------------------------------------------
#ampy rm web-ui/favicon.ico.gz
#ampy rm web-ui/index.html.gz
#ampy rm web-ui/assets/index-BNzivdfL.css.gz
#ampy rm web-ui/assets/index-BhSexjEl.js.gz
#ampy rmdir web-ui/assets
# ----------------------------------------------------------------------------------------------------------------------
pui put index.html web-ui/index.html
pui put favicon.ico web-ui/favicon.ico
pui put index.js web-ui/index.js
pui put index.css web-ui/index.css
# ----------------------------------------------------------------------------------------------------------------------