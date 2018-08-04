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

let BLOCK_SIZE = 1024;

function fillImpulseValues(leftChannel, rightChannel, length, decay, minX, maxX) {
    for (let i = minX; i < maxX; i++) {
        leftChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        rightChannel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
}

let BUILDERS = {};

/*
Create convolver impulse for convolver node
*/
function generateConvolverImpulse(length, decay, callback) {
    let id = utils.getID();

    BUILDERS[id] = {left: new Float32Array(length), right: new Float32Array(length)};

    function buildSection(minX, maxX) {
        let builder = BUILDERS[id];
        let leftChannel = builder.left;
        let rightChannel = builder.right;

        fillImpulseValues(leftChannel, rightChannel, length, decay, minX, maxX);

        if (maxX === length) {
            let buffer = audio.Context.createBuffer(2, length, audio.Context.sampleRate);

            buffer.getChannelData(0).set(leftChannel);
            buffer.getChannelData(1).set(rightChannel);

            delete BUILDERS[id];
            callback(buffer);
            return;
        }

        setTimeout(() => {
            buildSection(maxX, Math.min(maxX + BLOCK_SIZE, length));
        }, 1);
    }

    buildSection(0, BLOCK_SIZE);
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
        generateConvolverImpulse(this._length, this._decay, (buffer) => {
            this.convolver_node.buffer = buffer;
        });
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
        biquad_filter.Q.value = (params.Q !== undefined) ? params.Q : 1;

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

    getResponse(arr) { // Return the scaling value for each frequency
        if (!(arr instanceof Float32Array)) {
            if (utils.isNumeric(arr))
                arr = new Float32Array([arr]);
            else
                arr = new Float32Array(arr);
        }

        let magnitude_response = new Float32Array(arr.length);
        let phase_response = new Float32Array(arr.length);

        this.biquad_filter.getFrequencyResponse(arr, magnitude_response, phase_response);

        return {
            mag: magnitude_response,
            phase: phase_response
        };
    }

    getMagnitudeResponse(arr) {
        return this.getResponse(arr).mag;
    }

    getPhaseResponse(arr) {
        return this.getResponse(arr).phase;
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

class LowshelfFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "lowshelf");
    }
}

class HighshelfFilter extends BiquadWrapper {
    constructor(params = {}) {
        super(params, "highshelf");
    }
}

let MIN_FREQ = 50;
let MAX_FREQ = 8000;
const MIN_FREQ_LOG2 = Math.log2(MIN_FREQ);
const MAX_FREQ_LOG2 = Math.log2(MAX_FREQ);
const FREQ_DIFF = MAX_FREQ_LOG2 - MIN_FREQ_LOG2;

function expScaleFreq(x) {
    return Math.pow(2, MIN_FREQ_LOG2 + FREQ_DIFF * x);
}

let DEFAULT_BAND_WIDTH = 0.2; // Octaves
let DEFAULT_BAND_Q = bandWidthToQ(DEFAULT_BAND_WIDTH);

function bandWidthToQ(bandwidth) { // bandwidth is in octaves
    return Math.sqrt(2 * bandwidth) / (Math.pow(2, bandwidth) - 1);
}

/* Parametric EQ with n knobs */
class ParametricEQ extends Filter {
    constructor(size = 6) {
        super();

        if (size < 2 || size > 12) {
            throw new Error(`Size ${size} is not in allowed range [2, 11]`);
        }

        this.F0 = new LowshelfFilter();

        this.F0.frequency.value = MIN_FREQ;

        let last_filter = new HighshelfFilter();
        this['F' + String(size - 1)] = last_filter;

        last_filter.frequency.value = MAX_FREQ;

        this.size = size;

        for (let i = 1; i < size - 1; i++) {
            let filter = new FrequencyBumpFilter();
            filter.frequency.value = expScaleFreq(i / (size - 1));
            this['F' + String(i)] = filter;

            filter.Q.value = DEFAULT_BAND_Q;//Math.log2(filter.frequency.value);
        }

        for (let i = 0; i < size - 1; i++) {
            this.getFilter(i).connect(this.getFilter(i + 1));
        }

        this.entry.connect(this.F0.entry);
        last_filter.connect(this.exit);
    }

    getFilter(i) {
        if (i < 0 || i >= this.size)
            throw new Error(`${i} out of range [0, ${this.size - 1}]`);
        return this['F' + String(i)];
    }

    filterApply(func) {
        for (let i = 0; i < this.size; i++) {
            let filter = this.getFilter(i);

            func(filter);
        }
    }

    getResponse(arr) { // Return the scaling value for each frequency
        if (!(arr instanceof Float32Array)) {
            if (utils.isNumeric(arr))
                arr = new Float32Array([arr]);
            else
                arr = new Float32Array(arr);
        }

        let magnitude_response = new Float32Array(arr.length);
        magnitude_response.fill(1);
        let phase_response = new Float32Array(arr.length);

        this.filterApply((filter) => {
            let resp = filter.getResponse(arr);

            for (let i = 0; i < arr.length; i++) {
                magnitude_response[i] *= resp.mag[i];
                phase_response[i] += resp.phase[i];
            }
        });

        return {
            mag: magnitude_response,
            phase: phase_response
        };
    }

    getMagnitudeResponse(arr) {
        return this.getResponse(arr).mag;
    }

    getPhaseResponse(arr) {
        return this.getResponse(arr).phase;
    }
}

export { Reverb, Delay, Filter, LowpassFilter, HighpassFilter, FrequencyBumpFilter, BandpassFilter, NotchFilter, LowshelfFilter, HighshelfFilter, ParametricEQ };
