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


// Horizontal functions / constructors
const EnvelopeHorizontal = {
    offset_current_time: function (x) {
        return x + audio.contextTime();
    },
    offset_by_time: (delta => (function (x) {
        return x + audio.contextTime() + delta;
    })),
    offset_by_absolute_time: (delta => (x => x + delta))
};

const EnvelopeHorizontalInverse = {
    offset_current_time: function (x) {
        return x - audio.contextTime();
    },
    offset_by_time: (delta => (function (x) {
        return x - audio.contextTime() - delta;
    })),
    offset_by_absolute_time: (delta => (x => x - delta))
};

// Vertical functions / constructors
const EnvelopeVertical = {
    vertical_idempotent: (x => x),
    vertical_exp: (x => (Math.exp(x) - 1) / Math.exp(2)),
    vertical_exp_by: (exponent => (x => (Math.exp(x) - 1) / Math.exp(exponent))),
};

const EnvelopeVerticalInverse = {
    vertical_idempotent: (x => x),
    vertical_exp: (y => Math.log(y * Math.exp(2) + 1)),
    vertical_exp_by: (exponent => (y => Math.log(y * Math.exp(exponent) + 1)))
};

// Sample frequency functions / constructors
const EnvelopeSamples = {
    sample_default: (x => 50),
    sample_by_amount: (samples => (x => samples)),
    smart_sample:  (x => parseInt(5 * x.length() + 5)),
    smart_sample_prec: (prec => (x => prec * x.length()))
};

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

class EnvelopeSegment {
    constructor(p1i, p2i, inter_y) {
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

        if (isNumber(inter_y) && ((p1.y < inter_y && inter_y < p2.y) || (p2.y < inter_y && inter_y < p1.y))) {
            this.inter_y = inter_y;
        } else {
            if (isNumber(inter_y)) {
                throw new Error("Intermediate y value must be well between y values of the endpoints.");
            }
            this.inter_y = (p1.y + p2.y) / 2;
        }
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

    length() {
        return this.maxX() - this.minX();
    }

    sample(samples = 50, v_apply = EnvelopeVertical.vertical_idempotent) {
        let array = new Float32Array(samples);

        samples -= 1;

        let delta_v = this.p1.y - this.p2.y;

        if (Math.abs(this.inter_y - (this.p1.y + this.p2.y) / 2) < Math.abs(delta_v) / 200 || delta_v === 0) {
            // The segment is pretty linear, so calculate as such

            let minX = this.minX(), maxX = this.maxX(), startY = this.p1.y, endY = this.p2.y;
            let x_delta = maxX - minX;
            let y_delta = endY - startY;
            let x_jump = x_delta / samples;

            for (let i = minX, j = 0; j <= samples; i += x_jump, j++) {
                array[j] = v_apply((i - minX) / x_delta * y_delta + startY);
            }
        } else {
            // Exponential calculation

            let minX = this.minX(), maxX = this.maxX();
            let x_delta = maxX - minX;
            let x_jump = x_delta / samples;

            let a1 = this.p1.x, a2 = this.p1.y, b2 = this.inter_y, c1 = this.p2.x, c2 = this.p2.y;
            let k = (c1 - a1) / 2;

            let q = Math.pow((c2 - b2) / (b2 - a2), 1 / k);
            let p = (a2 - c2) / (Math.pow(q, a1) - Math.pow(q, c1));
            let s = a2 - p * Math.pow(q, a1);

            for (let i = minX, j = 0; j <= samples; i += x_jump, j++) {
                array[j] = v_apply(p * Math.pow(q, i) + s);
            }
        }

        return array;
    }

    apply(audioParam, samples = 50, h_apply = EnvelopeHorizontal.offset_current_time, v_apply = EnvelopeVertical.vertical_idempotent) {
        audioParam.setValueCurveAtTime(this.sample(samples, v_apply),
            h_apply(this.minX()),
            h_apply(this.maxX()) - h_apply(this.minX()));
    }
}


class Envelope {
    constructor(segments) {

        if (!Array.isArray(segments)) {
            throw new Error("Array of segments must be passed to Envelope constructor.");
        }
        if (segments.length < 1) {
            throw new Error("Not enough segments passed to Envelope constructor.");
        }

        this.segments = [];

        for (let i = 0; i < segments.length; i++) {
            if (i !== 0) {
                let prevMax = segments[i - 1].maxX();
                let currMin = segments[i].minX();
                if (prevMax > currMin) {
                    throw new Error("Discontinuous segments at indices " + String(i - 1) + ", " + String(i));
                } else if (prevMax < currMin) {
                    this.segments.push(new EnvelopeSegment(segments[i - 1].p2, segments[i].p1));
                }
            }
            this.segments.push(segments[i]);
        }
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

    apply(audioParam, h_apply = EnvelopeHorizontal.offset_current_time,
          v_apply = EnvelopeVertical.vertical_idempotent,
          samplesPerSegment = EnvelopeSamples.smart_sample) {
        this.segments.forEach(x => x.apply(audioParam, samplesPerSegment(x), h_apply, v_apply));
    }
}

export {Envelope,
    EnvelopeSegment,
    EnvelopeControlPoint,
    EnvelopeHorizontal,
    EnvelopeHorizontalInverse,
    EnvelopeSamples,
    EnvelopeVertical,
EnvelopeVerticalInverse
};