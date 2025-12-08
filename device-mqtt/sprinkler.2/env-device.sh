#!/bin/bash
PORT=/dev/ttyACM0
PYTHON=$ROOT/venv/bin/python3.9

ppy()
{
  dist_path=$ROOT_DIST $PYTHON $ROOT/build/ppy.py -p $PORT "$@"
}

pjson()
{
  dist_path=$ROOT_DIST $PYTHON $ROOT/build/pjson.py -p $PORT "$@"
}

pui()
{
  dist_path=$ROOT_DIST $PYTHON $ROOT/build/pui.py -p $PORT "$@"
}

ampy()
{
  $PYTHON $ROOT/venv/bin/ampy -p $PORT "$@"
}