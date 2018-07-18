import {KeyboardInstrument} from "./keyboardinstrument.js";
import {PitchedInstrumentNode} from "./pitchedinstrument.js";
import * as audio from "./audio.js";
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

class SimpleInstrumentNode extends PitchedInstrumentNode {
    constructor(parent, frequency, start, end, velocity, panValue) {
        super(parent);

        if (parent.params.unison === 1) {
            var tone = audio.Context.createOscillator();
        } else {
            var tone = new UnisonOscillator(parent.params);
        }

        let gain = this.gain;
        let vel = audio.Context.createGain();
        let pan = this.pan;

        audio.chainNodes([
            tone,
            gain,
            vel,
            pan,
            parent.entryNode
        ]);

        tone.type = parent.waveform;

        tone.frequency.setValueAtTime(frequency, 0);
        gain.gain.setValueAtTime(0, 0);
        vel.gain.setValueAtTime(velocity, 0);
        pan.pan.setValueAtTime(panValue, 0);

        tone.start(start);

        parent.params.attack_envelope.apply(gain.gain,
            EnvelopeHorizontal.absoluteOffset(start));

        gain.gain.cancelScheduledValues(end);

        // Make a release envelope and then apply it to tone_gain.gain
        parent.createReleaseEnvelope(
            parent.params.attack_envelope.valueAt(end - start)
        ).apply(gain.gain,
            EnvelopeHorizontal.absoluteOffset(end));

        this.node = tone;
        this.vel = vel;
        this.end = end;

        window.setTimeout(() => { // Note that precision isn't necessary here, so we'll use setTimeout
            this._destroy();
        }, (end - audio.Context.currentTime + parent.params.release_length) * 1000 + 1000);
    }

    _release() {
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
            this._destroy();
        }, this.parent.params.release_length * 1000 + 500);
    }

    _disconnect() {
        this.node.stop();

        setTimeout(() => {
            this.pan.disconnect();
        }, 150);
    }

    _cancel() {
        this._disconnect();
    }

    _destroy() {
        this._disconnect();
    }
}

class SimpleInstrument extends KeyboardInstrument {
    constructor(parameters = {}) {
        super(parameters);

        this.params = {};

        this.params.unison = parameters.unison || 8; // Unison (integer >= 1)
        this.params.detune = (parameters.detune === 0) ? 0 : (parameters.detune || 20); // Spread of detune (cents)
        this.params.blend = (parameters.blend === 0) ? 0 : (parameters.blend || 0.6); // Blend between central and peripheral oscillators
        this.params.release_length = (parameters.release_length === 0) ? 0 : (parameters.release_length || 0.1); // Decay (sec)
        this.params.attack_envelope = (parameters.attack_envelope || DefaultAttackEnvelope);
        this.params.waveform = parameters.waveform || "square";

        this.oscillators = {};
        for (let i = 0; i < 128; i++) {
            this.oscillators[i] = null;
        }

        this.createReleaseEnvelope = (gain_value) => {
            return new Envelope([new LinearEnvelopeSegment([0, gain_value], [this.params.release_length, 0])]);
        };
    }

    createNode(frequency, start, end, vel, pan) {
        return new SimpleInstrumentNode(this, ...arguments);
    }

    oscillatorApply(func) {
        this.iterateOverNodes(x => func(x.node.node));
    }

    set detune(value) {
        this.params.detune = value;
        this.oscillatorApply(function (x) {
            x.detune.value = value;
        });
    }

    get detune() {
        return this.params.detune;
    }

    set blend(value) {
        this.params.blend = value;
        this.oscillatorApply(function (x) {
            x.blend.value = value;
        });
    }

    get blend() {
        return this.params.blend;
    }

    set waveform(value) {
        this.params.waveform = value;
        this.oscillatorApply(function (x) {
            x.type = value;
        })
    }

    get waveform() {
        return this.params.waveform;
    }
}

export {SimpleInstrument};