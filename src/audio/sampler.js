import * as utils from "../utils.js";
import * as audio from "./audio.js";

import {SourceNode} from "./node.js";
import {KeyboardInstrument} from "./keyboardinstrument.js";
import {ParameterValue} from "./node";

const REF_PITCH = 69;

class SamplerNode extends SourceNode {
    constructor(parent, frequency, start, end, velocity, panValue) {
        super(parent);

        let source = audio.Context.createBufferSource();
        source.buffer = parent.buffer;

        parent.params.pitch_c.connect(source.detune);

        source.playbackRate.value = frequency / parent.frequencyOf(REF_PITCH);

        let nodes = [source];

        if (velocity !== 1) {
            let gain = audio.Context.createGain();
            gain.gain.value = velocity;
            nodes.push(gain);
        }

        if (panValue !== 1) {
            let pan = audio.Context.createStereoPanner();
            pan.pan.value = panValue;
            nodes.push(pan);
        }

        nodes.push(parent._getEntry());

        audio.chainNodes(nodes);
        source.start(start);
    }

    release() {

    }
}

class Sampler extends KeyboardInstrument {
    constructor(params = {}) {
        super(params);

        let pitch_c = new ParameterValue(utils.select(params.pitch, 0));

        this.params = {
            get pitch() {
                return pitch_c.value;
            },
            set pitch(value) {
                pitch_c.value.value = value;
            },
            pitch_c: pitch_c
        };
    }

    loadFromURL(url) {
        return new Promise((resolve, reject) => {
            audio.getAudioBuffer(url).then((buffer) => {
                this.buffer = buffer;
            }).then(resolve).catch(reject);
        });
    }

    _getEntry() {
        return this.entryNode; //this.entries[~~(Math.random() * this.entries.length)];
    }

    createNode(frequency, start, end, vel, pan) {
        return new SamplerNode(this, ...arguments);
    }
}

export {Sampler};