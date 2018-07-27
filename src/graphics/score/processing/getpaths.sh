#!/bin/bash

if [ ! -f bravura.out ]; then
    cat Bravura.svg | sed "s/^.*unicode=\"\([^\"]*\)\" horiz-adv-x=\"\([^\"]*\)\" d=\"\([^\"]*\)\".*$/potato \1 \2 \3/" | grep "potato" &> bravura.out
fi

for arg in "$@"
do
    cat bravura.out | grep " &#x$arg; " | sed "s/^potato [^ ]* \([0-9]*\) \(.*\)/{path: \"\2\", adv_x: \1}/"
done







