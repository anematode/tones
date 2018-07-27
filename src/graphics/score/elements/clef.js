import {makeShape} from "./scoreshapes.js";
import {ScoreElement} from "./element.js";
import * as utils from "../../../utils.js";

/*
Clef class

Parameters:

type, one of "g", "f", "treble", "bass", "alto", "tenor", "french violin", "baritone", "subbass", "baritoneC", "mezzosoprano", "soprano", or from CLEFS
offset_x, inherited from Element
translation.y, inherited from Element
 */

const CLEFS = {
    TREBLE: "treble",
    BASS: "bass",
    ALTO: "alto",
    TENOR: "tenor",
    FRENCH_VIOLIN: "french violin",
    BARITONE: "baritone",
    SUBBASS: "subbass",
    BARITONEC: "baritoneC",
    MEZZOSOPRANO: "mezzosoprano",
    SOPRANO: "soprano"
};

class ElementClef extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._type = params.type || "g";
        this.path = null;
        this._change = (params.change !== undefined) ? params.change : false; // is it a clef change

        this.recalculate();
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
        this.recalculate();
    }

    get minX() {
        return this.offset_x;
    }

    set minX(value) {
        this.offset_x = value;
    }

    get maxX() {
        return this.offset_x + this.width;
    }

    set maxX(value) {
        this.offset_x = value - this.width;
    }

    set change(value) {
        this._change = value;
        this.recalculate();
    }

    get change() {
        return this._change;
    }

    recalculate(force = false) {
        if (!force && (this._last_type === this._type && this._last_change === this._change)) // So that it isn't recalculated more than necessary
            return;

        this._last_type = this._type;
        this._last_change = this._change;

        if (this.path)
            this.path.destroy(); // Destroy the old path

        let addition = this.change ? "_CHANGE" : "";

        switch (this._type) {
            case "g":
            case "treble":
                this.path = makeShape(this, "G_CLEF" + addition);
                this.path.translation.y = 30;
                break;
            case "f":
            case "bass":
                this.path = makeShape(this, "F_CLEF" + addition);
                this.path.translation.y = 10;
                break;
            case "alto":
                this.path = makeShape(this, "C_CLEF" + addition);
                this.path.translation.y = 20;
                break;
            case "tenor":
                this.path = makeShape(this, "C_CLEF" + addition);
                this.path.translation.y = 10;
                break;
            case "french violin":
                this.path = makeShape(this, "G_CLEF" + addition);
                this.path.translation.y = 40;
                break;
            case "baritone":
                this.path = makeShape(this, "F_CLEF" + addition);
                this.path.translation.y = 20;
                break;
            case "subbass":
                this.path = makeShape(this, "F_CLEF" + addition);
                break;
            case "baritoneC":
                this.path = makeShape(this, "C_CLEF" + addition);
                break;
            case "mezzosoprano":
                this.path = makeShape(this, "C_CLEF" + addition);
                this.path.translation.y = 30;
                break;
            case "soprano":
                this.path = makeShape(this, "C_CLEF");
                this.path.translation.y = 40;
                break;
            default:
                throw new Error(`Unrecognized clef type ${this._type}`);
        }

        this.width = this.path.element.getBBox().width * 0.04;
    }
}

export {ElementClef};