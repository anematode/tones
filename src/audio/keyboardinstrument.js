import {PitchedInstrument} from "./pitchedinstrument.js"
import {KeyboardPitch} from "./keyboardpitch.js";
import {KeyboardMapping} from "./keyboardmapping";
import {getDefaultKeyboardDict} from "./keyboardmapping.js";

/*
PitchedInstrument allowing mapping and playing between the keyboard and the instrument
*/
class KeyboardInstrument extends PitchedInstrument {
    constructor(parameters = {}) {
        super(parameters);

        this.keyboard = {};
        for (let i = 0; i < 128; i++) { // states of notes 0-127
            this.keyboard[i] = false;
        }

        // Play a note using keyboard mapping
        this.keyboard_mapping = new KeyboardMapping(parameters.keyboard_dict || getDefaultKeyboardDict(),
            (note, pressing) => { // activate notes from keyboard
                if (!note) return;
                if (pressing) {
                    this.play(note);
                } else {
                    this.release(note);
                }
            });
    }

    play(note) {
        note = new KeyboardPitch(note);
        if (!this.keyboard[note.value]) { // if the key isn't already pressed (this would happen when holding the key down)
            this.keyboard[note.value] = true;
            this.playPitch(note);
        }
    }

    release(note) {
        note = new KeyboardPitch(note);
        if (this.keyboard[note.value]) { // if the key is still pressed
            this.keyboard[note.value] = false;
            this.releasePitch(note);
        }
    }

    get keyboardPlayEnabled() { // is keyboard interaction enabled
        return this.keyboard_mapping.enabled;
    }

    set keyboardPlayEnabled(boolean) { // enable/disable keyboard playing
        if (boolean) {
            enableKeyboardPlay();
        } else {
            disableKeyboardPlay();
        }
    }

    enableKeyboardPlay() { // enable keyboard playing
        this.keyboard_mapping.enable();
    }

    disableKeyboardPlay() { // disable keyboard playing
        this.keyboard_mapping.disable();
        this.releaseAll();
    }
}

export {KeyboardInstrument};
