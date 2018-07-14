import { KeyboardPitch, KeyboardPitches } from "./keyboardpitch.js";

class KeyboardMapping {
    constructor(dict, func) { // Key pathway: (keypress / keyup) -> dict -> func call (KeyboardPitch, bool pressed)
        this.keydict = dict;
        this.func = func;
        this.enabled = false;
        this.keyPress = (evt => {
            try {
                this.func(this.keydict[evt.key], true);
            } catch (e) {
                console.log(e);
                // Key that's not in the mapping, ok
            }
        });
        this.keyUp = (evt => {
            try {
                this.func(this.keydict[evt.key], false);
            } catch (e) {
                console.log(e);
                // Key that's not in the mapping, ok
            }
        });
    }

    enable() {
        if (!this.enabled) {
            document.addEventListener("keypress", this.keyPress);
            document.addEventListener("keyup", this.keyUp);
            this.enabled = true;
        }
    }

    disable() {
        if (this.enabled) {
            document.removeEventListener("keypress", this.keyPress);
            document.removeEventListener("keyup", this.keyUp);
            this.enabled = false;
        }
    }

    dictApply(func) {
        for (let key in this.keydict) {
            this.keydict[key] = func(this.keydict[key]);
        }
    }

    transform(key) {
        return this.keydict[key];
    }

    virtualPress(key) {
        this.func(this.keydict[key], true);
    }

    virtualRelease(key) {
        this.func(this.keydict[key], false);
    }
}

let N = KeyboardPitches;

let _DefaultKeyboardMapping = {
    "z" : N.C3,
    "s" : N.Cs3,
    "x" : N.D3,
    "d" : N.Ds3,
    "c" : N.E3,
    "v" : N.F3,
    "g" : N.Fs3,
    "b" : N.G3,
    "h" : N.Gs3,
    "n" : N.A3,
    "j" : N.As3,
    "m" : N.B3,
    "," : N.C4,
    "l" : N.Cs4,
    "." : N.D4,
    ";" : N.Ds4,
    "/" : N.E4,
    "q" : N.C4,
    "2" : N.Cs4,
    "w" : N.D4,
    "3" : N.Ds4,
    "e" : N.E4,
    "r" : N.F4,
    "5" : N.Fs4,
    "t" : N.G4,
    "6" : N.Gs4,
    "y" : N.A4,
    "7" : N.As4,
    "u" : N.B4,
    "i" : N.C5,
    "9" : N.Cs5,
    "o" : N.D5,
    "0" : N.Ds5,
    "p" : N.E5,
    "[" : N.F5,
    "=" : N.Fs5,
    "]" : N.G5
};

function getDefaultKeyboardDict() {
    return Object.assign({}, _DefaultKeyboardMapping);
}

export {KeyboardMapping, getDefaultKeyboardDict};


