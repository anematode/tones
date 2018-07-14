import {PitchedInstrument} from "./pitchedinstrument.js"
import {KeyboardPitch} from "./keyboardpitch.js";
import {KeyboardMapping} from "./keyboardmapping";
import {getDefaultKeyboardDict} from "./keyboardmapping.js";

class KeyboardInstrument extends PitchedInstrument {
    constructor(parameters = {}) {
        super(parameters);

        this.keyboard = {};
        for (let i = 0; i < 128; i++) {
            this.keyboard[i] = false;
        }

        // Play a note using keyboard mapping
        this.keyboard_mapping = new KeyboardMapping(parameters.keyboard_dict || getDefaultKeyboardDict(),
            (note, pressing) => {
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
        if (!this.keyboard[note.value]) {
            this.keyboard[note.value] = true;
            this.playPitch(note);
        }
    }

    release(note) {
        note = new KeyboardPitch(note);
        if (this.keyboard[note.value]) {
            this.keyboard[note.value] = false;
            this.releasePitch(note);
        }
    }

    get keyboardPlayEnabled() {
        return this.keyboard_mapping.enabled;
    }

    set keyboardPlayEnabled(boolean) {
        if (boolean) {
            enableKeyboardPlay();
        } else {
            disableKeybordPlay();
        }
    }

    enableKeyboardPlay() {
        this.keyboard_mapping.enable();
    }

    disableKeyboardPlay() {
        this.keyboard_mapping.disable();
        this.releaseAll();
    }
}

export {KeyboardInstrument};