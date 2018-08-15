import {KeyboardInstrument} from "./keyboardinstrument.js";
import {SourceNode, ParameterValue} from "./node.js";
import * as audio from "./audio.js";
import * as utils from "../utils.js";
import {LinearEnvelopeSegment, Envelope, EnvelopeHorizontal} from "./envelope.js";
import {UnisonOscillator} from "./unisonoscillator.js";

let a = new LinearEnvelopeSegment([0, 0], [0.01, 1]);
let b = new LinearEnvelopeSegment(a.p2, [1, 0.2], 0.4);

const DefaultAttackEnvelope = new Envelope([a, b]);
const SCHEDULE_TIME = 0.05;

function periodicClearTimeout(list, timeout = 1000) {
    let timer = setInterval(() => {
        for (let i = 0; i < list.length; i++) {
            if (list[i].ended()) {
                list.splice(i, 1);
                i--;
            }
        }
    }, timeout);
}

class SimpleInstrumentNode extends SourceNode {
    constructor(parent, frequency, start, end, velocity, panValue) {
        super(parent);

        if (parent.params.unison === 1) {
            var tone = audio.Context.createOscillator();

            parent.params.pitch_c.connect(tone.detune);
        } else {
            var tone = new UnisonOscillator({
                unison: parent.params.unison,
                detune: 0,
                blend: 0,
                stereo: 0,
                frequency: 0
            });

            parent.params.pitch_c.connect(tone.frequency_detune); // allow channel pitch modulation
            parent.params.detune_c.connect(tone.detune);
            parent.params.blend_c.connect(tone.blend);
            parent.params.stereo_c.connect(tone.stereo);
        }

        let gain = audio.Context.createGain();
        let vel = audio.Context.createGain();
        let pan = audio.Context.createStereoPanner();

        audio.chainNodes([
            tone,
            gain,
            vel,
            pan,
            parent._getEntry()
        ]);

        if (parent.waveform !== "custom")
            tone.type = parent.waveform;

        tone.frequency.value = frequency;
        gain.gain.value = 0;
        vel.gain.value = velocity;
        pan.pan.value = panValue;

        tone.start(start);
        gain.gain.value = 1;

        parent.params.attack_envelope.apply(gain.gain,
            EnvelopeHorizontal.absoluteOffset((end !== Infinity) ? start : audio.Context.currentTime));

        // Make a release envelope and then apply it to tone_gain.gain
        if (end !== Infinity) {
            gain.gain.cancelScheduledValues(end);

            parent.createReleaseEnvelope(
                parent.params.attack_envelope.valueAt(end - start)
            ).apply(gain.gain,
                EnvelopeHorizontal.absoluteOffset(end));
        }

        this.node = tone;
        this.gain = gain;
        this.pan = pan;
        this.vel = vel;
        this.start = start;
        this.end = end;

        this.parent = parent;

        if (end !== Infinity) {
            window.setTimeout(() => { // Note that precision isn't necessary here, so we'll use setTimeout
                this.destroy();
            }, (end - audio.Context.currentTime + parent.params.release_length) * 1000);
        }
    }

    setWave(wave) {
        this.node.setWave(wave);
    }

    release() {
        /*
        When releasing the note, cancel all future values of gain and then apply the release envelope.
        After some time, destroy the note.
        */

        let currTime = audio.Context.currentTime;
        if (currTime > this.end)
            return;

        let K = this.gain;

        K.gain.cancelScheduledValues(0);
        this.parent.createReleaseEnvelope(
            K.gain.value
        ).apply(this.gain.gain,
            EnvelopeHorizontal.absoluteOffset(currTime));

        window.setTimeout(() => { // Note that precision isn't necessary here, so we'll use setTimeout
            this.destroy();
        }, this.parent.params.release_length * 1000);
    }

    _disconnect() {
        this.node.stop();
    }

    _destroy() {
        this.node.stop();
    }
}

class SimpleInstrument extends KeyboardInstrument {
    constructor(parameters = {}) {
        super(parameters);

        let detune_c = new ParameterValue(utils.select(parameters.detune, 20));
        let pitch_c = new ParameterValue(utils.select(parameters.pitch, 0));
        let blend_c = new ParameterValue(utils.select(parameters.blend, 0.3));
        let stereo_c = new ParameterValue(utils.select(parameters.stereo, 1));

        this.params = {
            get detune() { // Spread of detune (cents)
                return detune_c.value;
            },
            set detune(value) {
                detune_c.value.value = value;
            },
            get blend() { // Blend between central and peripheral oscillators
                return blend_c.value;
            },
            set blend(value) {
                blend_c.value.value = value;
            },
            get pitch() {
                return pitch_c.value;
            },
            set pitch(value) {
                pitch_c.value.value = value;
            },
            get stereo() {
                return stereo_c.value;
            },
            set stereo(value) {
                stereo_c.value.value = value;
            },
            detune_c: detune_c,
            pitch_c: pitch_c,
            blend_c: blend_c,
            stereo_c: stereo_c
        };

        this.params.unison = parameters.unison || 8; // Unison (integer >= 1)
        this.params.release_length = (parameters.release_length === 0) ? 0 : (parameters.release_length || 0.1); // Decay (sec)
        this.params.attack_envelope = (parameters.attack_envelope || DefaultAttackEnvelope);
        this.params.waveform = parameters.waveform || "square";
        this.params.waveform_wave = null; // TODO add a parameterizer for waveform wave

        /*this.entries = [];

        for (let i = 0; i < 10; i++) {
            let entry = audio.Context.createGain();
            entry.connect(this.entryNode);

            this.entries.push(entry);
        }*/

        this.createReleaseEnvelope = (gain_value) => {
            return new Envelope([new LinearEnvelopeSegment([0, gain_value], [this.params.release_length, 0])]);
        };
    }

    _getEntry() {
        return this.entryNode; //this.entries[~~(Math.random() * this.entries.length)];
    }

    createNode(frequency, start, end, vel, pan) {
        let node = new SimpleInstrumentNode(this, ...arguments);
        if (this.params.waveform === "custom")
            node.setWave(this.params.waveform_wave);
        return node;
    }

    oscillatorApply(func) {
        this.iterateOverNodes(x => func(x.node.node));
    }

    set waveform(value) {
        this.params.waveform = value;
        if (value !== "custom") {
            this.oscillatorApply(function (x) {
                x.type = value;
            });
        }
    }

    setWave(real, imag) {
        if (utils.isArray(real))
            real = new Float32Array(real);
        if (utils.isArray(imag))
            imag = new Float32Array(imag);

        if (real.length !== imag.length)
            throw new Error("Imaginary and real arrays must be of the same length");

        this.params.waveform_wave = audio.Context.createPeriodicWave(real, imag);
        this.waveform = "custom";

        this.oscillatorApply(x => x.setWave(this.params.waveform_wave));
    }

    get waveform() {
        return this.params.waveform;
    }
}

export {SimpleInstrument};