#!/bin/bash
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

upld()
{
  curl -v -u user:sigma2000 -X POST --data-binary "@$(readlink -f $1)" http://192.168.100.71/fs/$2
}

#upld ../lib/microdot/__init__.py microdot/__init__.py
#upld ../lib/microdot/microdot.py microdot/microdot.py
#upld ../lib/microdot/websocket.py microdot/websocket.py
#upld ../lib/microdot/helpers.py microdot/helpers.py
#upld ../lib/config.py config.py
upld ../lib/wlan.py wlan.py
#upld ../lib/auth.py auth.py
#upld ../lib/event.py event.py
#upld ../lib/device.py device.py
#upld ../lib/temperature_sensor.py temperature_sensor.py
upld ../lib/util.py util.py
#upld ../lib/stats.py stats.py
upld ../lib/route_api.py route_api.py
upld ../lib/route_wlan.py route_wlan.py
#upld ../lib/route_fs.py route_fs.py
#upld ../lib/route_stats.py route_stats.py
#upld ../lib/route_event.py route_event.py
#upld heating.py heating.py
#upld controller.py controller.py
#upld temperature.py temperature.py
#upld route_thermostat.py route_thermostat.py
upld main.py main.py