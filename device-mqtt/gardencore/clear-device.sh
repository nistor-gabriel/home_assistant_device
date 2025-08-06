#!/bin/bash
ROOT="$( cd "$( dirname "$0" )" && cd ../.. && pwd )"

. ./env-device.sh

#ampy rmdir /microdot
ampy ls | while read -r line; do ampy rm $line; done