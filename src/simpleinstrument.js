import { KeyboardInstrument } from "./keyboardinstrument.js";
import { KeyboardMapping, getDefaultKeyboardDict } from "./keyboardmapping.js";
import * as audio from "./audio.js";
import {EnvelopeSegment, Envelope, EnvelopeVertical, EnvelopeHorizontal} from "./envelope.js";
import {EnvelopeVerticalInverse} from "./envelope.js";
import {UnisonOscillator} from "./unisonoscillator.js";

class SimpleInstrument extends KeyboardInstrument {
    constructor(dict, destinationNode = audio.masterEntryNode) {
        super(destinationNode);

        this.oscillators = {};
        for (let i = 0; i < 128; i++) {
            this.oscillators[i] = null;
        }

        let a = new EnvelopeSegment([0,0], [0.01,1]);
        let b = new EnvelopeSegment(a.p2, [1, 0.2], 0.4);

        this.attackenvelope = new Envelope([a,b]);
        this.decaylength = 0.1;

        this.createDecayEnvelope = (gain_value) => {
            return new Envelope([new EnvelopeSegment([0, gain_value], [this.decaylength, 0])]);
        };

        this.mapping = new KeyboardMapping(dict, (note, pressing) => {
            if (!note) return;
            if (pressing) {
                this.play(note);
            } else {
                this.release(note);
            }
        });
    }

    onplay(note) {
        console.log(note.name(), "play");
        let tone = new UnisonOscillator({detune: 20, unison: 8, blend: 0.5});
        // let tone = audio.Context.createOscillator();
        let tone_gain = audio.Context.createGain();

        audio.chainNodes([
            tone,
            tone_gain,
            this.entryNode]);

        tone.type = 'square';
        tone.frequency.value = note.twelveTETFrequency();
        tone_gain.gain.setValueAtTime(0, 0);
        tone.start();

        this.attackenvelope.apply(tone_gain.gain,
            EnvelopeHorizontal.offset_current_time,
            EnvelopeVertical.vertical_exp);

        this.oscillators[note.value] = {tone: tone, tone_gain: tone_gain};
    }

    onrelease(note) {
        console.log(note.name(), "release");
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
        audio.removeNodesTimeout([toneGain, tone], this.decaylength + 0.1);
    }

    get keyboardPlayEnabled() {
        return this.mapping.enabled;
    }

    enableKeyboardPlay() {
        this.mapping.enable();
    }

    disableKeyboardPlay() {
        this.mapping.disable();
    }
}

class Ian {
    constructor(note) {
        this.note = note;
    }
    disconnect() {
        console.log(this.note.name() + " destroyed");
    }
}

export {SimpleInstrument};