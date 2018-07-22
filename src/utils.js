import * as audio from "./audio/audio.js";

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

function desmosPrint(pointArray, minX, maxX) {
    let out_str = "";
    if (minX) { // just y values
        for (let i = 0; i < pointArray.length; i++) {
            out_str += `${i / (pointArray.length - 1) * (maxX - minX) + minX}\t${pointArray[i]}\n`;
        }
    } else { // x, y, x, y
        for (let i = 0; i < pointArray.length / 2; i++) {
            out_str += `${pointArray[i * 2]}\t${pointArray[i * 2 + 1]}\n`;
        }
    }
}

function isNumeric(n) {
    return !!n.toFixed;
}

function isString(s) {
    return (typeof s === 'string' || s instanceof String);
}

let ID_INDEX = 0;

function getID() {
    return ++ID_INDEX;
}

class CancellableTimeout {
    constructor(func, secs, absoluteAudioCtxTime = false) {
        this.end_time = (absoluteAudioCtxTime ? 0 : audio.Context.currentTime) + secs;

        let f_c = () => {
            if (audio.Context.currentTime >= this.end_time) {
                this._ended = true;
                func();
            } else {
                this.timeout = setTimeout(f_c, 2000/3 * (this.end_time - audio.Context.currentTime));
            }
        };

        this.timeout = setTimeout(f_c, 2000 / 3 * (this.end_time - audio.Context.currentTime));

        this._ended = false;
    }

    cancel() {
        clearTimeout(this.timeout);
        this._ended = true;
    }

    ended() {
        return this._ended;
    }
}

function assert(test, message = "Assertion error") {
    if (!test) {
        throw new Error(message);
    }
}

export {clamp, isNumeric, CancellableTimeout, isString, desmosPrint, getID, assert};