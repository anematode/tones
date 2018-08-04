import {makeShape} from "./scoreshapes.js";
import {ScoreElement} from "./element.js";
import {ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import {Translation} from "../../svgmanip.js";

function accidentalToShapeName(acc) {
    let PRE = "ACCIDENTAL_";

    switch (acc) {
        case "s":
            return PRE + "SHARP";
        case "ss":
            return PRE + "DOUBLE_SHARP";
        case "b":
            return PRE + "FLAT";
        case "bb":
            return PRE + "DOUBLE_FLAT";
        case "n":
            return PRE + "NATURAL";
        case "sss":
            return PRE + "TRIPLE_SHARP";
        case "bbb":
            return PRE + "TRIPLE_FLAT";
        case "nb":
            return PRE + "NATURAL_FLAT";
        case "ns":
            return PRE + "NATURAL_SHARP";
        default:
            throw new Error(`Unrecognized accidental ${acc}`);
    }
}

const boundingBoxes = {
    "n" : {x: 0, y: -13.64000129699707, height: 27.040000915527344, width: 6.720000267028809},
    "b" : {x: 0, y: -17.560001373291016, height: 24.560001373291016, width: 9.040000915527344},
    "ss" : {x: 0, y: -5.080000400543213, height: 10.080000877380371, width: 9.880001068115234},
    "bb" : {x: 0, y: -17.48000144958496, height: 24.48000144958496, width: 16.440000534057617},
    "sss" : {x: 0, y: -14.000000953674316, height: 27.920001983642578, width: 20.520002365112305},
    "bbb" : {x: 0, y: -17.560001373291016, height: 24.560001373291016, width: 23.840002059936523},
    "nb" : {x: 0, y: -17.560001373291016, height: 30.960002899169922, width: 18.360000610351562},
    "ns" : {x: 0, y: -14.000000953674316, height: 27.920001983642578, width: 19.240001678466797},
    "s" : {x: 0, y: -14.000000953674316, height: 27.920001983642578, width: 9.960000991821289}
};


/*
Parameters:

type, one of s (sharp), ss (double sharp), b (flat), bb (flat), n (natural),
sss (triple sharp), bbb (triple flat), nb (natural flat), ns (natural sharp)
 */
class ElementAccidental extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._type = params.type || "s";
        this.shape = null;

        this.recalculate();
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
        this.recalculate();
    }

    bboxCalc() {
        this.bounding_box = boundingBoxes[this.type];

        this.bounding_box.x += this.offset_x;
        this.bounding_box.y += this.offset_y;
    }

    recalculate(force = false) {
        if (!force && (this._last_type === this._type))
            return;

        this._last_type = this._type;

        if (this.shape)
            this.shape.destroy();

        this.shape = makeShape(this, accidentalToShapeName(this._type));
        this.bboxCalc();
    }
}

export {ElementAccidental};