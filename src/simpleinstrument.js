import {KeyboardInstrument} from "./keyboardinstrument.js";
import {KeyboardMapping, getDefaultKeyboardDict} from "./keyboardmapping.js";
import * as audio from "./audio.js";
import {LinearEnvelopeSegment, Envelope, EnvelopeVertical, EnvelopeHorizontal} from "./envelope.js";
import {EnvelopeVerticalInverse} from "./envelope.js";
import {UnisonOscillator} from "./unisonoscillator.js";
import {PitchMappings} from "./pitchmapping.js";

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
        if (this.params.unison === 1) {
            var tone = audio.Context.createOscillator();
        } else {
            var tone = new UnisonOscillator(this.params);
        }

        let tone_gain = audio.Context.createGain();
        let tone_vel = audio.Context.createGain();
        let tone_pan = audio.Context.createStereoPanner();

        audio.chainNodes([
            tone,
            tone_gain,
            tone_vel,
            tone_pan,
            this.entryNode]);

        tone.type = this.waveform;
        tone.frequency.value = frequency;
        tone_gain.gain.setValueAtTime(0, 0);
        tone_vel.gain.setValueAtTime(vel, 0);
        tone_pan.pan.setValueAtTime(pan, 0);
        tone.start(start);

        this.params.attack_envelope.apply(tone_gain.gain,
            EnvelopeHorizontal.absoluteOffset(start));

        // Make a release envelope and then apply it to tone_gain.gain
        this.createReleaseEnvelope(
            this.params.attack_envelope.valueAt(end - start)
        ).apply(tone_gain.gain,
            EnvelopeHorizontal.absoluteOffset(end));

        // New interface!
        return {
            node: tone,
            _connect: x => tone_pan.connect(x),
            _disconnect: () => tone_pan.disconnect(),
            _release: () => { // When releasing the note, cancel all future values and then apply the release envelope
                let currTime = audio.Context.currentTime;
                if (currTime > end)
                    return;
                tone_gain.gain.cancelScheduledValues(0);
                this.createReleaseEnvelope(
                    tone_gain.gain.value
                ).apply(tone_gain.gain,
                    EnvelopeHorizontal.absoluteOffset(currTime));

                window.setTimeout(function () { // Note that precision isn't necessary here, so we'll use setTimeout
                    tone_pan.disconnect()
                }, this.params.release_length * 1000 + 100
                );
            },
            _cancel: () => tone_pan.disconnect(),
            _destroy: () => tone_pan.disconnect()
        }
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