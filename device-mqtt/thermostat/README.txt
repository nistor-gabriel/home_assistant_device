1. When the heating starts:
    1.1 The pump relay starts
    1.2 Will wait for a configurable delay.
    1.3 The heating relay starts.


$ curl -v -u user:user -X PUT -H "Content-Type: application/json" -d '{"ssid":"Over Rainbow","password":"sigma2000revised","dhcp": false,"ip":"192.168.100.77","subnet": "255.255.255.0","dns": "192.168.100.1","gateway":"192.168.100.1"}' http://192.168.100.76/wlan
$ curl -v -u user:user -X PUT -H "Content-Type: application/json" -d '{"ssid":"Over Rainbow","password":"sigma2000revised","dhcp": false,"ip":"192.168.100.77","subnet": "255.255.255.0","dns": "8.8.8.8","gateway":"192.168.100.1"}' http://192.168.100.77/wlan
$ curl -v -u user:user -X PUT -H "Content-Type: application/json" -d '{"ssid":"Over Rainbow","password":"sigma2000revised","dhcp": true}' http://192.168.100.77/wlan


$ curl -v -u user:sigma2000 -X POST --data-binary "@/home/nistor-gabriel/personal/work/casa/casa2/device-py/thermostat/main.py" http://192.168.100.71/fs/main.py
$ curl -v -u user:sigma2000 -X POST --data-binary "@/home/nistor-gabriel/personal/work/casa/casa2/device-py/thermostat/temperature.py" http://192.168.100.71/fs/temperature.py
$ curl -v -u user:sigma2000 -X POST --data-binary "@/home/nistor-gabriel/personal/work/casa/casa2/device-py/thermostat/heating.py" http://192.168.100.71/fs/heating.py
$ curl -v -u user:sigma2000 -X POST --data-binary "@/home/nistor-gabriel/personal/work/casa/casa2/device-py/lib/util.py" http://192.168.100.71/fs/util.py
$ curl -v -u user:sigma2000 -X POST --data-binary "@/home/nistor-gabriel/personal/work/casa/casa2/device-py/thermostat/route_thermostat.py" http://192.168.100.71/fs/route_thermostat.py
$ curl -v -u user:sigma2000 -X POST --data-binary "@/home/nistor-gabriel/personal/work/casa/casa2/device-py/lib/wlan.py" http://192.168.100.71/fs/wlan.py
