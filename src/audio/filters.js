import * as audio from "./audio.js";
import {Node} from "./node.js";
import * as utils from "../utils.js";

/*
Base filter class
*/
class Filter extends Node {
    constructor() {
        super();
    }
}

/*
Create convolver impulse for convolver node
*/
function generateConvolverImpulse(length, decay) { // TODO make non blocking
    let leftChannel = new Float32Array(length);
    let rightChannel = leftChannel.slice();

    for (let i = 0; i < length; i++) {
        leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }

    let buffer = audio.Context.createBuffer(2, length, audio.Context.sampleRate);
    buffer.getChannelData(0).set(leftChannel);
    buffer.getChannelData(1).set(rightChannel);

    return buffer;
}

/*
Reverb filter

dry -> dry value
wet -> wet value

wet_filter -> filter to apply to wet side
length -> size of convolver impulse
decay -> decay rate of impulse
*/
class Reverb extends Filter {
    constructor(params = {}) {
        super();

        this.dry_node = audio.Context.createGain();
        this.wet_node = audio.Context.createGain();
        this.convolver_node = audio.Context.createConvolver();

        this.entry.connect(this.dry_node);
        this.entry.connect(this.wet_node);
        this.dry_node.connect(this.exit);
        this.wet_node.connect(this.convolver_node);

        if (params.wet_filter) {
            this.convolver_node.connect(params.wet_filter);
            params.wet_filter.connect(this.exit);
        } else {
            this.convolver_node.connect(this.exit);
        }

        this.dry_node.gain.value = (params.dry !== undefined) ? params.dry : 0.5;
        this.wet_node.gain.value = (params.wet !== undefined) ? params.wet : 0.5;

        this._length = params.length || 1e5;
        this._decay = params.decay || 2.5;

        this.setImpulse();
    }

    setImpulse() { // set convolver node impulse
        this.convolver_node.buffer = generateConvolverImpulse(this._length, this._decay);
    }

    get wet() {
        return this.wet_node.gain;
    }

    get dry() {
        return this.dry_node.gain;
    }

    get length() {
        return this._length;
    }

    get decay() {
        return this._decay;
    }

    set length(value) {
        this._length = value;
        this.setImpulse();
    }

    set decay(value) {
        this._decay = value;
        this.setImpulse();
    }
}

/*
delay filter

delay: length of delay,
loss: loss at each delay iteration
*/
class Delay extends Filter {
    constructor(params = {}) {
        super();

        this.delay_node = audio.Context.createDelay();
        this.loss_node = audio.Context.createGain();

        audio.chainNodes([
            this.entry,
            this.loss_node,
            this.delay_node,
            this.exit
        ]);

        this.delay_node.connect(this.loss_node); // forms feedback loop

        this.entry.connect(this.exit);

        this.delay_node.delayTime.value = params.delay || 0.5;
        this.loss_node.gain.value = params.loss || 0.3;
    }

    get delay() {
        return this.delay_node.delayTime;
    }

    get loss() {
        return this.loss_node.gain;
    }
}

/*
Wrapper around biquad filter
*/
class BiquadWrapper extends Filter {
    constructor(params = {}, type) {
        super();

        let biquad_filter = audio.Context.createBiquadFilter();

        biquad_filter.type = type;
        biquad_filter.gain.value = (params.gain !== undefined) ? params.gain : 2;
        biquad_filter.frequency.value = (params.frequency !== undefined) ? params.frequency : 1000;
        biquad_filter.Q.value = (params.Q !== undefined) ? params.Q : 10;

        this.entry.connect(biquad_filter);
        biquad_filter.connect(this.exit);

        this.biquad_filter = biquad_filter;
    }

    get frequency() {
        return this.biquad_filter.frequency;
    }

    get Q() {
        return this.biquad_filter.Q;
    }

    get gain() {
        return this.biquad_filter.gain;
    }
    
    // TODO add set for these getters

    getFrequencyResponse(arr) {
        if (!(arr instanceof Float32Array)) {
            if (utils.isNumeric(arr))
                arr = Float32Array([arr]);
            else
                arr = Float32Array(arr);
        }

        let magnitude_response = new Float32Array(arr.length);
        let phase_response = new Float32Array(arr.length);

        biquad_filter.getFrequencyResponse(arr, magnitude_response, phase_response);

        return [magnitude_response, phase_response];
    }
}

/* lowpass filter */
class LowpassFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "lowpass");
    }
}

/* highpass filter */
class HighpassFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "highpass");
    }
}

/* peaking filter */
class FrequencyBumpFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "peaking");
    }
}

/* bandpass filter */
class BandpassFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "bandpass");
    }
}

/* notch filter */
class NotchFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "notch");
    }
}

export { Reverb, Delay, Filter, LowpassFilter, HighpassFilter, FrequencyBumpFilter, BandpassFilter, NotchFilter };
