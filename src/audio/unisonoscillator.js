import * as audio from "./audio.js";
import * as utils from "../utils.js";
import {SourceNode, ParameterValue, LinearParameterTransform, ParameterAdd, ParameterConstantMultiply} from "./node.js";

const MAX_DETUNE_CENTS = 200;
const MIN_FREQUENCY = -22050;
const MAX_FREQUENCY = 22050;
const MIN_BLEND = 0;
const MAX_BLEND = 1;
const MAX_UNISON = 16;

function blendMapping(x) {
    if (x === 0) {
        return 0;
    } else if (0 < x && x <= 1) {
        return x - 1;
    } else {
        return x + 1;
    }
}

function redirectChain(...args) {
    return audio.chainNodes(...args);
}

class UnisonOscillator extends SourceNode {
    constructor(prms = {}) {
        super(prms.context);

        let frequency = utils.select(prms.frequency, 440);
        let frequency_detune = utils.select(prms.frequency_detune, 0);
        let detune = utils.select(prms.detune, 20);
        let unison = utils.select(prms.unison, 4);
        let blend = utils.select(prms.blend, 0.3);
        let stereo = utils.select(prms.stereo, 1);

        let freq_c = frequency.connect ? frequency : new ParameterValue(frequency, "freq");
        let freq_det_c = frequency_detune.connect ? frequency_detune : new ParameterValue(frequency_detune);
        let det_c = detune.connect ? detune : new ParameterValue(detune, "det");
        let stereo_c = stereo.connect ? stereo : new ParameterValue(stereo, "width");
        let blend_c = blend.connect ? blend : new ParameterValue(blend, "blend");

        this.frequency = freq_c.value;
        this.frequency_detune = freq_det_c.value;
        this.detune = det_c.value;
        this.stereo = stereo_c.value;
        this.blend = blend_c.value;

        this.stop_at_destruction = [];

        Object.defineProperty(this, "unison", {
            value: unison,
            writable: false
        });

        this.oscillators = [];

        let peripheral = blend_c.invert().add(1);
        let center = blend_c;

        for (let i = 0; i < unison; i++) {
            let series = {
                o: audio.Context.createOscillator(),
                g: audio.Context.createGain(),
                p: audio.Context.createStereoPanner()
            };

            series.o.frequency.value = 0;
            freq_c.connect(series.o.frequency); // Connect the frequency controller to the oscillator's frequency

            let range = (2 * i - unison + 1) / (2 * unison - 2);

            let detune_multiplier = det_c.multiply(range);
            detune_multiplier.connect(series.o.detune);

            freq_det_c.connect(series.o.detune);

            let stereo_multiplier = stereo_c.multiply(blendMapping(2 * range));
            stereo_multiplier.connect(series.p.pan);

            let blend_multiplier;

            if (unison === 2) {
                blend_multiplier = new ParameterValue(0.5);
            } else if (unison % 2 === 0) {
                if (i === unison / 2 || i === unison / 2 - 1) {
                    blend_multiplier = center.multiply(0.5);
                } else {
                    blend_multiplier = peripheral.multiply(1 / (unison - 2));
                }
            } else {
                if (i === (unison - 1) / 2) {
                    blend_multiplier = center;
                } else {
                    blend_multiplier = peripheral.multiply(1 / (unison - 1));
                }
            }

            series.g.gain.value = 0;

            blend_multiplier.connect(series.g.gain);

            audio.chainNodes([
                ...Object.values(series), this.exit
            ]);

            this.oscillators.push(series);
            this.stop_at_destruction.push(stereo_multiplier, blend_multiplier, detune_multiplier);
        }

        this.stop_at_destruction.push(stereo_c, blend_c, freq_c, det_c, freq_det_c, peripheral);
    }

    get type() {
        return this.oscillators[0].o.type;
    }

    set type(value) {
        for (let i = 0; i < this.unison; i++) {
            this.oscillators[i].o.type = value;
        }
    }

    setWave(wave) {
        for (let i = 0; i < this.unison; i++) {
            this.oscillators[i].o.setPeriodicWave(wave);
        }
    }

    start(time = audio.Context.currentTime) {
        let len = this.oscillators.length;
        for (let i = 0; i < len; i++) {
            let series = this.oscillators[i];

            series.o.start(time + 4 / this.frequency.value * (Math.random() * i) / len);
        }
    }

    stop(time = audio.Context.currentTime) {
        this.stop_at_destruction.forEach(x => {
            x.stop(time);
        });

        for (let i = 0; i < this.oscillators.length; i++) {
            let series = this.oscillators[i];

            series.o.stop(time);
        }
    }
}

export {UnisonOscillator};