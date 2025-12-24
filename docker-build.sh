#!/usr/bin/env bash
set -euo pipefail

# unset DOCKER_HOST for this script's environment
unset DOCKER_HOST
docker context use default
mkdir -p releases
TAG=midnight-lizard:$(date +"%Y-%m-%d--%H-%M-%S")
docker build -t $TAG .
docker run --rm -it -v $(pwd -W)/releases:/build/releases $TAG