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

};

const EnvelopeHorizontal = {
    none: (x => x)
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

        for (let i = 0; i < nPoints; i++) {
            array[i] = this.valueAt(i / (nPoints - 1) * x_delta + minX);
        }

        return array;
    }

    samplePoints(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(2 * nPoints);
        let x_delta = maxX - minX;

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

    _segApproxArrayLength(fidelity = 0.95) {
        return 4;
    }
}

function expEnvSegApproxLen(fidelity, b2) {
    return Math.min(Math.ceil(Math.max(1 / (1.51 - fidelity - Math.abs(b2 - 0.5)), 2 + 5 * fidelity)), 50);
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

        for (let i = 0; i < nPoints; i++) {
            array[i] = this.valueAt(i / (nPoints - 1) * x_delta + minX);
        }

        return array;
    }

    samplePoints(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(2 * nPoints);
        let x_delta = maxX - minX;

        for (let i = 0; i < nPoints; i++) {
            let x_value = i / (nPoints - 1) * x_delta + minX;
            array[2 * i] = x_value;
            array[2 * i + 1] = this.valueAt(x_value);
        }

        return array;
    }

    segmentApproximation(fidelity = 0.95) {
        let c1 = this.p2.x - this.p1.x, c2 = this.p2.y - this.p1.y;
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
        let derivative = x => Math.pow(g, x) * log_g / (g - 1);

        let inverse_derivative = x => Math.log(x * (g - 1) / log_g) / log_g;

        let value = x => c2 * (Math.pow(g, x) - 1) / (g - 1) + this.p1.y;

        let d_0 = Math.atan(derivative(0));
        let h_a = Math.atan(derivative(1)) - d_0;

        for (let i = 0; i < nPoints; i++) {
            let a_value = i / (nPoints - 1);

            let trans_x = inverse_derivative(Math.tan(a_value * h_a + d_0));
            let y = value(trans_x);
            let x = trans_x * c1 + this.p1.x;

            array[2 * i] = x;
            array[2 * i + 1] = y;
        }

        return array;
    }

    _segApproxArrayLength(fidelity = 0.95) {
        let b2 = (this.inter_y - this.p1.y) / (this.p2.y - this.p1.y);

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

class Envelope {
    constructor(segments, vTransform = EnvelopeVertical.none, hTransform = EnvelopeHorizontal.none) {
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
                    this.segments.push(new EnvelopeSegment(segments[i - 1].p2, segments[i].p1));
                }
            }
            this.segments.push(segments[i]);
        }

        this.vTransform = vTransform;
        this.hTransform = hTransform;
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
        if (x < this.minX() || x > this.maxX()) {
            throw new Error("x out of bounds");
        }

        for (let i = 0; i < this.segments.length; i++) {
            let segment = this.segments[i];

            if (segment[i].minX() < x && segment[i].maxX() > x) {
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

        return array;
    }

    samplePoints(nPoints, minX = this.minX(), maxX = this.maxX()) {
        let array = new Float32Array(2 * nPoints);
        let x_delta = maxX - minX;

        for (let i = 0; i < nPoints; i++) {
            let x_value = i / (nPoints - 1) * x_delta + minX;
            array[2 * i] = x_value;
            array[2 * i + 1] = this.valueAt(x_value);
        }

        return array;
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

        return array;
    }
}