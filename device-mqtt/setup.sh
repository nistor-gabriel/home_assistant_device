#!/bin/bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.9 python3.9-venv screen
python3.9 -m venv ./venv
./venv/bin/python3.9 -m pip install adafruit-ampy
./venv/bin/python3.9 -m pip install python-minifier
./venv/bin/python3.9 -m pip install pyyaml
./venv/bin/python3.9 -m pip install requests
./venv/bin/python3.9 -m pip install mpy-cross