# React + TypeScript + Vite

First Setup the devarch

$ mkdir devarch
$ cd devarch 
$ wget https://nodejs.org/dist/v22.17.1/node-v22.17.1-linux-x64.tar.xz
$ tar -xf node-v22.17.1-linux-x64.tar.xz
$ cd ..
$ . ./app-env.sh


Install screen
$ sudo apt install screen

Use screen
$ sudo screen /dev/ttyACM0
to reset CTRL+D to stop CTRL+A and then K

Install ampy
$ sudo apt install python3-venv
Create venv:
$ python3 -m venv venv
Activate venv:
$ source venv/bin/activate

Install adafruit
$ pip3 install adafruit-ampy
Install micropython compiler
$ pip3 install mpy-cross
$ deactivate

Enable ssh:
$ eval "$(ssh-agent -s)"
