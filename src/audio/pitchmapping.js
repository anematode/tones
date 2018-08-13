import * as utils from "../utils.js";

import {KeyboardPitch} from "./keyboardpitch.js";
import {Pitch, Interval} from "./pitch.js";

class PitchMapping {
    constructor(pitchDict, pitchMap = (x => x), kPitchMap = (x => x)) {
        this.dict = pitchDict;
        this.pitchMap = pitchMap; // Changing a frequency
        this.kPitchMap = kPitchMap; // Changing the nominal meaning of a keyboard pitch
    }

    transform(keyboardPitch) {
        return this.pitchMap(this.dict[this.kPitchMap(utils.select(keyboardPitch.value, keyboardPitch))]);
    }

    dictApply(func) {
        for (let key in this.dict) {
            this.dict[key] = func(this.dict[key]);
        }
    }
}

let twelveTETDict = {};

for (let i = 0; i < 128; i++) {
    twelveTETDict[i] = (new KeyboardPitch(i)).twelveTETFrequency();
}

let twelveTETMapping = new PitchMapping(twelveTETDict);

let PitchMappings = {
    ET12 : twelveTETMapping
};

function mod(n, m) {
    return ((n % m) + m) % m;
}

function pitchMappingFromScale(scale, baseNote = Tones.KeyboardPitches.C4, baseFrequency) {
    // scale is array of intervals or single arguments to an interval constructor

    scale = scale.map(f => new Interval(f));

    let scale_length = scale.length;
    let scale_repeating_interval = scale[scale_length - 1];
    baseFrequency = new Pitch(baseFrequency || baseNote.twelveTETFrequency());

    let dict = {};

    let scaleRepeats = Math.ceil((baseNote.value + 1) / scale_length);
    let bottom = baseNote.value - scaleRepeats * scale_length;

    for (let offset = bottom, scaleR = -scaleRepeats; offset < 129; offset += scale_length, scaleR++) {
        for (let i = offset + 1, j = 0; j < scale_length; i++, j++) {
            dict[i] = baseFrequency.add(scale[j]).add(scale_repeating_interval.stack(scaleR)).Hz();
        }
    }

    return new PitchMapping(dict);
}

export { PitchMapping, PitchMappings, pitchMappingFromScale };