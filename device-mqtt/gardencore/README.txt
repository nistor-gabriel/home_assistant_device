Mosquitto setup
$ sudo apt install -y mosquitto

Configure mosquitto
$ cd /etc/mosquitto/conf.d/
$ sudo mosquitto_passwd -c pass.txt chupy
$ sudo chown mosquitto:mosquitto pass.txt
$ sudo echo -e "listener 1883 0.0.0.0\npassword_file /etc/mosquitto/conf.d/pass.txt\nallow_anonymous false\n" | sudo tee mosquitto.conf
$ sudo chown mosquitto:mosquitto mosquitto.conf
$ sudo service mosquitto restart
$ mosquitto_sub -h 192.168.100.179 -u chupy -P sigma2000 -t homeassistant/#
$ mosquitto_sub -h 192.168.100.179 -u chupy -P sigma2000 -t device/#
$ mosquitto_pub -h 192.168.100.179 -u chupy -P sigma2000 -t device/test -m test

Updated mosquitto connection
$ curl --user user:user -i -d '{"server": "192.168.100.60", "user": "chupy", "password": "sigma2000"}' -H "Content-Type: application/json" -X PUT http://192.168.100.76/mqtt
$ curl --user admin:admin -i -d '{"on": 30}' -H "Content-Type: application/json" -X PUT http://192.168.100.76/switch/1