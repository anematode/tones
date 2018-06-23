import { KeyboardInstrument } from "./keyboardinstrument.js";
import { KeyboardMapping, getDefaultKeyboardDict } from "./keyboardmapping.js";
import * as audio from "./audio.js";
import {EnvelopeSegment, Envelope, EnvelopeVertical, EnvelopeHorizontal} from "./envelope.js";
import {EnvelopeVerticalInverse} from "./envelope.js";
import {UnisonOscillator} from "./unisonoscillator.js";
import {PitchMappings} from "./pitchmapping.js";

let a = new EnvelopeSegment([0,0], [0.01,1]);
let b = new EnvelopeSegment(a.p2, [1, 0.2], 0.4);

const DefaultAttackEnvelope = new Envelope([a,b]);

class SimpleInstrument extends KeyboardInstrument {
    constructor(parameters = {}, destinationNode = audio.masterEntryNode) {
        super(destinationNode);

        this.params = {};

        this.params.unison = parameters.unison || 8; // Unison (integer > 1)
        this.params.detune = (parameters.detune === 0) ? 0 : (parameters.detune || 20); // Spread of detune (cents)
        this.params.blend = (parameters.blend === 0) ? 0 : (parameters.blend || 0.6); // Blend between central and peripheral oscillators
        this.params.release_length = (parameters.release_length === 0) ? 0 : (parameters.release_length || 0.1); // Decay (sec)
        this.params.attack_envelope = (parameters.attack_envelope || DefaultAttackEnvelope);

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
        let tone = new UnisonOscillator(this.params);
        // let tone = audio.Context.createOscillator();
        let tone_gain = audio.Context.createGain();

        audio.chainNodes([
            tone,
            tone_gain,
            this.entryNode]);

        tone.type = 'square';
        tone.frequency.value = this.pitch_mapping.transform(note);
        tone_gain.gain.setValueAtTime(0, 0);
        tone.start();

        this.params.attack_envelope.apply(tone_gain.gain,
            EnvelopeHorizontal.offset_current_time,
            EnvelopeVertical.vertical_exp);

        this.oscillators[note.value] = {tone: tone, tone_gain: tone_gain};
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

export {SimpleInstrument};