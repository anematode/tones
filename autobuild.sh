#!/bin/bash

LAST_FILE=""
COMPARATOR=""
PLATFORM="$(uname)"
echo "$PLATFORM"


while true; do
	if [ "$PLATFORM" = "Linux" ]; then
		COMPARATOR="$(find ./src -type f -exec stat -c %Y \{} \; | sort -n -r | sed 1q)"
	else	
    		COMPARATOR="$(find ./src -type f -exec stat -f %m \{} \; | sort -n -r | sed 1q)"
	fi

	if [[ "$LAST_FILE" != "$COMPARATOR" ]]; then
        	echo "File changed, building:"
		./compile.sh
        	LAST_FILE="$COMPARATOR"
    	fi

	sleep .5
done
