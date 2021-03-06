import { Interval } from "./pitch.js";

// A scale is just an array of intervals, starting on the first pitch above the unison and ending with the repeating note, usually the octave

const Scales = {
    ET12: [
        {cents: 100},
        {cents: 200},
        {cents: 300},
        {cents: 400},
        {cents: 500},
        {cents: 600},
        {cents: 700},
        {cents: 800},
        {cents: 900},
        {cents: 1000},
        {cents: 1100},
        2/1,
    ]
};

function makeET(num) {
    if (num < 2) {
        throw new Error("Too small subdivision of octave");
    }

    let scale = [];

    for (let i = 1; i <= num; i++) {
        scale.push(new Interval({cents: i * 1200 / num}));
    }

    return scale;
}

for (let scaleKey in Scales) {
    let scale = Scales[scaleKey];

    for (let i = 0; i < scale.length; i++) {
        scale[i] = new Interval(scale[i]);
    }
}

export { Scales };