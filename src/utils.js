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
    console.log(out_str)
}

function isNumeric(n) {
    return !!n.toFixed;
}

function isString(s) {
    return (typeof s === 'string' || s instanceof String);
}

class CancellableTimeout {
    constructor(func, secs) {
        this.timeout = setTimeout(() => {
            this._ended = true;
            func();
        }, secs * 1000);

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

export {clamp, isNumeric, CancellableTimeout, isString, desmosPrint};