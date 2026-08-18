#!/bin/sh
set -e
export PRISMA_HIDE_UPDATE_MESSAGE=1
./node_modules/.bin/prisma migrate deploy
exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port "${PORT:-3000}"
