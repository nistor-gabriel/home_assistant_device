#!/bin/bash
PORT=/dev/ttyACM0
PYTHON=$ROOT/venv/bin/python

ppy()
{
  dist_path=$ROOT_DIST $PYTHON $ROOT/device-mqtt/build/ppy.py -p $PORT "$@"
}

pjson()
{
  dist_path=$ROOT_DIST $PYTHON $ROOT/device-mqtt/build/pjson.py -p $PORT "$@"
}

pui()
{
  dist_path=$ROOT_DIST $PYTHON $ROOT/device-mqtt/build/pui.py -p $PORT "$@"
}

ampy()
{
  $PYTHON $ROOT/venv/bin/ampy -p $PORT "$@"
}