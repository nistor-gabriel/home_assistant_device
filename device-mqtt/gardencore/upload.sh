#!/bin/bash
ROOT_PROJ="$( cd "$( dirname "$0" )" && pwd )"
ROOT_DIST=$ROOT_PROJ/__dist__
ROOT="$( cd $ROOT_PROJ && cd ../.. && pwd )"

. ./env-device.sh

#ppy put ../vendor/microdot.py microdot.py
#ppy put ../vendor/umqttsimple.py umqttsimple.py
## ----------------------------------------------------------------------------------------------------------------------
#ppy put ../lib/config.py config.py
#ppy put ../lib/wlan.py wlan.py
#ppy put ../lib/auth.py auth.py
#ppy put ../lib/mqtt_repo.py mqtt_repo.py
#ppy put ../lib/util.py util.py
#ppy put ../lib/device.py device.py
#ppy put ../lib/trigger.py trigger.py
#ppy put ../lib/trigger_button_toggle.py trigger_button_toggle.py
#ppy put ../lib/blinker.py blinker.py
#ppy put ../lib/switch.py switch.py
#ampy put ../lib/main.py main.py
## ----------------------------------------------------------------------------------------------------------------------
#ppy put ../lib/route_api.py route_api.py
#ppy put ../lib/route_stats.py route_stats.py
#ppy put ../lib/route_mqtt.py route_mqtt.py
#ppy put ../lib/route_fs.py route_fs.py
#ppy put ../lib/route_wlan.py route_wlan.py
#ppy put ../lib/route_ui.py route_ui.py
#ppy put ../lib/route_switch.py route_switch.py
## ----------------------------------------------------------------------------------------------------------------------
#pjson put ../lib/stats_config.json stats_config.json
#pjson put ../lib/wlan_config.json wlan_config.json
#pjson put ../lib/switch_config.json switch_config.json
#pjson put ../lib/switch_stats_config.json switch_stats_config.json
#pjson put ../lib/device_template.json device_template.json
#pjson put ../lib/device_config.json device_config.json
#pjson put ../wlan_config.json config.json
## ----------------------------------------------------------------------------------------------------------------------
ppy put controller.py controller.py
ppy put route_controller.py route_controller.py
ppy put setup.py setup.py
## ----------------------------------------------------------------------------------------------------------------------
#ampy rm sprinkler.mpy