#!/bin/bash
. ../env.sh

#ppy put ../vendor/microdot.py microdot.py
#ppy put ../vendor/umqttsimple.py umqttsimple.py
## ----------------------------------------------------------------------------------------------------------------------
#ppy put ../lib/config.py config.py
#ppy put ../lib/wlan.py wlan.py
#ppy put ../lib/auth.py auth.py
#ppy put ../lib/mqtt_repo.py mqtt_repo.py
#ppy put ../lib/util.py util.py
ppy put ../lib/device.py device.py
## ----------------------------------------------------------------------------------------------------------------------
#ppy put ../lib/route_api.py route_api.py
#ppy put ../lib/route_stats.py route_stats.py
#ppy put ../lib/route_mqtt.py route_mqtt.py
#ppy put ../lib/route_fs.py route_fs.py
## ----------------------------------------------------------------------------------------------------------------------
#pjson put ../lib/stats_config.json stats_config.json
#pjson put ../lib/device_template.json device_template.json
#pjson put ../wlan_config.json config.json
## ----------------------------------------------------------------------------------------------------------------------
#ppy put sprinkler.py sprinkler.py
#ampy put main.py main.py
## ----------------------------------------------------------------------------------------------------------------------
#ampy rm stats.mpy
#ampy rm api_config.json
#ampy rm device_config.json