import {KeyboardPitch, KeyboardPitches} from "../audio/keyboardpitch.js";
import {KeyboardNote} from "../audio/keyboardnote.js";
import {TimeContext} from "./time.js";
import * as utils from "../utils.js";

class Note {
    constructor(params) {
        // pitch should be KeyboardPitch or constructor input
        if (params instanceof KeyboardPitch || !(params instanceof Object)) {
            this.pitch = new KeyboardPitch(params);
        } else {
            this.pitch = new KeyboardPitch((params.pitch !== undefined) ? params.pitch : 69);
        }

        this.start = (params.start !== undefined) ? params.start : 0;
        if (params.end) {
            this.duration = params.end - this.start;
        } else {
            this.duration = (params.duration === undefined) ? 1 : params.duration;
        }

        this.vel = (params.vel !== undefined) ? params.vel : 1;
        this.pan = (params.pan !== undefined) ? params.pan : 0;
        this.params = params.params || {};
    }

    get end() {
        return this.duration + this.start;
    }

    translate(x) {
        this.start += x;
        return this;
    }

    tr(x) {
        return this.translate(x);
    }

    transpose(x) {
        this.pitch.value += x;
        return this;
    }

    tp(x) {
        return this.transpose(x);
    }

    amplify(x) {
        this.vel *= x;
        return this;
    }

    amp(x) {
        return this.amplify(x);
    }

    quieten(x) {
        return this.amplify(1 / x);
    }

    quiet(x) {
        return this.quieten(x);
    }

    clone() {
        return new Note({
            pitch: this.pitch,
            duration: this.duration,
            start: this.start,
            vel: this.vel,
            pan: this.pan,
            params: this.params
        });
    }

    keyboardNote(timeContext) {
        return new KeyboardNote({
            start: timeContext.beatToCtxTime(this.start),
            end: timeContext.beatToCtxTime(this.end),
            vel: this.vel,
            pan: this.pan,
            pitch: this.pitch,
            params: Object.assign({}, this.params)
        });
    }
}

function makeNote(params) {
    return new Note(params);
}

export {Note,makeNote}