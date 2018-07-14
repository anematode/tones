import {Note} from "./note.js";
import {NoteGroup} from "./notegroup.js";
import * as audio from "../audio/audio.js";

/*
This class represents a mapping from audioContext time to beat time, and vice versa
 */
class TimeContext {
    constructor(bpm, offset) {
        this.bpm = bpm;       // beats per minute
        this.offset = offset; // second offset of beat 0 against audio context time
    }

    ctxTimeToBeat(time) {
        return (time - this.offset) / 60 * this.bpm;
    }

    beatToCtxTime(beat) {
        return (beat / this.bpm) * 60 + this.offset;
    }

    ctxDeltaToBeat(delta) {
        return delta / 60 * this.bpm;
    }

    beatDeltaToCtx(delta) {
        return delta * 60 / this.bpm;
    }

    parseLength(string) {
        return this.beatToCtxTime(parseLength(string));
    }
}