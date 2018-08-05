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
        
        let type, num, den;
        
        this.makeSimpleParam("type", {
            obj: type,
            allow: [
                "number", "common", "cut"
            ]
        });
        
        this.makeSimpleParam("num", {
            obj: num,
            allow: [
                x => (utils.isInteger(x) && x > 0),
                x => (x.split('+').every(c => {
                    let int_c = parseInt(c);
                    return utils.isInteger(int_c) && int_c >= 0;
                }))
            ]
        });
        
        this.makeSimpleParam("den", {
            obj: den,
            allow: [
                x => (utils.isInteger(x) && x > 0)
            ]
        });
        
        this.type = utils.select(params.type, "number");
        this.num = utils.select(params.num, 4);
        this.den = utils.select(params.den, 4);
        
        this.impl.num_group = null;
        this.impl.den_group = null;

        this.recalculate();
    }

    _recalculate() {
        if (this.impl.num_group)
            this.impl.num_group.destroy();
        if (this.impl.den_group)
            this.impl.den_group.destroy();

        switch (this.type) {
            case "common":
                this.impl.num_group = new ScoreGroup(this);

                let common_time = makeShape(this.impl.num_group, "COMMON_TIME");

                this.impl.num_group.addTransform(new Translation(0, 20));

                break;
            case "cut":
                this.impl.num_group = new ScoreGroup(this);

                let cut_time = makeShape(this.impl.num_group, "CUT_TIME");

                this.impl.num_group.addTransform(new Translation(0, 20));

                break;
            case "number":
                this.impl.num_group = new ScoreGroup(this);
                this.impl.den_group = new ScoreGroup(this);

                let num_string = '' + this.num;
                let den_string = '' + this.den;

                let offset_x = 0;

                for (let i = 0; i < num_string.length; i++) {
                    let c = num_string.charAt(i);

                    utils.assert((c >= '0' && c <= '9') || c === "+", `Invalid character ${c} in numerator`);

                    if (c === "+")
                        c = "NUM_ADD";

                    let character = makeShape(this.impl.num_group, "TIME_SIG_" + c);
                    character.translation.x = offset_x;

                    offset_x += character.adv_x;
                }

                let num_width = offset_x;

                offset_x = 0;

                for (let i = 0; i < den_string.length; i++) {
                    let c = den_string.charAt(i);

                    utils.assert((c >= '0' && c <= '9'), `Invalid character ${c} in denominator`);

                    let character = makeShape(this.impl.den_group, "TIME_SIG_" + c);
                    character.translation.x = offset_x;

                    offset_x += character.adv_x;
                }

                let width = Math.max(num_width, offset_x);

                this.impl.num_group.addTransform(new Translation((width - num_width) / 2, 10));
                this.impl.den_group.addTransform(new Translation((width - offset_x) / 2, 30));

                break;
            default:
                throw new Error(`Unrecognized time signature type ${this._type}`);
        }
    }
}

export {ElementTimeSig};