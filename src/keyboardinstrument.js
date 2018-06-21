import * as audio from "./audio.js";
import { Instrument } from "./instrument.js"
import {KeyboardNote} from "./keyboardnote.js";

import { Envelope, EnvelopeSegment } from "./envelope.js"

class KeyboardInstrument extends Instrument {
    constructor(destinationNode = audio.masterEntryNode) {
        super(destinationNode);


        this.keyboard = {};
        for (let i = 0; i < 128; i++) {
            this.keyboard[i] = false;
        }
    }

    play(note) {
        note = new KeyboardNote(note);
        if (!this.keyboard[note.value]) {
            this.keyboard[note.value] = true;
            this.onplay(note);
        }
    }

    release(note) {
        note = new KeyboardNote(note);
        if (this.keyboard[note.value]) {
            this.keyboard[note.value] = false;
            this.onrelease(note);
        }
    }

    releaseAll(notes) {
        for (let i = 0; i < 128; i++) {
            this.release(i);
        }
    }
}

export {KeyboardInstrument};