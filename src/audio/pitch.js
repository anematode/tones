import {KeyboardPitch, KeyboardInterval} from "./keyboardpitch.js";
// Hz is associated with Frequencies
// ratio is associated with Intervals

function _isFrequency(obj) {
    return !!obj.Hz;
}

function _isInterval(obj) {
    return !!obj.ratio;
}

/*
Represents a specific pitch or frequency
*/
class Pitch {
    constructor(value) {
        if (_isFrequency(value)) { // convert from object with an Hz() method, such as this class
            this.value = value.Hz();
        } else if (value instanceof KeyboardPitch) { // convert from keyboard pitch (12tet)
            this.value = value.twelveTETFrequency();
        } else {
            this.value = value; // value is in Hz
        }
    }

    Hz() { // Hz
        return this.value;
    }

    period() { // seconds
        return 1 / this.value;
    }

    add(interval) { // new pitch with an added interval
        return new Pitch(this.value * interval.ratio());
    }

    subtract(note) {
        if (note.ratio) { // subtracting interval
            return new Pitch(this.value / interval.ratio());
        } else { // subtracting a note
            return new Interval(note.value / this.value);
        }
    }
}

function isNumber(n) { // TODO use utils
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/*
Various basic interval units
*/
let intervalUnits = {
    cents : 1.000577789506554859297,
    schismas : 1.001129150390625,
    semitones : 1.059463094359295264562,
    tones: 1.122462048309372981434,
    tritones: 1.414213562373095048802,
    octaves: 2,
    millioctaves: 1.000693387462580632538,
    savarts: 1.002305238077899671915,
    decades: 10,
    merides: 1.016248692870695627673,
    heptamerides: 1.002305238077899671915,
    demiheptamerides: 1.001151955538168876984,
    decamerides: 1.000230285020824752684,
    jots: 1.000023026116026880671,
    syntonic_commas: 81/80,
    pythagorean_commas: 531441 / 524288
};

// Construct interval from an object of the form {cents: "150", semitones: "5", ... }
function getIntervalFromObj(obj) {
    let interval_out = new Interval(1);

    for (let key in intervalUnits) {
        if (obj[key]) {
            interval_out = interval_out.add(intervalUnits[key].stack(obj[key]));
        }
    }

    return interval_out;
}

/*
Interval between two notes
*/
class Interval {
    constructor(arg1, arg2) {
        if (arg1 && arg2) { // difference between two frequencies
            arg1 = new Pitch(arg1);
            arg2 = new Pitch(arg2);

            this.value = arg2.Hz() / arg1.Hz();
        } else if (arg1) {
            if (isNumber(arg1)) {
                this.value = arg1;
            } else if (_isInterval(arg1)) { // duplicate Interval
                this.value = arg1.value;
            } else {
                if (arg1 instanceof KeyboardInterval) { // get ratio from keyboardinterval (12tet)
                    this.value = arg1.ratio();
                } else { // get from object
                    this.value = getIntervalFromObj(arg1).value;
                }
            }
        }
    }

    reverse() { // negate the interval
        return new Interval(1 / this.value);
    }

    subtract(interval, times = 1) { // result of subtracting interval * times from this
        return new Interval(this.value / interval.stack(times).value);
    }

    add(interval, times = 1) { // result of adding interval * times from this
        return new Interval(this.value * interval.stack(times).value);
    }

    divideByInterval(interval) { // how much interval can fit in this
        return Math.log(this.value, interval.value);
    }

    divide(number) { // size of each piece if divided into number intervals
        return new Interval(Math.pow(this.value, 1 / number));
    }

    stack(times = 1) { // stacking the interval some number of times
        return new Interval(Math.pow(this.value, times));
    }

    ratio() { // frequency ratio
        return this.value;
    }
}

for (let key in intervalUnits) { // convert intervalUnits to Interval objects
    intervalUnits[key] = new Interval(intervalUnits[key]);
}

function makePitch(...args) { // factory function for pitch
    return new Pitch(...args);
}

function makeInterval(...args) { // factory function for intervals
    return new Interval(...args);
}

let TwelveTETIntervals = { // Basic 12tet intervals
    unison: 1,
    minor_second: {cents: 100},
    semitone: {cents : 100},
    major_second: {cents : 200},
    tone: {cents: 200},
    whole_tone : {cents: 200},
    minor_third: {cents: 300},
    major_third: {cents: 400},
    perfect_fourth: {cents: 500},
    tritone: {cents: 600},
    perfect_fifth: {cents: 700},
    minor_sixth : {cents: 800},
    major_sixth : {cents: 900},
    minor_seventh: {cents: 1000},
    major_seventh: {cents: 1100},
    octave: 2
};

for (let key in TwelveTETIntervals) {
    TwelveTETIntervals[key] = new Interval(TwelveTETIntervals[key]);
}

// TODO Object.freeze on twelvetetintervals and intervalunits

export { Pitch, Interval, makePitch, makeInterval, TwelveTETIntervals, intervalUnits }
