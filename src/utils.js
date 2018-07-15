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

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
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

export {clamp, isNumeric, CancellableTimeout};