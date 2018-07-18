import { KeyboardPitch, KeyboardPitches } from "./keyboardpitch.js";

/*
KeyboardNote represents a note to be played, containing a KeyboardPitch,
start time (seconds against audio context time), duration (seconds), pan (-1 left to 1 right), and vel (0 silent to 1 loud)
 */
class KeyboardNote {
    /*
    Takes parameters:
    pitch, sent to KeyboardPitch constructor;
    start, time that note starts;
    end, time that note ends;          | Interchangeable
    duration, time that note lasts;    |
    pan, pan of note;
    vel, velocity of note;
     */

    constructor(params = {}) {
        if (params instanceof KeyboardNote) {
            this.params = params.params;
            return;
        }

        this.pitch = (params.pitch !== undefined) ? params.pitch : KeyboardPitches.A4;
        this.start = (params.start === undefined) ? 0 : params.start;

        if (params.end) {
            this.duration = params.end - this.start;
        } else {
            this.duration = (params.duration === undefined) ? 1 : params.duration;
        }

        this.pan = (params.pan === undefined) ? 0 : params.pan;
        this.vel = (params.vel === undefined) ? 1 : params.vel;

        if (this.start < 0) {
            throw new Error("Invalid start time")
        }

        if (this.duration <= 0) {
            throw new Error("Invalid duration")
        }
    }

    get end() {
        return this.start + this.duration;
    }

    set end(value) {
        if (value <= this.start) {
            throw new Error("Invalid end time")
        }
        this.duration = value - this.start;
    }

    translate(x) {
        return new KeyboardNote({
            pitch: this.pitch,
            start: this.start + x,
            duration: this.duration,
            pan: this.pan,
            vel: this.vel
        });
    }
}

export { KeyboardNote };