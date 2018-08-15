import * as audio from "./audio.js";
import * as utils from "../utils.js";

class BaseNode {

}

class SourceNode extends BaseNode {
    constructor(exit) {
        super();

        this.exit = utils.select((exit instanceof AudioNode) ? exit : undefined, audio.Context.createGain()); // exit to node
        this.destroyed = false;
    }

    connect(x) { // connect to node
        this._checkDestroyed();

        utils.assert(x instanceof BaseNode || x instanceof AudioNode || x instanceof AudioParam, `Invalid node to connect to: ${x}`);

        if (this._connect) {
            this._connect(x);
        }

        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else if (x instanceof EndingNode) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }
        return this;
    }

    disconnect(x) { // disconnect from node
        this._checkDestroyed();

        if (this._disconnect) {
            this._disconnect(x);
        }

        if (!x) {
            this.exit.disconnect();
        } else if (x instanceof Node) {
            this.exit.disconnect(x.entry);
        } else if (x instanceof EndingNode) {
            this.exit.disconnect(x.entry);
        } else {
            this.exit.disconnect(x);
        }

        return this;
    }

    _checkDestroyed() {
        if (this.destroyed)
            throw new Error("Node is destroyed");
    }

    isDestroyed() {
        return this.destroyed;
    }

    destroy() {
        if (this.destroyed)
            return;

        if (this._destroy) {
            this._destroy();
        }

        try {
            this.stop(time);
        } catch (e) {
        }

        this.disconnect();
        this.connect(audio.voidNode); // allow further render quantums so the stop call propagates

        setTimeout(() => {
            this.exit.disconnect();
        }, 1000); // Disconnect it later

        this.destroyed = true;
    }

    connectMaster() { // connect the node to master
        this.connect(audio.master);
    }

    multiply(a) {
        return new ParameterConstantMultiply(this, a);
    }

    add(a) {
        return new ParameterAdd(this, a);
    }

    invert() {
        return this.multiply(-1);
    }
}


/*
General node class with input and output
*/
class Node extends SourceNode {
    constructor() {
        super();

        this.entry = audio.Context.createGain(); // entry to node
    }
}

/*
node with no output
*/
class EndingNode extends BaseNode {
    constructor() {
        super();

        this.entry = audio.Context.createGain();
        this.sources = [];
    }

    connectFrom(node) { // connect from input node
        node.connect(this.entry);
        this.sources.push(node);
    }
    
    connectFromMaster() { // connect from master node
        this.connectFrom(audio.master);
    }

    disconnectFrom(node) { // disconnect from node
        if (!node) {
            this.sources.forEach(x => {
                try {
                    x.disconnect(this.entry)
                } catch (e) {

                }
            });

            this.sources = [];
        } else {
            let index = this.sources.findIndex(node);

            if (index === -1)
                throw new Error("Node is not connected to this");

            this.sources.splice(index, 1);

            try {
                node.disconnect(this.entry)
            } catch (e) {

            }
        }
    }
}

/*
Parameter manipulation node
 */
class ParameterValue extends SourceNode {
    constructor(value = 0) {
        super();

        this.source = audio.Context.createConstantSource();
        this.value = this.source.offset;

        if (value !== undefined)
            this.value.value = value;

        this.source.connect(this.exit);
        this.source.start();
    }

    stop(time) {
        this.source.stop(time);
        this.exit.connect(audio.voidNode);

        this.source.onended = () => {
            this.exit.disconnect();
        }
    }

    get isParameterValue() {
        return true;
    }
}

const clean_up = time => x => {
    if (x.isParameterValue) {
        x.stop(time);
    }
};

class ParameterMultiply extends SourceNode {
    constructor(x, a) {
        super();

        this.a_node = (a.connect) ? a : new ParameterValue(a);
        this.x_node = (x.connect) ? x : new ParameterValue(x);

        this.exit.gain.value = 0;

        this.a_node.connect(this.exit.gain);
        this.x_node.connect(this.exit);

        this.a = this.a_node.isParameterValue ? this.a_node.value : this.a_node;
        this.x = this.x_node.isParameterValue ? this.x_node.value : this.x_node;
    }

    stop(time) {
        [this.a_node, this.x_node].forEach(clean_up(time));
    }
}

class ParameterConstantMultiply extends SourceNode {
    constructor(x, a) {
        super();

        this.exit.gain.value = a;

        x.connect(this.exit);
    }

    stop(time) {

    }
}

/*
Parameter linear node
 */
class LinearParameterTransform extends SourceNode {
    constructor(x, a, b) {
        super();
        // transformation ax + b

        this.a_node = (a.connect) ? a : new ParameterValue(a);
        this.b_node = (b.connect) ? b : new ParameterValue(b);
        this.x_node = (x.connect) ? x : new ParameterValue(x);

        this.a_gain = audio.Context.createGain();

        this.a_gain.gain.value = 0;

        this.a_node.connect(this.a_gain.gain);
        this.x_node.connect(this.a_gain);

        this.a_gain.connect(this.exit);
        this.b_node.connect(this.exit);

        this.a = this.a_node.isParameterValue ? this.a_node.value : this.a_node;
        this.b = this.b_node.isParameterValue ? this.b_node.value : this.b_node;
        this.x = this.x_node.isParameterValue ? this.x_node.value : this.x_node;
    }

    stop(time) {
        [this.a_node, this.b_node, this.x_node].forEach(clean_up(time));
    }
}

/*
Parameter add
 */
class ParameterAdd extends SourceNode {
    constructor(x, y) {
        super();

        this.x_node = (x.connect) ? x : new ParameterValue(x);
        this.y_node = (y.connect) ? y : new ParameterValue(y);

        this.exit.gain.value = 0;

        this.x_node.connect(this.exit);
        this.y_node.connect(this.exit);
    }


    stop(time) {
        [this.x_node, this.y_node].forEach(clean_up(time));
    }
}

const PARAMTYPES = {
    "frequency": {
        min: -Infinity, max: Infinity,
        convert: function (x) {
            if (utils.isString(x)) {
                try {
                    return new KeyboardPitch(x).twelveTETFrequency();
                } catch (e) {
                    throw new Error(`Unknown frequency ${x}`);
                }
            } else if (utils.isNumeric(x)) {
                return x;
            }
        }
    },

    "none": {
        min: -Infinity, max: Infinity,
        convert: x => x
    },

    "gain": {
        min: -Infinity, max: Infinity,
        convert: function (x) {
            if (utils.isNumeric(x)) {
                return x;
            } else {
                return Math.pow(10, parseFloat(x) / 20); // assume decibels
            }
        }
    }
};

function linearRampInterpolate(x1, y1, x2, y2, x) {
    if (x < x1)
        return y1;
    else if (x > x2)
        return y2;
    else
        return (x - x1) / (x2 - x1) * (y2 - y1) + y1;
}

function expRampInterpolate(x1, y1, x2, y2, x) {
    if (x < x1)
        return y1;
    else if (x > x2)
        return y2;
    else
        return y1 * Math.pow(y2 / y1, (x - x1) / (x2 - x1));
}

function targetInterpolate(x1, y1, y2, time_constant, x) {
    if (x < x1)
        return y1;
    else
        return y2 + (y1 - y2) * Math.exp(-(x - x1) / time_constant);
}

/*
An audioparam wrapper with some udderly things
 */
class Param extends EndingNode { // meant for an easier interface TODO
    constructor(p, type = "none", min = -Infinity, max = Infinity) {
        super();

        this._param = p; // associated Web Audio param

        p.cancelScheduledValues(0);
        p.value = 0;

        this.entry.connect(this._param);

        this.type = type;

        try {
            this.min = utils.select(PARAMTYPES[this.type].min, min);
            this.max = utils.select(PARAMTYPES[this.type].max, max);
        } catch (e) {
            throw new Error(`type ${this.type} is invalid`);
        }

        this.value_convert = PARAMTYPES[this.type].convert;
        this._value = this._param.value;

        Object.defineProperty(this, "defaultValue", {
            value: this._param.defaultValue,
            writable: false
        });

        this.events = [];
        this.setValueAtTime(0, 0);
    }

    get value() {
        return this._param.value;
    }

    set value(v) {
        this._param.value = v;
    }

    _getEventBefore(t) {
        for (let i = 0; i < this.events.length; i++) {
            let event = this.events[i];

        }
    }

    valueAt(t = audio.Context.currentTime) {
        let index = this._eventIndex(t);
        let event = this.events[index];

        switch (event.type) {
            case "set":
                return event.y1;
            case "exp":
                return expRampInterpolate(event.x1, event.y1, event.x2, event.y2, t);
            case "lin":
                return linearRampInterpolate(event.x1, event.y1, event.x2, event.y2, t);
            case "tar": {
                let value;

                if (index - 1 >= 0) {
                    value = this.events[index - 1].y2;
                } else {
                    value = this._param.defaultValue;
                }

                return targetInterpolate(event.x1, value, event.y2, event.tc, t);
            }
            case "cur":
                return curveInterpolate(event.values, event.x1, event.x2);
            default:
                throw new Error(`Unknown event type ${event.type}`);
        }
    }

    /* evt name: (none) */
    cancelScheduledValues(time = audio.Context.currentTime) {
        this._param.cancelScheduledValues(time);

        let index = this._eventIndex(time);
        let i = index;

        for (; i < this.events.length; i++) {
            if (this.events[i].time >= time) {
                break;
            }
        }

        this.events.splice(i, 1e9);
        return this;
    }

    /* evt name: (none) */
    cancelAndHoldAtTime(time = audio.Context.currentTime) {
        this._param.cancelAndHoldAtTime(time);

        let index = this._eventIndex(time);
        let event = this.events[index];

        if (event.x1 <= time && event.x2 > time) {
            switch (event.type) {

            }
        }

        return this;
    }

    _eventIndex(time) {
        if (this.events.length === 0)
            return -1;

        let i1 = 0;
        let i2 = this.events.length;

        if (this.events[i2 - 1].x1 <= time)
            return i2 - 1;

        while (i1 < i2) {
            let mid = Math.floor((i1 + i2) / 2);

            let e1 = this.events[mid];
            let e2 = this.events[mid + 1];

            if (e1.x1 > time) {
                i2 = mid;
            } else if (e1.x1 < time && time < e2.x1) {
                return mid;
            } else if (e1.x1 === time) {
                let i;

                for (i = mid + 1; i < this.events.length; i++) {
                    if (this.events[i].x1 > time)
                        break;
                }

                return i - 1;
            } else {
                i1 = mid + 1;
            }
        }

        return -1;
    }

    _insertEvent(event) {
        let index = this._eventIndex(event.x1);
        this.events.splice(index + 1, 0, event);
    }

    /* evt name: set */
    setValueAtTime(value, startTime) {
        value = this.value_convert(value);

        this._param.setValueAtTime(value, startTime);

        let event = {type: "set", x1: startTime, x2: startTime, y1: value, y2: value, time: startTime};
        let x = event.x1;

        let index = this._eventIndex(x) + 1;

        if (index - 1 >= 0) {
            let event = this.events[index - 1];

            switch (event.type) {
                case "lin":
                case "exp":
                    if (event.x1 <= x && event.x2 >= x) {
                        event.x1 = x;
                        event.y1 = value;

                        index--;
                    }
                    break;
                case "tar":
                    if (event.x1 <= x && event.x2 >= x) {
                        event.x2 = x;
                    }
                    break;
            }
        }

        this.events.splice(index, 0, event);
        return this;
    }

    /* evt name: tar */
    setTargetAtTime(target, startTime, timeConstant) {
        target = this.value_convert(target);

        this._param.setTargetAtTime(target, startTime, timeConstant);

        let event = {
            type: "tar",
            x1: startTime,
            y1: this.value,
            x2: Infinity,
            y2: target,
            tc: timeConstant,
            time: startTime
        };

        let index = this._eventIndex(startTime) + 1;

        event.y1 = this.valueAt(startTime);

        if (index < this.events.length) {
            let after = this.events[index];

            switch (after.type) {
                case "exp":
                case "lin":
                    if (after.x1 >= startTime) {
                        after.x1 = audio.Context.currentTime;
                        after.y1 = this.value;
                    }

                    break;
            }
        }

        this.events.splice(index, 0, event);
        return this;
    }

    /* evt name: exp */
    exponentialRampToValueAtTime(value, endTime) {
        value = this.value_convert(value);

        this._param.exponentialRampToValueAtTime(value, endTime);

        let event = {type: "exp", x1: audio.Context.currentTime, x2: endTime, y1: this.value, y2: value, time: endTime};
        let x = endTime;

        let index = this._eventIndex(x) + 1;

        if (index - 1 >= 0) {
            let before = this.events[index - 1];

            switch (before.type) {
                case "set":
                    if (before.x1 <= event.x2) {
                        event.x1 = before.x2;
                        event.y1 = before.y2;
                    }
                    break;
                case "exp":
                case "lin":
                    if (before.x2 <= event.x2) {
                        event.x1 = before.x2;
                        event.y1 = before.y2;
                    } else if (event.x2 >= before.x1) {
                        event.x1 = before.x1;
                        event.y1 = before.y1;

                        before.x1 = x;
                        before.y1 = value;
                        index--;
                    }
                    break;
                case "tar":
                    console.log(before);
                    event.x1 = audio.Context.currentTime;
                    event.y1 = targetInterpolate(before.x1, before.y1, before.y2, before.tc, event.x1);

                    before.x2 = before.x1; // basically make the setTarget impotent
                    break;
            }
        }


        this.events.splice(index, 0, event);
        return this;
    }

    /* evt name: lin */
    linearRampToValueAtTime(value, endTime) {
        value = this.value_convert(value);

        this._param.linearRampToValueAtTime(value, endTime);

        let event = {type: "lin", x1: audio.Context.currentTime, x2: endTime, y1: this.value, y2: value, time: endTime};
        let x = endTime;

        let index = this._eventIndex(x) + 1;

        if (index - 1 >= 0) {
            let before = this.events[index - 1];

            switch (before.type) {
                case "set":
                    if (before.x1 <= event.x2) {
                        event.x1 = before.x2;
                        event.y1 = before.y2;
                    }
                    break;
                case "exp":
                case "lin":
                    if (before.x2 <= event.x2) {
                        event.x1 = before.x2;
                        event.y1 = before.y2;
                    } else if (event.x2 >= before.x1) {
                        event.x1 = before.x1;
                        event.y1 = before.y1;

                        before.x1 = x;
                        before.y1 = value;
                        index--;
                    }
                    break;
                case "tar":
                    event.x1 = audio.Context.currentTime;
                    event.y1 = targetInterpolate(before.x1, before.y1, before.y2, before.tc, event.x1);

                    before.x2 = before.x1; // basically make the setTarget impotent
                    break;
            }
        }

        this.events.splice(index, 0, event);
        return this;
    }

    setValueCurveAtTime(values, startTime, duration) {
        let len = values.length;

        for (let i = 0; i < len; i++) {
            let t = (i / (len - 1)) * duration + startTime;
            this.linearRampToValueAtTime(values[i], t);
        }

        return this;
    }
}

class TonesParam extends ParameterValue {
    constructor() {
        super();

        this._value = this.value;
        this.value = new Param(this._value);
    }
}

export {
    TonesParam,
    BaseNode,
    Node,
    SourceNode,
    EndingNode,
    ParameterValue,
    LinearParameterTransform,
    ParameterAdd,
    ParameterMultiply,
    ParameterConstantMultiply,
    Param,
    PARAMTYPES
};
