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
        if (!this.keyboard[note.value]) {
            this.keyboard[note.value] = true;
            this.onplay(note);
        }
    }

    release(note) {
        if (this.keyboard[note.value]) {
            this.keyboard[note.value] = false;
            this.onrelease(note);
        }
    }
}

export {KeyboardInstrument};