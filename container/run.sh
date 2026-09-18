#!/bin/bash

key=`echo $OPENROUTER_API_KEY`

podman run -it --network=host \
  --systemd=always \
  -e OPENROUTER_API_KEY=$key \
  -v .:/root/tau \
  -w /root/tau \
  --name tau \
  --replace \
  tau
