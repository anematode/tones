import {makeShape} from "./scoreshapes.js";
import {ScoreElement} from "./element.js";
import {ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import {Translation} from "../../svgmanip.js";

/*
Parameters:

num, numerator of time signature
den, denominator of time signature
type: number, common, cut
 */
class ElementTimeSig extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._type = params.type || "number";
        this._num = (params.num !== undefined) ? params.num : 4;
        this._den = (params.den !== undefined) ? params.den : 4;

        this.num_group = null;
        this.den_group = null;

        this.recalculate();
    }

    get num() {
        return this._num;
    }

    set num(value) {
        this._num = value;
    }

    get den() {
        return this._den;
    }

    set den(value) {
        this._den = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
        this.recalculate();
    }

    recalculate(force = false) {
        if (!force && (this._num === this._last_num && this._den === this._last_den && this._type === this._last_type)) // has anything changed?
            return;

        this._last_num = this._num;
        this._last_den = this._den;
        this._last_type = this._type;

        if (this.num_group)
            this.num_group.destroy();
        if (this.den_group)
            this.den_group.destroy();

        switch (this._type) {
            case "common":
                this.num_group = new ScoreGroup(this);

                let common_time = makeShape(this.num_group, "COMMON_TIME");

                this.num_group.addTransform(new Translation(0, 20));

                break;
            case "cut":
                this.num_group = new ScoreGroup(this);

                let cut_time = makeShape(this.num_group, "CUT_TIME");

                this.num_group.addTransform(new Translation(0, 20));

                break;
            case "number":
                this.num_group = new ScoreGroup(this);
                this.den_group = new ScoreGroup(this);

                let num_string = '' + this._num;
                let den_string = '' + this._den;

                let offset_x = 0;

                for (let i = 0; i < num_string.length; i++) {
                    let c = num_string.charAt(i);

                    utils.assert((c >= '0' && c <= '9') || c === "+", `Invalid character ${c} in numerator`);

                    if (c === "+")
                        c = "NUM_ADD";

                    let character = makeShape(this.num_group, "TIME_SIG_" + c);
                    character.translation.x = offset_x;

                    offset_x += character.adv_x;
                }

                let num_width = offset_x;

                offset_x = 0;

                for (let i = 0; i < den_string.length; i++) {
                    let c = den_string.charAt(i);

                    utils.assert((c >= '0' && c <= '9'), `Invalid character ${c} in denominator`);

                    let character = makeShape(this.den_group, "TIME_SIG_" + c);
                    character.translation.x = offset_x;

                    offset_x += character.adv_x;
                }

                let width = Math.max(num_width, offset_x);

                this.num_group.addTransform(new Translation((width - num_width) / 2, 10));
                this.den_group.addTransform(new Translation((width - offset_x) / 2, 30));

                break;
            default:
                throw new Error(`Unrecognized time signature type ${this._type}`);
        }

        this.bboxCalc();
    }
}

export {ElementTimeSig};