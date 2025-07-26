#!/bin/bash
PORT=/dev/ttyACM0
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

ppy()
{
  $ROOT/venv/bin/python  $ROOT/build/ppy.py -p $PORT "$@"
}

pjson()
{
  $ROOT/venv/bin/python  $ROOT/build/pjson.py -p $PORT "$@"
}

ampy()
{
  $ROOT/venv/bin/ampy -p $PORT "$@"
}