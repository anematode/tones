import * as audio from "./audio.js";

class EnvelopeControlPoint {
    constructor(x, y) {
        if (Array.isArray(x)) {
            this.x = x[0];
            this.y = x[1];
        } else if (y !== undefined) {
            this.x = x;
            this.y = y;
        } else {
            this.x = x.x;
            this.y = x.y;
        }
    }
}

const EnvelopeVertical = {
    none: (x => x),
    octaves: (baseFrequency => (x => baseFrequency * Math.pow(2, x))),
    semitones: (baseFrequency => (x => baseFrequency * Math.pow(2, x / 12))),
    cents: (baseFrequency => (x => baseFrequency * Math.pow(2, x / 1200))),
    decibel_gain: (x => Math.pow(10, x / 20))
};

const EnvelopeVerticalInverse = {
    none: (x => x),
    octaves: (baseFrequency => (x => Math.log2(x / baseFrequency))),
    semitones: (baseFrequency => (x => Math.log(x / baseFrequency) / Math.log(1 / 12))),
    cents: (baseFrequency => (x => Math.log(x / baseFrequency) / Math.log(1 / 1200))),
    decibel_gain: (x => 20 * Math.log10(x))
};

const EnvelopeHorizontal = {
    none: (x => x),
    currTimeOffset: (x => x + audio.Context.currentTime),
    absoluteOffset: (time => (x => x + time)),
    offset: (time => (x => x + audio.Context.currentTime + time))
};

/* General envelope segment type. Envelope segment subclasses should have the following methods:

valueAt(x)
(maybe) override maxY()
(maybe) override minY()
sample(nPoints, minX = minX(), maxX = maxX()) returns array of y values for evenly spaced x values
samplePoints(nPoints, minX = minX(), maxX = maxX()) returns array of x, y values
segmentApproximation(fidelity = 0.95)
 */

class EnvelopeSegment {
    constructor(p1i, p2i) {
        p1i = new EnvelopeControlPoint(p1i);
        p2i = new EnvelopeControlPoint(p2i);

        if (p1i === p2i) {
            throw new Error("Points cannot be the same.");
        }

        let p1, p2;

        if (p2i.x < p1i.x) {
            p1 = p2i;
            p2 = p1i;
        } else {
            p1 = p1i;
            p2 = p2i;
        }


        this.p1 = p1;
        this.p2 = p2;
    }

    minX() {
        return this.p1.x;
    }

    minY() {
        return Math.min(this.p1.y, this.p2.y);
    }

    maxX() {
        return this.p2.x;
    }

    maxY() {
        return Math.max(this.p1.y, this.p2.y);
    }

    contains(x) {
        return (this.minX() <= x && x <= this.maxX());
    }

    length() {
        return this.maxX() - this.minX();
    }
}



class LinearEnvelopeSegment extends EnvelopeSegment {
    constructor(p1i, p2i) {
        super(p1i, p2i);
    }

    valueAt(x) {
        return (x - this.p1.x) / (this.p2.x - this.p1.x) * (this.p2.y - this.p1.y) + this.p1.y;
    }

    sample(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(nPoints);
        let x_delta = maxX - minX;

        if (x_delta === 0) { // segment with 0 length
            let y_delta = this.p2.y - this.p1.y;
            for (let i = 0; i < nPoints; i++) {
                array[i] = i / (nPoints - 1) * y_delta + this.p1.y;
            }
            return array;
        }

        for (let i = 0; i < nPoints; i++) {
            array[i] = this.valueAt(i / (nPoints - 1) * x_delta + minX);
        }

        return array;
    }

    samplePoints(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(2 * nPoints);
        let x_delta = maxX - minX;

        if (x_delta === 0) { // segment with 0 length
            let y_delta = this.p2.y - this.p1.y;
            for (let i = 0; i < nPoints; i++) {
                array[2 * i] = this.minX();
                array[2 * i + 1] = i / (nPoints - 1) * y_delta + this.p1.y;
            }
            return array;
        }

        for (let i = 0; i < nPoints; i++) {
            let x_value = i / (nPoints - 1) * x_delta + minX;
            array[2 * i] = x_value;
            array[2 * i + 1] = this.valueAt(x_value);
        }

        return array;
    }

    segmentApproximation(fidelity = 0.95) {
        return new Float32Array([this.p1.x, this.p1.y, this.p2.x, this.p2.y]);
    }

    static _segApproxArrayLength(fidelity = 0.95) {
        return 4;
    }
}

function expEnvSegApproxLen(fidelity, b2) {
    return Math.min(2 * Math.ceil(Math.max(1 / (1.51 - fidelity - Math.abs(b2 - 0.5)), 2 + 5 * fidelity)), 75);
}

class ExponentialEnvelopeSegment extends EnvelopeSegment {
    constructor(p1i, p2i, inter_y) {
        super(p1i, p2i);
        if (inter_y <= this.minY() || inter_y >= this.maxY()) {
            throw new Error("Intermediate y value must be between point y values");
        }
        this._inter_y = inter_y || (this.p1.y + this.p2.y) / 2;
    }

    valid() {
        return (inter_y > this.minY() && inter_y < this.maxY());
    }

    get inter_y() {
        return this._inter_y;
    }

    set inter_y(value) {
        if (value < this.minY() || value > this.maxY()) {
            throw new Error("Intermediate y value must be between point y values");
        }
    }

    valueAt(x) {
        let c1 = this.p2.x - this.p1.x, c2 = this.p2.y - this.p1.y;

        let b2 = (this.inter_y - this.p1.y) / c2;

        let q = (1 - b2) / b2;

        if (q > 1 - 1e-6 && q < 1 + 1e-6) {
            // Treat as linear
            return c2 * (x - this.p1.x) / c1 + this.p1.y;
        }

        return c2 * (Math.pow(q, 2 * (x - this.p1.x) / c1) - 1) / (q * q - 1) + this.p1.y;
    }

    sample(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(nPoints);
        let x_delta = maxX - minX;

        if (x_delta === 0) { // segment with 0 length
            let y_delta = this.p2.y - this.p1.y;
            for (let i = 0; i < nPoints; i++) {
                array[i] = i / (nPoints - 1) * y_delta + this.p1.y;
            }
            return array;
        }

        for (let i = 0; i < nPoints; i++) {
            array[i] = this.valueAt(i / (nPoints - 1) * x_delta + minX);
        }

        return array;
    }

    samplePoints(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(2 * nPoints);
        let x_delta = maxX - minX;

        if (x_delta === 0) { // segment with 0 length
            let y_delta = this.p2.y - this.p1.y;
            for (let i = 0; i < nPoints; i++) {
                array[2 * i] = this.minX();
                array[2 * i + 1] = i / (nPoints - 1) * y_delta + this.p1.y;
            }
            return array;
        }

        for (let i = 0; i < nPoints; i++) {
            let x_value = i / (nPoints - 1) * x_delta + minX;
            array[2 * i] = x_value;
            array[2 * i + 1] = this.valueAt(x_value);
        }

        return array;
    }

    segmentApproximation(fidelity = 0.95) {
        // Pretty optimized (about 0.0017 ms for 14 points at fidelity = 1)
        let c2 = this.p2.y - this.p1.y;
        let b2 = (this.inter_y - this.p1.y) / c2;

        let q = (1 - b2) / b2;

        if (q > 1 - 1e-6 && q < 1 + 1e-6) {
            // Treat as linear
            return new Float32Array([this.p1.x, this.p1.y, this.p2.x, this.p2.y]);
        }

        let nPoints = expEnvSegApproxLen(fidelity, b2);
        let array = new Float32Array(2 * nPoints);
        let g = q * q;

        let log_g = Math.log(g);

        let inverse_derivative = x => Math.log(x * (g - 1) / log_g) / log_g;

        let value = x => c2 * (x * (g - 1) / log_g - 1) / (g - 1) + this.p1.y;

        let d_0 = Math.atan(log_g / (g - 1));
        let h_a = Math.atan(g * log_g / (g - 1)) - d_0;

        let c1 = this.p2.x - this.p1.x;

        for (let i = 0; i < nPoints; i++) {
            let slope = Math.tan(i / (nPoints - 1) * h_a + d_0);

            array[2 * i] = inverse_derivative(slope) * c1 + this.p1.x;
            array[2 * i + 1] = value(slope);
        }

        return array;
    }


    _segApproxArrayLength(fidelity = 0.95) {
        let b2 = (this.inter_y - this.p1.y) / (this.p2.y - this.p1.y);
        let q = (1 - b2) / b2;

        if (q > 1 - 1e-6 && q < 1 + 1e-6) {
            return 4;
        }

        return 2 * expEnvSegApproxLen(fidelity, b2);
    }
}

class QuadraticEnvelopeSegment extends EnvelopeSegment {
    constructor(p1i, p2i, inter_point) {
        inter_point = new EnvelopeControlPoint(inter_point);

        super(p1i, p2i);

        this._inter_point = inter_point || new EnvelopeControlPoint([(p1i.x + p2i.x) / 2, (p1i.y + p2i.y) / 2]);
    }
}

function transformPoints(segments, vTransform) {
    for (let i = 0; i < segments.length/2; i++) {
        segments[2*i+1] = vTransform(segments[2*i + 1]);
    }
    return segments;
}

function transformSegments(segments, vTransform, fidelity = 0.95) {
    for (let i = 0; i < segments.length/2; i++) {
        segments[2*i+1] = vTransform(segments[2*i + 1]);
    }
    return segments;
}

class Envelope {
    constructor(segments, vTransform = EnvelopeVertical.none) {
        if (!Array.isArray(segments)) {
            throw new Error("Array of segments must be passed to Envelope constructor.");
        }
        if (segments.length < 1) {
            throw new Error("Not enough segments passed to Envelope constructor.");
        }

        this.segments = [];

        for (let i = 0; i < segments.length; i++) {
            // Make sure segments don't intersect
            if (i !== 0) {
                let prevMax = segments[i - 1].maxX();
                let currMin = segments[i].minX();
                if (prevMax > currMin) {
                    throw new Error("Intersecting or invalid segments at indices " + String(i - 1) + ", " + String(i));
                } else if (prevMax < currMin) {
                    // interpolation between end and start points that are discontinuous (instant jump to later value)
                    this.segments.push(new LinearEnvelopeSegment(segments[i - 1].p2, [segments[i].p1.x, segments[i - 1].p2.y]));
                }
            }
            this.segments.push(segments[i]);
        }

        this.vTransform = vTransform;
    }

    minX() {
        return this.segments[0].minX();
    }

    maxX() {
        return this.segments[this.segments.length - 1].maxX();
    }

    minY() {
        return Math.min(...this.segments.apply(x => x.p1.y), ...this.segments.apply(x => x.p2.y));
    }

    maxY() {
        return Math.max(...this.segments.apply(x => x.p1.y), ...this.segments.apply(x => x.p2.y));
    }

    addSegment(segment) {
        let segMinX = segment.minX();
        let maxX = this.maxX();

        if (segMinX === maxX) {
            this.segments.push(segment);
        } else if (segMinX > maxX) {
            this.segments.push(new EnvelopeSegment(this.segments[this.segments.length - 1].p2, segment.p1));
        } else {
            throw new Error("Discontinuous segment.");
        }
    }

    valueAt(x) {
        if (x < this.minX()) {
            return this.valueAt(this.minX());
        } else if (x > this.maxX()) {
            return this.valueAt(this.maxX());
        }

        for (let i = 0; i < this.segments.length; i++) {
            let segment = this.segments[i];

            if (segment.minX() <= x && segment.maxX() >= x) {
                return segment.valueAt(x);
            }
        }
    }

    sample(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(nPoints);
        let x_delta = maxX - minX;

        for (let i = 0; i < nPoints; i++) {
            array[i] = this.valueAt(i / (nPoints - 1) * x_delta + minX);
        }

        return array.map(this.vTransform);
    }

    samplePoints(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(2 * nPoints);
        let x_delta = maxX - minX;

        for (let i = 0; i < nPoints; i++) {
            let x_value = i / (nPoints - 1) * x_delta + minX;
            array[2 * i] = x_value;
            array[2 * i + 1] = this.valueAt(x_value);
        }

        return transformPoints(array, this.vTransform);
    }

    segmentApproximation(fidelity = 0.95) {
        let arrayLength = 0;

        for (let i = 0; i < this.segments.length; i++) {
            arrayLength += this.segments[i]._segApproxArrayLength(fidelity);
        }

        let array = new Float32Array(arrayLength);

        let x_value = 0;

        for (let i = 0; i < this.segments.length; i++) {
            let approximation = this.segments[i].segmentApproximation(fidelity);

            array.set(approximation, x_value);
            x_value += approximation.length;
        }

        return transformSegments(array, this.vTransform, fidelity);
    }

    smartSample(resolution = 0.1, minSegSamples = 3) {
        let nPoints = 0;
        for (let i = 0; i < this.segments.length; i++) {
            let segment = this.segments[i];

            nPoints += Math.max(Math.ceil(segment.length() / resolution), 3);
        }

        let array = new Float32Array(2 * nPoints);
        let x_value = 0;

        for (let i = 0; i < this.segments.length; i++) {
            let segment = this.segments[i];
            let approximation = segment.samplePoints(Math.max(Math.ceil(segment.length() / resolution), minSegSamples));

            for (let j = 0; j < approximation.length / 2; j++) {
                approximation[2 * j + 1] = this.vTransform(approximation[2 * j + 1]);
            }

            array.set(approximation, x_value);
            x_value += approximation.length;
        }

        return array;
    }

    apply(parameter, hTransform = EnvelopeHorizontal.currTimeOffset, resolution = 0.1, minSegSamples = 3, vTransform = EnvelopeVertical.none) {
        applySegmentsToParameter(this.smartSample(resolution, minSegSamples), parameter, hTransform);
    }
}

function applySegmentsToParameter(segments, parameter, hTransform = EnvelopeHorizontal.currTimeOffset, vTransform = EnvelopeVertical.none) {
    let prev_x = hTransform(segments[0]);
    let prev_y = vTransform(segments[1]);
    parameter.setValueAtTime(prev_y, prev_x);

    for (let i = 0; i < segments.length / 2; i++) {
        let new_x = hTransform(segments[2 * i]);
        let new_y = vTransform(segments[2 * i + 1]);

        if (prev_x === new_x) {
            parameter.setValueAtTime(new_y, new_x);
        } else {
            parameter.linearRampToValueAtTime(new_y, new_x);
        }

        prev_x = new_x;
        prev_y = new_y;
    }
}

export {
    Envelope,
    EnvelopeControlPoint,
    EnvelopeVertical,
    EnvelopeHorizontal,
    LinearEnvelopeSegment,
    QuadraticEnvelopeSegment,
    ExponentialEnvelopeSegment,
    applySegmentsToParameter,
    EnvelopeVerticalInverse
}