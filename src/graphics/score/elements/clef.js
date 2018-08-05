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

        let type, change;

        this.makeSimpleParam("type", {
            obj: type,
            allow: [
                ...Object.values(CLEFS)
            ]
        });
        
        this.makeSimpleParam("change", {
            obj: change,
            allow: [
                true, false
            ]
        });

        this.type = utils.select(params.type, "g");
        this.change = utils.select(params.change, false); // is it a clef change
        
        this.impl.path = null;

        this.recalculate();
    }

    _recalculate() {
        if (this.impl.path)
            this.impl.path.destroy(); // Destroy the old path

        let addition = this.change ? "_CHANGE" : "";

        switch (this.type) {
            case "g":
            case "treble":
                this.impl.path = makeShape(this, "G_CLEF" + addition);
                this.impl.path.translation.y = 30;
                break;
            case "f":
            case "bass":
                this.impl.path = makeShape(this, "F_CLEF" + addition);
                this.impl.path.translation.y = 10;
                break;
            case "alto":
                this.impl.path = makeShape(this, "C_CLEF" + addition);
                this.impl.path.translation.y = 20;
                break;
            case "tenor":
                this.impl.path = makeShape(this, "C_CLEF" + addition);
                this.impl.path.translation.y = 10;
                break;
            case "french violin":
                this.impl.path = makeShape(this, "G_CLEF" + addition);
                this.impl.path.translation.y = 40;
                break;
            case "baritone":
                this.impl.path = makeShape(this, "F_CLEF" + addition);
                this.impl.path.translation.y = 20;
                break;
            case "subbass":
                this.impl.path = makeShape(this, "F_CLEF" + addition);
                break;
            case "baritoneC":
                this.impl.path = makeShape(this, "C_CLEF" + addition);
                break;
            case "mezzosoprano":
                this.impl.path = makeShape(this, "C_CLEF" + addition);
                this.impl.path.translation.y = 30;
                break;
            case "soprano":
                this.impl.path = makeShape(this, "C_CLEF");
                this.impl.path.translation.y = 40;
                break;
            default:
                throw new Error(`Unrecognized clef type ${this.type}`);
        }
    }
}

export {ElementClef};