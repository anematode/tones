import * as audio from "./audio.js";
import * as utils from "../utils.js";
import {SourceNode} from "./node.js";

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

class UnisonOscillator extends SourceNode {
    constructor(parameters = {}) {
        super(parameters.context);

        this._frequency = utils.clamp(parameters.frequency || 440, MIN_FREQUENCY, MAX_FREQUENCY, "frequency"); // frequency of average oscillation
        this._detune = utils.clamp((parameters.detune === 0) ? 0 : (parameters.detune || 20), 0, MAX_DETUNE_CENTS, "detune"); // spread width of oscillators (symmetric)
        this._unison_obj = {value : utils.clamp((parameters.unison || 4), 2, MAX_UNISON)}; // Number of oscillators

        Object.freeze(this._unison_obj);
        this._blend = utils.clamp((parameters.blend === 0) ? 0 : (parameters.blend || 0.5), MIN_BLEND, MAX_BLEND, "blend"); // ratio (gain of centermost oscillators) / (gain of peripheral oscillators)
        this._type = parameters.type || "triangle"; // type of waveform

        this._context = audio.Context;
        this.oscillators = [];

        let unison = this.unison;

        if (unison % 2 === 0) {
            let centerBlend = this._blend;
            let peripheralBlend = 1 - this._blend;
            let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

            this.exit.gain.value = 1 / loudness;

            for (let i = 0; i < unison; i++) {
                let series = {d: (i - unison / 2 + 1 / 2) / (unison - 1),
                    o: audio.Context.createOscillator(),
                    g: audio.Context.createGain(),
                    delay: audio.Context.createDelay(),
                    pan: audio.Context.createStereoPanner()
                };

                series.o.frequency.setValueAtTime(this._frequency, 0);
                series.o.detune.setValueAtTime(series.d * this._detune, 0);
                series.o.type = this._type;
                series.delay.delayTime.setValueAtTime(1 / this._frequency * Math.random(), 0);

                if (unison === 2) {
                    series.pan.pan.setValueAtTime(series.d * 2, 0);
                } else {
                    series.pan.pan.setValueAtTime(blendMapping(series.d * 2), 0);
                }

                if (i === unison / 2 - 1 || i === unison / 2 || unison === 2) {
                    series.g.gain.setValueAtTime(centerBlend, 0);
                } else {
                    series.g.gain.setValueAtTime(peripheralBlend, 0);
                }

                audio.chainNodes([
                    series.o,
                    series.delay,
                    series.g,
                    series.pan,
                    this.exit
                ]);

                this.oscillators.push(series);
            }
        } else {
            let centerBlend = this._blend;
            let peripheralBlend = 1 - this._blend;
            let loudness = centerBlend + (unison - 1) * peripheralBlend;

            this.exit.gain.value = 1 / loudness;

            for (let i = 0; i < unison; i++) {
                let series = {d: (i - unison / 2 + 1 / 2) / (unison - 1),
                    o: audio.Context.createOscillator(),
                    g: audio.Context.createGain(),
                    delay: audio.Context.createDelay(),
                    pan: audio.Context.createStereoPanner()
                };

                series.o.frequency.setValueAtTime(this._frequency, 0);
                series.o.detune.setValueAtTime(series.d * this._detune, 0);
                series.o.type = this._type;
                series.delay.delayTime.setValueAtTime(1 / this._frequency * Math.random(), 0);

                if (unison === 3) {
                    series.pan.pan.setValueAtTime(series.d * 2, 0);
                } else {
                    series.pan.pan.setValueAtTime(blendMapping(series.d * 2), 0);
                }

                if (i === (unison - 1) / 2) {
                    series.g.gain.setValueAtTime(centerBlend, 0);
                } else {
                    series.g.gain.setValueAtTime(peripheralBlend, 0);
                }

                audio.chainNodes([
                    series.o,
                    series.delay,
                    series.g,
                    series.pan,
                    this.exit
                ]);

                this.oscillators.push(series);
            }
        }

        let that = this;

        this.frequency = {
            /*setValueAtTime: (value, time) => {
                value = utils.clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.setValueAtTime(value, time);
                }
            },
            linearRampToValueAtTime: (value, time) => {
                value = utils.clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.linearRampToValueAtTime(value, time);
                }
            },
            exponentialRampToValueAtTime: (value, time) => {
                value = utils.clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.exponentialRampToValueAtTime(value, time);
                }
            },
            setTargetAtTime: (value, startTime, constantTime) => {
                value = utils.clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.setTargetAtTime(value, startTime, constantTime);
                }
            },
            setValueCurveAtTime: (table, startTime, endTime) => {
                for (let i = 0; i < table.length; i++) {
                    table[i] = utils.clamp(table[i], MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                }
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.setValueCurveAtTime(table, startTime, endTime);
                }
            },
            cancelScheduledValues: () => {
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.cancelScheduledValues();
                }
            },*/
            get value() {
                return that.oscillators[0].o.frequency.value;
            },
            set value(value) {
                value = utils.clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < that.unison; i++) {
                    that.oscillators[i].o.frequency.value = value;
                }
            }
        };

        /*Object.defineProperties(this.frequency, {
            minValue: {
                value: MIN_FREQUENCY,
                writable: false
            },
            maxValue: {
                value: MAX_FREQUENCY,
                writable: false
            },
            defaultValue: {
                value: 440,
                writable: false
            }
        });*/

        this.detune = {
            /*setValueAtTime: (value, time) => {
                value = utils.clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.setValueAtTime(series.d * value, time);
                }
            },
            linearRampToValueAtTime: (value, time) => {
                value = utils.clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.linearRampToValueAtTime(series.d * value, time);
                }
            },
            exponentialRampToValueAtTime: (value, time) => {
                value = utils.clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.exponentialRampToValueAtTime(series.d * value, time);
                }
            },
            setTargetAtTime: (value, startTime, constantTime) => {
                value = utils.clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.setTargetAtTime(series.d * value, startTime, constantTime);
                }
            },
            setValueCurveAtTime: (table, startTime, endTime) => {
                for (let i = 0; i < table.length; i++) {
                    table[i] = utils.clamp(table[i], 0, that.detune.maxValue, "detune");
                }
                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    let newTable = table.slice();

                    for (let j = 0; j < newTable.length; j++) {
                        newTable[j] = series.d * newTable[j];
                    }

                    series.o.detune.setValueCurveAtTime(newTable, startTime, endTime);
                }
            },
            cancelScheduledValues: () => {
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.detune.cancelScheduledValues();
                }
            },*/
            get value() {
                return that.oscillators[0].o.detune.value / that.oscillators[0].d;
            },
            set value(value) {
                value = utils.clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < that.unison; i++) {
                    let series = that.oscillators[i];
                    series.o.detune.value = series.d * value;
                }
            }
        };

        /*Object.defineProperties(this.detune, {
            minValue: {
                value: 0,
                writable: false
            },
            maxValue: {
                value: MAX_DETUNE_CENTS,
                writable: false
            },
            defaultValue: {
                value: 50,
                writable: false
            }
        });*/

        // TODO: Allow blend enveloping and such, not trivial, might not actually do it
        this.blend = {
            get value() {
                if (that.unison % 2 === 0) {
                    return that.oscillators[that.unison / 2].g.gain.value;
                } else {
                    return that.oscillators[(that.unison - 1) / 2].g.gain.value;
                }
            },
            set value(value) {
                value = utils.clamp(value, MIN_BLEND, MAX_BLEND, "blend");
                if (that.unison % 2 === 0) {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    that.exit.gain.value = 1 / loudness;

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === unison / 2 - 1 || i === unison / 2 || unison === 2) {
                            series.g.gain.value = centerBlend;
                        } else {
                            series.g.gain.value = peripheralBlend;
                        }
                    }
                } else {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    that.exit.gain.value = 1 / loudness;

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.setValueAtTime(centerBlend, 0);
                        } else {
                            series.g.gain.setValueAtTime(peripheralBlend, 0);
                        }
                    }
                }
            }
        };

        /*Object.defineProperties(this.blend, {
            minValue: {
                value: MIN_BLEND,
                writable: false
            },
            maxValue: {
                value: MAX_BLEND,
                writable: false
            },
            defaultValue: {
                value: 0.5,
                writable: false
            }
        });*/

        delete this._frequency;
        delete this._detune;
        delete this._blend;
    }

    get unison() {
        return this._unison_obj.value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
        for (let i = 0; i < this.unison; i++) {
            this.oscillators[i].o.type = value;
        }
    }

    static get numberOfInputs() {
        return 0;
    }

    static get numberOfOutputs() {
        return 1;
    }

    static get context() {
        return this._context;
    }

    start(time = this._context.currentTime) {
        for (let i = 0; i < this.oscillators.length; i++) {
            let series = this.oscillators[i];

            series.o.start(time);
        }
    }

    stop(time = this._context.currentTime) {
        //console.log(this.oscillators);

        for (let i = 0; i < this.oscillators.length; i++) {
            let series = this.oscillators[i];

            series.o.stop(time);
        }
    }
}

export {UnisonOscillator};