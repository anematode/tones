import * as audio from "../audio/audio.js";
import * as utils from "../utils.js";

/*
This class represents a mapping from audioContext time to beat time, and vice versa
 */
class TimeContext {
    constructor(bpm, offset, beat_meaning = 4) {
        this.bpm = bpm;       // beats per minute
        this.offset = offset; // second offset of beat 0 against audio context time
        this.beat_meaning = beat_meaning;
    }

    ctxTimeToBeat(time) {
        return (time - this.offset) / 60 * this.bpm / this.beat_meaning;
    }

    beatToCtxTime(beat) {
        return (beat / this.bpm * this.beat_meaning) * 60 + this.offset;
    }

    ctxDeltaToBeat(delta) {
        return delta / 60 * this.bpm / this.beat_meaning;
    }

    beatDeltaToCtx(delta) {
        return delta * 60 / this.bpm * this.beat_meaning;
    }

    parseLength(string) {
        return this.beatToCtxTime(parseLength(string));
    }

    currentBeat() {
        return this.ctxTimeToBeat(audio.Context.currentTime);
    }
}

function parseLength(s) {
    if (utils.isNumeric(s))
        return s;

}

export { TimeContext };