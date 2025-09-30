$ wget https://cdimage.ubuntu.com/releases/25.04/release/ubuntu-25.04-live-server-arm64.iso
$ sudo apt-get update
$ sudo apt-get -y install docker.io
$ sudo docker pull homeassistant/home-assistant:stable
$ mkdir ~/homeassistant
$ cd ~/homeassistant
$ mkdir config
$ sudo docker run -d \
-p 8123:8123 \
--name homeassistant \
--restart unless-stopped \
-e "TZ=Europe/Bucharest" \
-v ~/homeassistant/config:/config \
homeassistant/home-assistant:stable

Install mosquitto
$ sudo apt install -y mosquitto
$ cd /etc/mosquitto/conf.d/
$ sudo mosquitto_passwd -c pass.txt chupy
$ sudo chown mosquitto:mosquitto pass.txt
$ sudo echo -e "listener 1883 0.0.0.0\npassword_file /etc/mosquitto/conf.d/pass.txt\nallow_anonymous false\n" | sudo tee mosquitto.conf
$ sudo chown mosquitto:mosquitto mosquitto.conf



To setup the VTO
$ git clone https://github.com/myhomeiot/DahuaVTO?tab=readme-ov-file

To setup Victron
$ git clone https://github.com/sfstar/hass-victron

To setup Ensy (ventilatie)
$ git clone https://github.com/alexbrasetvik/ensy-home-assistant

mosquitto_sub -u admin -P sigma2000 -h 192.168.100.66 -p 1883 -t 'DahuaVTO/Event/Ring'