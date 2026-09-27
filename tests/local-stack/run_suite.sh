#!/bin/bash
su postgres -c "psql -q -d sbtest -c \"set storage.allow_delete_query = 'true'; delete from storage.objects; delete from auth.users;\"" && rm -rf /tmp/sb/storage-data/* /tmp/sb/mail/*
cd /tmp && timeout 280 python3 "$1" 2>&1 | grep -E "FAIL|checks passed|Error" > "/tmp/result-$1.txt"; cat "/tmp/result-$1.txt"
