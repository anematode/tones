#!/bin/bash

LAST_FILE=""
COMPARATOR=""

while true; do
    COMPARATOR="$(find ./src -type f -exec stat -f %m \{} \; | sort -n -r | sed 1q)"

    if [[ "$LAST_FILE" != "$COMPARATOR" ]]; then
        echo "File changed, building:"
        sh compile
        LAST_FILE="$COMPARATOR"
    fi

    sleep .5
done
