#!/bin/bash
sudo apt install python3.8 python3.8-venv screen
python3 -m venv ./venv
./venv/bin/python -m pip install adafruit-ampy
./venv/bin/python -m pip install python-minifier