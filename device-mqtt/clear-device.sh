#!/bin/bash
. ./env.sh

#ampy rmdir /microdot
ampy ls | while read -r line; do ampy rm $line; done