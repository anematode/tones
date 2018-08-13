import * as audio from "./audio.js";
import * as utils from "../utils.js";

import {Filter} from "./filters.js";
import {SourceNode} from "./node.js";

class Gain extends Filter {
    constructor(gain) {
        super();

        this.entry.connect(this.exit);
        if (gain !== undefined)
            this.gain.value = gain;
    }

    get gain() {
        return this.entry.gain;
    }

    mute() {
        this._unmuted_volume = this.gain.value;
        this.gain.cancelScheduledValues();
        this.gain.value = 0;
    }

    unmute() {
        this.gain.value = this._unmuted_volume;
    }
}

class Pan extends Filter {
    constructor(pan) {
        super();

        this._panNode = audio.Context.createStereoPanner();

        audio.chainNodes([
            this.entry,
            this._panNode,
            this.exit
        ]);

        if (pan !== undefined)
            this.pan.value = pan;
    }

    get pan() {
        return this._panNode.pan;
    }
}

class Osc extends SourceNode {
    constructor(params = {}) {
        super();

        this._osc = audio.Context.createOscillator();

        this.frequency.value = utils.select(params.frequency, 440);
        this.detune.value = utils.select(params.detune, 0);
        this.type = utils.select(params.type, "sine");

        this._osc.connect(this.exit);
    }

    get frequency() {
        return this._osc.frequency;
    }

    get detune() {
        return this._osc.detune;
    }

    get type() {
        return this._osc.type;
    }

    set type(value) {
        this._osc.type = value;
    }

    get onended() {
        return this._osc.onended;
    }

    set onended(value) {
        this._osc.onended = value;
    }

    setWave(wave) {
        this._osc.setPeriodicWave(wave);
    }

    start() {
        this._osc.start();
    }

    stop() {
        this._osc.stop();
    }
}

export {Gain, Pan, Osc};