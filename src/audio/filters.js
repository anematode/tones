import * as audio from "./audio.js";
import {Node} from "./node.js";

class Filter extends Node {
    constructor() {
        super();
    }
}

function generateConvolverImpulse(length, decay) {
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
        this.convolver_node.connect(this.exit);

        this.dry_node.gain.value = (params.dry !== undefined) ? params.dry : 0.5;
        this.wet_node.gain.value = (params.wet !== undefined) ? params.wet : 0.5;

        this.convolver_node.buffer = generateConvolverImpulse(100000, 3)
    }

    get wet() {
        return this.wet_node.gain;
    }

    get dry() {
        return this.dry_node.gain;
    }
}

export {Reverb, Filter};