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
const MIN_BLEND = 0;
const MAX_BLEND = 1;
const MAX_UNISON = 16;

function udderMap(x) {
    if (x === 0) {
        return 0;
    } else if (0 < x && x <= 1) {
        return x - 1;
    } else {
        return x + 1;
    }
}

class UnisonOscillator {
    constructor(parameters = {}) {

        this._frequency = clamp(parameters.frequency || 440, MIN_FREQUENCY, MAX_FREQUENCY, "frequency"); // frequency of average oscillation
        this._detune = clamp((parameters.detune === 0) ? 0 : (parameters.detune || 20), 0, MAX_DETUNE_CENTS, "detune"); // spread width of oscillators (symmetric)
        this._unison_obj = {value : clamp((parameters.unison || 4), 2, MAX_UNISON)}; // Number of oscillators

        Object.freeze(this._unison_obj);
        this._blend = clamp((parameters.blend === 0) ? 0 : (parameters.blend || 0.5), MIN_BLEND, MAX_BLEND, "blend"); // ratio (gain of centermost oscillators) / (gain of peripheral oscillators)
        this._type = parameters.type || "triangle"; // type of waveform

        this._context = audio.Context;
        this.exit_node = audio.Context.createGain();
        // this.exit_node.gain.setValueAtTime(1 / this.unison, 0);
        this.oscillators = [];

        let unison = this.unison;

        if (unison % 2 === 0) {
            let centerBlend = this._blend;
            let peripheralBlend = 1 - this._blend;
            let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

            this.exit_node.gain.value = 1 / loudness;

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
                series.pan.pan.setValueAtTime(udderMap(series.d * 2), 0);

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
            let centerBlend = this._blend;
            let peripheralBlend = 1 - this._blend;
            let loudness = centerBlend + (unison - 1) * peripheralBlend;

            this.exit_node.gain.value = 1 / loudness;

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
                series.pan.pan.setValueAtTime(udderMap(series.d * 2), 0);

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
                if (that.unison % 2 === 0) {
                    return that.oscillators[that.unison / 2].g.gain.value;
                } else {
                    return that.oscillators[(that.unison - 1) / 2].g.gain.value;
                }
            },
            set value(value) {
                value = clamp(value, MIN_BLEND, MAX_BLEND, "blend");
                if (that.unison % 2 === 0) {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    that.exit_node.gain.value = 1 / loudness;

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.value = centerBlend;
                        } else {
                            series.g.gain.value = peripheralBlend;
                        }
                    }
                } else {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    that.exit_node.gain.value = 1 / loudness;

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.setValueAtTime(centerBlend, 0);
                        } else {
                            series.g.gain.setValueAtTime(peripheralBlend, 0);
                        }
                    }
                }
            },
            setValueAtTime(value, time) {
                value = clamp(value, MIN_BLEND, MAX_BLEND, "blend");
                if (that.unison % 2 === 0) {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    that.exit_node.gain.setValueAtTime(1 / loudness, time);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.setValueAtTime(centerBlend, time);
                        } else {
                            series.g.gain.setValueAtTime(peripheralBlend, time);
                        }
                    }
                } else {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    that.exit_node.gain.setValueAtTime(1 / loudness, time);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.setValueAtTime(centerBlend, time);
                        } else {
                            series.g.gain.setValueAtTime(peripheralBlend, time);
                        }
                    }
                }
            },
            linearRampToValueAtTime: (value, time) => {
                value = clamp(value, MIN_BLEND, MAX_BLEND, "blend");
                if (that.unison % 2 === 0) {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    that.exit_node.gain.linearRampToValueAtTime(1 / loudness, time);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.linearRampToValueAtTime(centerBlend, time);
                        } else {
                            series.g.gain.linearRampToValueAtTime(peripheralBlend, time);
                        }
                    }
                } else {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    that.exit_node.gain.linearRampToValueAtTime(1 / loudness, time);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.linearRampToValueAtTime(centerBlend, time);
                        } else {
                            series.g.gain.linearRampToValueAtTime(peripheralBlend, time);
                        }
                    }
                }
            },
            exponentialRampToValueAtTime: (value, time) => {
                console.warn("exponentialRampToValueAtTime for UnisonOscillator.blend does not work well.");

                value = clamp(value, MIN_BLEND, MAX_BLEND, "blend");

                if (that.unison % 2 === 0) {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    that.exit_node.gain.exponentialRampToValueAtTime(1 / loudness, time);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.exponentialRampToValueAtTime(centerBlend, time);
                        } else {
                            series.g.gain.exponentialRampToValueAtTime(peripheralBlend, time);
                        }
                    }
                } else {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    that.exit_node.gain.value = 1 / loudness;

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.exponentialRampToValueAtTime(centerBlend, time);
                        } else {
                            series.g.gain.exponentialRampToValueAtTime(peripheralBlend, time);
                        }
                    }
                }
            },
            setTargetAtTime: (value, startTime, constantTime) => {
                value = clamp(value, MIN_BLEND, MAX_BLEND, "blend");
                if (that.unison % 2 === 0) {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = 2 * centerBlend + (unison - 2) * peripheralBlend;

                    that.exit_node.gain.setTargetAtTime(1 / loudness, startTime, constantTime);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.setTargetAtTime(centerBlend, startTime, constantTime);
                        } else {
                            series.g.gain.setTargetAtTime(peripheralBlend, startTime, constantTime);
                        }
                    }
                } else {
                    let centerBlend = value;
                    let peripheralBlend = 1 - value;
                    let loudness = centerBlend + (unison - 1) * peripheralBlend;

                    that.exit_node.gain.linearRampToValueAtTime(1 / loudness, startTime, constantTime);

                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.setTargetAtTime(centerBlend, startTime, constantTime);
                        } else {
                            series.g.gain.setTargetAtTime(peripheralBlend, startTime, constantTime);
                        }
                    }
                }
            },
            setValueCurveAtTime: (table, startTime, endTime) => {
                for (let i = 0; i < table.length; i++) {
                    table[i] = clamp(table[i], MIN_BLEND, MAX_BLEND, "blend");
                }
                let centerBlendTable = new Float32Array(table.length);
                let peripheralBlendTable = centerBlendTable.slice();
                let loudnessTable = centerBlendTable.slice();

                for (let i = 0; i < table.length; i++) {
                    let value = i;
                    if (that.unison % 2 === 0) {
                        var centerBlend_ = value;
                        var peripheralBlend_ = 1 - value;
                        var loudness_ = 2 * centerBlend_ + (unison - 2) * peripheralBlend_;
                    } else {
                        var centerBlend_ = value;
                        var peripheralBlend_ = 1 - value;
                        var loudness_ = centerBlend_ + (unison - 1) * peripheralBlend_;
                    }

                    centerBlendTable[i] = centerBlend_;
                    peripheralBlendTable[i] = peripheralBlend_;
                    loudnessTable[i] = 1 / loudness_;
                }

                if (that.unison % 2 === 0) {
                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (unison === 2) {

                        } else if (i === unison / 2 - 1 || i === unison / 2) {
                            series.g.gain.setValueCurveAtTime(centerBlendTable, startTime, endTime);
                        } else {
                            series.g.gain.setValueCurveAtTime(peripheralBlendTable, startTime, endTime);
                        }
                    }
                } else {
                    for (let i = 0; i < that.unison; i++) {
                        let series = that.oscillators[i];

                        if (i === (unison - 1) / 2) {
                            series.g.gain.setValueCurveAtTime(centerBlendTable, startTime, endTime);
                        } else {
                            series.g.gain.setValueCurveAtTime(peripheralBlendTable, startTime, endTime);
                        }
                    }
                }

                this.exit_node.gain.setValueCurveAtTime(loudnessTable, startTime, endTime);
            },
            cancelScheduledValues: () => {
                for (let i = 0; i < this.unison; i++) {
                    this.oscillators[i].g.gain.cancelScheduledValues();
                }
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