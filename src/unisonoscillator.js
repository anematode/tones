import * as audio from "./audio.js";

function clamp(value, min, max, name) {
    if (value > max) {
        console.warn(`Value ${name} outside nominal range [${min}, ${max}]; value will be clamped.`);
        return max;
    } else if (value < min) {
        console.warn(`Value ${name} outside nominal range [${min}, ${max}]; value will be clamped.`);
        return min;
    } else {
        return value;
    }
}

const MAX_DETUNE_CENTS = 200;
const MIN_FREQUENCY = -22050;
const MAX_FREQUENCY = 22050;
const MIN_BLEND = 0.01;
const MAX_BLEND = 100;

class UnisonOscillator {
    constructor(parameters = {}) {

        this._frequency = clamp(parameters.frequency || 440, MIN_FREQUENCY, MAX_FREQUENCY, "frequency"); // frequency of average oscillation
        this._detune = clamp((parameters.detune === 0) ? 0 : (parameters.detune || 20), 0, MAX_DETUNE_CENTS, "detune"); // spread width of oscillators (symmetric)
        this._unison_obj = {value : parameters.unison || 4}; // Number of oscillators

        if (this.unison < 2) {
            throw new Error("Too little unison.");
        } else if (this.unison > 16) {
            throw new Error("Too much unison.");
        }

        Object.freeze(this._unison_obj);
        this._blend = clamp((parameters.blend === 0) ? 0 : (parameters.blend || 0.5), MIN_BLEND, MAX_BLEND, "blend"); // ratio (gain of centermost oscillators) / (gain of peripheral oscillators)
        this._type = parameters.type || "triangle"; // type of waveform

        this._context = audio.Context;
        this.exit_node = audio.Context.createGain();
        // this.exit_node.gain.setValueAtTime(1 / this.unison, 0);
        this.oscillators = [];

        let unison = this.unison;

        if (unison % 2 === 0) {
            let centerBlend = Math.sqrt(this._blend);
            let peripheralBlend = Math.sqrt(1 / Math.sqrt(this._blend));
            let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

            centerBlend /= loudness;
            peripheralBlend /= loudness;

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
                series.pan.pan.setValueAtTime(series.d * 2, 0);

                if (unison === 2) {

                } else if (i === unison / 2 - 1 || i === unison / 2) {
                    series.g.gain.setValueAtTime(centerBlend, 0);
                } else {
                    series.g.gain.setValueAtTime(peripheralBlend, 0);
                }

                audio.chainNodes([
                    series.o,
                    series.delay,
                    series.g,
                    series.pan,
                    this.exit_node
                ]);

                this.oscillators.push(series);
            }
        } else {
            let centerBlend = Math.sqrt(this._blend);
            let peripheralBlend = Math.sqrt(1 / Math.sqrt(this._blend));
            let loudness = centerBlend + (unison - 1) * peripheralBlend;

            centerBlend /= loudness;
            peripheralBlend /= loudness;

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
                series.pan.pan.setValueAtTime(series.d * 2, 0);

                if (i === (unison - 1) / 2) {
                    series.g.gain.setValueAtTime(Math.sqrt(this._blend), 0);
                } else {
                    series.g.gain.setValueAtTime(1 / Math.sqrt(this._blend), 0);
                }

                audio.chainNodes([
                    series.o,
                    series.delay,
                    series.g,
                    series.pan,
                    this.exit_node
                ]);

                this.oscillators.push(series);
            }
        }

        this.channelCount = 2;
        this.channelCountMode = "max";
        this.channelInterpretation = "speakers";

        let that = this;

        this.frequency = {
            setValueAtTime: (value, time) => {
                value = clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.setValueAtTime(value, time);
                }
            },
            linearRampToValueAtTime: (value, time) => {
                value = clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.linearRampToValueAtTime(value, time);
                }
            },
            exponentialRampToValueAtTime: (value, time) => {
                value = clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.exponentialRampToValueAtTime(value, time);
                }
            },
            setTargetAtTime: (value, startTime, constantTime) => {
                value = clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.setTargetAtTime(value, startTime, constantTime);
                }
            },
            setValueCurveAtTime: (table, startTime, endTime) => {
                for (let i = 0; i < table.length; i++) {
                    table[i] = clamp(table[i], MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                }
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.setValueCurveAtTime(table, startTime, endTime);
                }
            },
            cancelScheduledValues: () => {
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].o.frequency.cancelScheduledValues();
                }
            },
            get value() {
                return that.oscillators[0].o.frequency.value;
            },
            set value(value) {
                value = clamp(value, MIN_FREQUENCY, MAX_FREQUENCY, "frequency");
                for (let i = 0; i < that.unison; i++) {
                    that.oscillators[i].o.frequency.value = value;
                }
            }
        };

        Object.defineProperties(this.frequency, {
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
        });

        this.detune = {
            setValueAtTime: (value, time) => {
                value = clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.setValueAtTime(series.d * value, time);
                }
            },
            linearRampToValueAtTime: (value, time) => {
                value = clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.linearRampToValueAtTime(series.d * value, time);
                }
            },
            exponentialRampToValueAtTime: (value, time) => {
                value = clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.exponentialRampToValueAtTime(series.d * value, time);
                }
            },
            setTargetAtTime: (value, startTime, constantTime) => {
                value = clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.setTargetAtTime(series.d * value, startTime, constantTime);
                }
            },
            setValueCurveAtTime: (table, startTime, endTime) => {
                for (let i = 0; i < table.length; i++) {
                    table[i] = clamp(table[i], 0, that.detune.maxValue, "detune");
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
            },
            get value() {
                return that.oscillators[0].o.detune.value / that.oscillators[0].d;
            },
            set value(value) {
                value = clamp(value, 0, that.detune.maxValue, "detune");

                for (let i = 0; i < this.unison; i++) {
                    let series = this.oscillators[i];
                    series.o.detune.value = series.d * value;
                }
            }
        };

        Object.defineProperties(this.detune, {
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
        });

        // TODO: Allow blend enveloping and such, not trivial, might not actually do it
        this.blend = {
            /*setValueAtTime: (value, time) => {
                let centerBlend = Math.sqrt(this._blend);
                let peripheralBlend = Math.sqrt(1 / Math.sqrt(this._blend));
                let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                centerBlend /= loudness;
                peripheralBlend /= loudness;
            }*/
            get value() {
                return that._blend;
            },
            set value(value) {
                console.log(value);
                value = clamp(value, MIN_BLEND, MAX_BLEND, "blend");
                if (that.unison % 2 === 0) {
                    let centerBlend = Math.sqrt(that._blend);
                    let peripheralBlend = Math.sqrt(1 / Math.sqrt(that._blend));
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    centerBlend /= loudness;
                    peripheralBlend /= loudness;

                    for (let i = 0; i < that.unison; i++) {
                        console.log(i);
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.value = centerBlend;
                        } else {
                            series.g.gain.value = peripheralBlend;
                        }
                    }
                } else {
                    let centerBlend = Math.sqrt(that._blend);
                    let peripheralBlend = Math.sqrt(1 / Math.sqrt(that._blend));
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    centerBlend /= loudness;
                    peripheralBlend /= loudness;

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.setValueAtTime(centerBlend, 0);
                        } else {
                            series.g.gain.setValueAtTime(peripheralBlend, 0);
                        }
                    }
                }
                console.log('e');
            }
        };

        Object.defineProperties(this.blend, {
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
        });

        delete this._frequency;
        delete this._detune;
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

    connect(node) {
        this.exit_node.connect(node);
    }

    disconnect() {
        this.exit_node.disconnect();
    }

    start(time = this._context.currentTime) {
        for (let i = 0; i < this.oscillators.length; i++) {
            let series = this.oscillators[i];

            series.o.start(time);
        }
    }

    stop(time = this._context.currentTime) {
        for (let i = 0; i < this.oscillators.length; i++) {
            let series = this.oscillators[i];

            series.o.stop(time);
        }
    }


}

export {UnisonOscillator};