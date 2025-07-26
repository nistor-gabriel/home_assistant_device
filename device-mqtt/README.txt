$ sudo cat /dev/ttyACM0

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

$ ../venv/bin/ampy -p /dev/ttyACM0 ls
$ ../venv/bin/ampy -p /dev/ttyACM0 rm config

remove all files
$ ../venv/bin/ampy -p /dev/ttyACM0 ls


Microdot
$ git clone https://github.com/miguelgrinberg/microdot.git


Compile to mpy .files.
$ ../venv/bin/mpy-cross microdot/microdot.py
$ ../venv/bin/mpy-cross microdot/__dist__/microdot.py

Running mosquitto
$ mosquitto_sub -t test
$ mosquitto_pub -t test -m "Hello MQTT"