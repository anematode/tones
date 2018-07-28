import {makeShape} from "./scoreshapes.js";
import {ScoreElement} from "./element.js";
import {ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import {Translation} from "../../svgmanip.js";
import {ElementAccidental} from "./accidental";

class ElementKeySig extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.accidentals = params.accidentals ? params.accidentals : [];
        this.accidental_objects = [];

        this.recalculate();
    }

    addAccidental(acc) {
        this.accidentals.push(acc);
        this.recalculate();
    }

    removeAccidental(index) {
        this.accidentals.splice(index, 1);
        this.recalculate();
    }

    recalculate(force = false) {
        try {
            if (!force && this.accidentals.every((x,i) => utils.compareObjects(x, this._last_accidentals[i]))) { // Is everything the same?
                return;
            }
        } catch (e) { // Might throw an IndexError, something changed!

        }

        this._last_accidentals = this.accidentals.map(x => {return {...x}});

        this.accidental_objects.forEach(x => x.destroy());
        this.accidental_objects = [];

        let offset_x = 0;

        for (let i = 0; i < this.accidentals.length; i++) {
            let accidental = new ElementAccidental(this, this.accidentals[i]);

            accidental.offset_x = offset_x;
            accidental.offset_y = this.accidentals[i].line * 10;

            offset_x += accidental.width + 2;

            this.accidental_objects.push(accidental);
        }

        this.bboxCalc();
    }
}

export {ElementKeySig};