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

    recalculate(force = false) {
        if (!force && (this._last_type === this._type))
            return;

        this._last_type = this._type;

        if (this.shape)
            this.shape.destroy();

        this.shape = makeShape(this, accidentalToShapeName(this._type));
    }
}

export {ElementAccidental};