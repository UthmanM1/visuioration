#!/bin/bash
cd /tmp/sb
(pg_ctlcluster 16 main start 2>/dev/null || service postgresql start) >/dev/null 2>&1
sleep 2
set -a; . ./gotrue.env; set +a
setsid nohup ./auth > gotrue.log 2>&1 < /dev/null &
setsid nohup ./postgrest pgrst.conf > pgrst.log 2>&1 < /dev/null &
setsid nohup node proxy.js > proxy.log 2>&1 < /dev/null &
setsid nohup python3 smtp_sink.py > smtp.log 2>&1 < /dev/null &
cd /tmp/sb/storage
env PATH=/tmp/sb/node24/node_modules/node-linux-x64/bin:$PATH bash -c 'set -a; . ../storage.env; set +a; exec setsid nohup npx tsx src/start/server.ts > ../storage.log 2>&1 < /dev/null' &
