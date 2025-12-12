#!/bin/bash

# shellcheck disable=SC2034
FULL=true

# ----------------------------------------------------------------------------------------------------------------------

. ./gardencore/synchronize.sh

. ./sprinkler.2/synchronize.sh

. ./sprinkler.3/synchronize.sh

. ./sprinkler.5/synchronize.sh

. ./thermostat/synchronize.sh