// Terminology

// 0 -> C-1, 1 -> C#-1, etc., like MIDI in scientific pitch notation
// Black notes are named as a sharp by default
// Sharp -> #, Double sharp -> ##, Flat -> b, Double flat -> bb


const octave_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];

function mod(n, m) {
    return ((n % m) + m) % m;
}

function noteToName(note) {
    return octave_names[mod(note, 12)] + String(parseInt(note / 12) - 1);
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

const letter_nums = {
    "C": 0,
    "D": 2,
    "E": 4,
    "F": 5,
    "G": 7,
    "A": 9,
    "B": 11
};

const accidental_offsets = {
    "#": 1,
    "##": 2,
    "b": -1,
    "bb": -2
};

function nameToNote(name) {
    //                letter   accidental  -?  number
    let groups = /^([ABCDEFG])(#|##|B|BB)?(-)?([0-9]+)$/.exec(name.toUpperCase().trim());

    try {
        return letter_nums[groups[1]] +
            (groups[2] ? accidental_offsets[groups[2]] : 0) +
            (groups[3] ? -12 : 12) * (parseInt(groups[4])) + 12;
    } catch (e) {
        throw new Error("Invalid value.");
    }
}

const augmented_names = ["A", "AUG", "AUGMENTED"];
const diminished_names = ["D", "DIM", "DIMIN", "DIMINISHED"];
const perfect_names = ["P", "PERF", "PERFECT"];

function getIntervalQuality(desc) {
    desc = desc.trim();
    if (desc[0] === "m" || desc[0] === "M") {
        let desc_upper = desc.toUpperCase();
        if (desc_upper.includes("MIN")) {
            return "min";
        } else if (desc_upper.includes("MAJ")) {
            return "maj";
        } else if (desc[0] === "m" && desc.length === 1) {
            return "min";
        } else if (desc[0] === "M" && desc.length === 1) {
            return "maj";
        } else {
            return null;
        }
    }
    let desc_upper = desc.toUpperCase();
    if (augmented_names.includes(desc_upper)) {
        return "aug";
    }
    if (diminished_names.includes(desc_upper)) {
        return "dim";
    }
    if (perfect_names.includes(desc_upper)) {
        return "perf";
    }
    return null;
}

function getIntervalSize(ord) {
    switch (ord) {
        case "1":
        case "one":
        case "first":
        case "1st":
        case "unison":
            return 1;
        case "2":
        case "two":
        case "second":
        case "2nd":
            return 2;
        case "3":
        case "three":
        case "third":
        case "3rd":
            return 3;
        case "four":
        case "fourth":
            return 4;
        case "five":
        case "fifth":
            return 5;
        case "six":
        case "sixth":
            return 6;
        case "seven":
        case "seventh":
            return 7;
        case "eight":
        case "eighth":
        case "octave":
            return 8;
        case "nine":
        case "ninth":
            return 9;
        case "ten":
        case "tenth":
            return 10;
        case "eleven":
        case "eleventh":
            return 11;
        case "twelve":
        case "twelfth":
            return 12;
        case "thirteen":
        case "thirteenth":
            return 13;
        case "fourteen":
        case "fourteenth":
            return 14;
        case "fifteen":
        case "fifteenth":
            return 15;
        case "sixteen":
        case "sixteenth":
            return 16;
        case "seventeen":
        case "seventeenth":
            return 17;
        case "eighteen":
        case "eighteenth":
            return 18;
        case "nineteen":
        case "nineteenth":
            return 19;
        case "twenty":
        case "twentieth":
            return 20;
    }
    let groups = /^([0-9]+)(th|)?$/.exec(ord);
    if (groups) {
        return parseInt(groups[1]);
    }
    return null;
}

function nameToInterval(name) {
    name = name.trim();
    let upper_name = name.toUpperCase();
    if (upper_name === "TT" || upper_name === "tritone") {
        return KeyboardIntervals.tritone;
    }
    if (upper_name === "unison") {
        return KeyboardIntervals.unison;
    }
    if (upper_name === "octave") {
        return KeyboardIntervals.octave;
    }
    let groups = /^([A-Za-z]+)\s*([A-Za-z0-9]+)$/.exec(name);

    if (!groups) {
        throw new Error("Invalid interval.");
    }

    let quality = getIntervalQuality(groups[1]);
    let value = getIntervalSize(groups[2]);

    if (!isNumber(value) || !quality || !value) {
        throw new Error("Invalid interval.");
    }

    let m_value = value % 7;
    let s_value = parseInt(value / 7);

    if ([4, 5, 1].includes(value % 7)) { // fourth, fifth, (unison, octave)
        value = s_value * 12;

        switch (m_value) {
            case 4:
                value += 5;
                break;
            case 5:
                value += 7;
                break;
            case 1:
            default:
        }

        switch (quality) {
            case "dim":
                return new KeyboardInterval(value - 1);
            case "aug":
                return new KeyboardInterval(value + 1);
            case "perf":
                return new KeyboardInterval(value);
            default:
            case "min":
            case "maj":
                throw new Error("Invalid interval.");
        }
    } else {
        value = s_value * 12;

        switch (m_value) {
            case 0: // seventh
                value += 11;
                break;
            case 2: // second
                value += 2;
                break;
            case 3: // third
                value += 4;
                break;
            case 6: // fourth
                value += 9;
                break;
        }

        switch (quality) {
            case "dim":
                return new KeyboardInterval(value - 2);
            case "aug":
                return new KeyboardInterval(value + 1);
            case "min":
                return new KeyboardInterval(value - 1);
            case "maj":
                return new KeyboardInterval(value);
            default:
            case "perf":
                throw new Error("Invalid interval.");
        }
    }
}

function intervalToName(interval_size) {
    let s_value = interval_size % 12;
    let m_value = parseInt(interval_size / 12);

    let prefix;
    let v_value;

    switch (s_value) {
        case 0:
            prefix = "P";
            v_value = 1;
            break;
        case 1:
            prefix = "m";
            v_value = 2;
            break;
        case 2:
            prefix = "M";
            v_value = 2;
            break;
        case 3:
            prefix = "m";
            v_value = 3;
            break;
        case 4:
            prefix = "M";
            v_value = 3;
            break;
        case 5:
            prefix = "P";
            v_value = 4;
            break;
        case 6:
            prefix = "A";
            v_value = 4;
            break;
        case 7:
            prefix = "P";
            v_value = 5;
            break;
        case 8:
            prefix = "m";
            v_value = 6;
            break;
        case 9:
            prefix = "M";
            v_value = 6;
            break;
        case 10:
            prefix = "m";
            v_value = 7;
            break;
        case 11:
            prefix = "M";
            v_value = 7;
            break;
    }

    let value = m_value * 7 + v_value;

    return prefix + String(value);
}

const KeyboardIntervals = {
    unison: 0,
    minor_second: 1,
    major_second: 2,
    minor_third: 3,
    major_third: 4,
    perfect_fourth: 5,
    tritone: 6,
    perfect_fifth: 7,
    minor_sixth: 8,
    major_sixth: 9,
    minor_seventh: 10,
    major_seventh: 11,
    octave: 12
};

function _isKeyboardNoteInstance(note) {
    return (note instanceof KeyboardNote);
}

function _isKeyboardIntervalInstance(interval) {
    return (interval instanceof KeyboardInterval);
}

class KeyboardNote {
    constructor(note) {
        if (isNumber(note)) {
            this.value = note;
        } else if (_isKeyboardNoteInstance(note)) {
            this.value = note.value;
        } else {
            this.value = nameToNote(note);
        }
    }

    subtract(note) {
        if (_isKeyboardNoteInstance(note) || isNumber(note)) {
            return new KeyboardInterval(this.value - new KeyboardNote(note).value);
        } else if (_isKeyboardIntervalInstance(note)) {
            let interval = note;
            return new KeyboardNote(this.value - interval.value);
        }
    }

    add(interval) {
        return new KeyboardNote(this.value + interval.value);
    }

    name() {
        return noteToName(this.value);
    }

    twelveTETFrequency() {
        return Math.pow(2, (this.value - 69) / 12) * 440;
    }
}

function makeNote(...args) {
    return new KeyboardNote(...args);
}

class KeyboardInterval {
    constructor(arg1, arg2) {
        if (isNumber(arg1) && arg2 === undefined) {
            this.value = arg1;
        } else if (arg2 !== undefined) {
            this.value = new KeyboardNote(arg2).subtract(new KeyboardNote(arg1)).value;
        } else if (_isKeyboardIntervalInstance(arg1)) {
            this.value = arg1.value;
        } else if (typeof arg1 === "string") {
            this.value = nameToInterval(arg1).value;
        }
    }

    add(interval) {
        return new KeyboardInterval(this.value + (new KeyboardInterval(interval)).value);
    }

    subtract(interval) {
        return new KeyboardInterval(this.value - (new KeyboardInterval(interval)).value);
    }

    negate() {
        return new KeyboardInterval(-this.value)
    }

    twelveTETCents() {
        return this.value * 100;
    }

    name() {
        return intervalToName(this.value);
    }
}

function makeInterval(...args) {
    return new KeyboardInterval(...args);
}

for (let key in KeyboardIntervals) {
    KeyboardIntervals[key] = new KeyboardInterval(KeyboardIntervals[key]);
}

Object.freeze(KeyboardIntervals);

const KeyboardNotes = {};

for (let i = 12; i < 128; i++) { // C0 to G9, notes for easy access
    let note = new KeyboardNote(i);

    KeyboardNotes[note.name()] = note;
}

export {noteToName, nameToNote, KeyboardNote, KeyboardInterval, KeyboardIntervals, KeyboardNotes, makeNote, makeInterval};