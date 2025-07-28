To build the uf2:
$ sudo apt update
$ sudo apt install cmake gcc-arm-none-eabi libnewlib-arm-none-eabi build-essential
$ git clone https://github.com/micropython/micropython.git
$ make -C mpy-cross/ -j 16
$ make -C ports/rp2 BOARD=RPI_PICO_W clean
$ make -C ports/rp2 BOARD=RPI_PICO_W submodules
$ make -C ports/rp2 BOARD=RPI_PICO_W -j 16
Then ports/rp2/build-RPI_PICO_W is created. There you can find the firmware.uf2


Build RPI_PICO2_W

$ make -C mpy-cross/ -j 16
$ make -C ports/rp2 BOARD=RPI_PICO2_W clean
$ make -C ports/rp2 BOARD=RPI_PICO2_W submodules
$ make -C ports/rp2 BOARD=RPI_PICO2_W -j 16

Getting the version, on the RP mpython
import sys
sys.implementation