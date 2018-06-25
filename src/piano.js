import { KeyboardInstrument } from "./keyboardinstrument.js";
import { KeyboardMapping, getDefaultKeyboardDict } from "./keyboardmapping.js";
import * as audio from "./audio.js";
import {EnvelopeSegment, Envelope, EnvelopeVertical, EnvelopeHorizontal} from "./envelope.js";
import {EnvelopeVerticalInverse} from "./envelope.js";
import {UnisonOscillator} from "./unisonoscillator.js";
import {PitchMappings} from "./pitchmapping.js";

let a = new EnvelopeSegment([0,0], [0.005,1], 0.9);
let b = new EnvelopeSegment(a.p2, [2.4, 0.2], 0.5);
let c = new EnvelopeSegment(b.p2, [20, 0], 0.1);

const DefaultAttackEnvelope = new Envelope([a,b,c]);

const real = new Float32Array([0,0,1,0,1]);
const imag = new Float32Array(real.length);
const pianoWave = audio.Context.createPeriodicWave(real,imag);

class PianoOscillator {
    constructor(frequency) {
        this.oscillator_count = 15;

        this.oscillators = [];
        this.exit_node = audio.Context.createGain();

        let r = 0.7; // radius of string, mm
        let E = 200000; // Young's modulus of string, Newtons / (mm) ^ 2
        let T = 1600; // Tension of string, newtons
        let L = 1000; // Length of string, mm


        let A = Math.pow(Math.PI, 3) * r * r * r * r * E / 8 / T / L / L;

        let partials = [
            1.7202996385444569, 1.4300663282061981, 1.1597951953657128, 0.58661553936616362, 0.33257550015829651, 0.32094063539074608, 0.15592066374569108, 0.17132499997971729, 0.14850610765546846, 0.1738548266767786, 0.034705710530054883, 0.012656264005633504, 0.02067379392384007, 0.0052896371953956084, 0.067187378351302077, 0.0033300110566908026, 0.004430089629984711, 0.00077412060834818562, 0.00090773026428330383, 0.00076213801712951763, 0.00072315653323779948, 0.0009126541447556396, 0.00074440438139133089, 0.0004686624661097702
            ];
        let volume = 0;

        for (let i = 1; i < this.oscillator_count + 1; i++) {
            let series = {
                o: audio.Context.createOscillator(),
                g: audio.Context.createGain(),
                d: audio.Context.createDelay(),
                pan: audio.Context.createStereoPanner()
            };

            series.o.frequency.value = i * frequency * Math.sqrt(1 + A * i * i);
            series.g.gain.value = partials[i];
            volume += partials[i];
            series.d.delayTime.value = Math.random() / i / frequency;
            series.pan.pan.value = Math.random() / 2;

            audio.chainNodes([series.o, series.g, series.d, series.pan, this.exit_node]);

            this.oscillators.push(series);
        }

        this.exit_node.gain.value = 1 / volume;
    }

    connect(node) {
        this.exit_node.connect(node);
    }

    start() {
        for (let i = 0; i < this.oscillator_count; i++) {
            this.oscillators[i].o.start();
        }
    }

    stop() {
        for (let i = 0; i < this.oscillator_count; i++) {
            this.oscillators[i].o.stop();
        }
    }

    disconnect() {
        this.exit_node.disconnect();
    }
}

class Piano extends KeyboardInstrument {
    constructor(parameters = {}) {
        super();

        this.params = {};

        this.params.unison = parameters.unison || 8; // Unison (integer > 1)
        this.params.detune = (parameters.detune === 0) ? 0 : (parameters.detune || 20); // Spread of detune (cents)
        this.params.blend = (parameters.blend === 0) ? 0 : (parameters.blend || 0.6); // Blend between central and peripheral oscillators
        this.params.release_length = (parameters.release_length === 0) ? 0 : (parameters.release_length || 0.1); // Decay (sec)
        this.params.attack_envelope = (parameters.attack_envelope || DefaultAttackEnvelope);

        if (parameters.destinationNode) {
            this.connect(parameters.destinationNode);
        }

        this.oscillators = {};
        for (let i = 0; i < 128; i++) {
            this.oscillators[i] = null;
        }

        this.createDecayEnvelope = (gain_value) => {
            return new Envelope([new EnvelopeSegment([0, gain_value], [this.params.release_length, 0])]);
        };

        this.keyboard_mapping = new KeyboardMapping(parameters.keyboard_dict || getDefaultKeyboardDict(),
            (note, pressing) => {
                if (!note) return;
                if (pressing) {
                    this.play(note);
                } else {
                    this.release(note);
                }
            });

        this.pitch_mapping = parameters.pitch_mapping || PitchMappings.ET12;
    }

    onplay(note) {
        try {
            let tone = new PianoOscillator(this.pitch_mapping.transform(note));
            // let tone = audio.Context.createOscillator();
            let tone_gain = audio.Context.createGain();

            audio.chainNodes([
                tone,
                tone_gain,
                this.entryNode
            ]);

            tone_gain.gain.setValueAtTime(0, 0);
            tone.start();

            this.params.attack_envelope.apply(tone_gain.gain,
                EnvelopeHorizontal.offset_current_time,
                EnvelopeVertical.vertical_exp);

            this.oscillators[note.value] = {tone: tone, tone_gain: tone_gain};
        } catch (e) {
            console.log(e);
        }
    }

    onrelease(note) {
        let group = this.oscillators[note.value];

        group.tone_gain.gain.cancelScheduledValues(0);
        this.createDecayEnvelope(
            EnvelopeVerticalInverse.vertical_exp(group.tone_gain.gain.value)
            // We invert the value because it was transformed by EnvelopeVertical.vertical_exp
        ).apply(group.tone_gain.gain,
            EnvelopeHorizontal.offset_current_time,
            EnvelopeVertical.vertical_exp);

        this.oscillators[note.value] = null;
        let toneGain = group.tone_gain;
        let tone = group.tone;
        audio.removeNodesTimeout([toneGain, tone], this.params.release_length + 0.1);
    }

    get keyboardPlayEnabled() {
        return this.keyboard_mapping.enabled;
    }

    enableKeyboardPlay() {
        this.keyboard_mapping.enable();
    }

    disableKeyboardPlay() {
        this.keyboard_mapping.disable();
    }

    oscillatorApply(func) {
        for (let i = 0; i < 128; i++) {
            if (this.oscillators[i]) {
                func(this.oscillators[i], i);
            }
        }
    }
}

export { Piano };