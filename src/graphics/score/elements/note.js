
import {ScoreElement} from "./element.js";
import {makeShape} from "./scoreshapes.js";
import {ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import {Translation} from "../../svgmanip.js";
import {ElementAccidental} from "./accidental";

class ElementNoteHead extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._type = params.type || "normal"; // normal, half, whole, double, none
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

    rightConnectionX() {
        switch (this._type) {
            case "normal":
            case "none":
                return this.offset_x + 1.316 * 5;

            case "half":
                return this.offset_x + 1.18 * 5;
            default:
                throw new Error(`Note of type ${this._type} cannot have a connection`);
        }
    }

    leftConnectionX() {
        switch (this._type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_x;
            default:
                throw new Error(`Note of type ${this._type} cannot have a connection`);
        }
    }

    rightConnectionY() {
        switch (this._type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_y + 0.168 * 5;
            default:
                throw new Error(`Note of type ${this._type} cannot have a connection`);
        }
    }

    leftConnectionY() {
        switch (this._type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_y - 0.168 * 5;
            default:
                throw new Error(`Note of type ${this._type} cannot have a connection`);
        }
    }

    recalculate(force = false) {
        if (!force && this._last_type === this._type)
            return;

        this._last_type = this._type;
        if (this.shape)
            this.shape.destroy();

        switch (this._type) {
            case "normal":
                this.shape = makeShape(this, "NOTEHEAD_NORMAL");
                return;
            case "half":
                this.shape = makeShape(this, "NOTEHEAD_HALF");
                return;
            case "whole":
                this.shape = makeShape(this, "NOTEHEAD_WHOLE");
                return;
            case "double":
                this.shape = makeShape(this, "NOTEHEAD_DOUBLE_WHOLE");
                return;
            case "none":
                return;
            default:
                throw new Error(`Unrecognized notehead type ${this._type}`);
        }
    }

}

class ElementAugmentationDot extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.path = makeShape(this, "AUGMENTATION_DOT");
        this.width = 100 * 0.04;
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

    recalculate() {

    }
}

class ElementNote extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._line = (params.line !== undefined) ? params.line : 0;
        this._dot_count = (params.dot_count !== undefined) ? params.dot_count : 0;
        this._type = (params.type !== undefined) ? params.type : "normal";

        this._accidental = (params.accidental) ? params.accidental : ""; // falsy value for no accidental, will be calculated by parent

        this.dots = [];
        this.notehead = null;
        this.accidental_object = null;

        this.recalculate();
    }

    get accidental() {
        return this._accidental;
    }

    set accidental(value) {
        this._accidental = value;
        this.parent.recalculate();
    }

    get line() {
        return this._line;
    }

    set line(value) {
        this._line = value;
        this.parent.recalculate();
    }

    get dot_count() {
        return this._dot_count;
    }

    set dot_count(value) {
        this._dot_count = value;
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
        if (this.accidental) {
            return this.accidental_object.minX + this.offset_x;
        } else {
            return this.offset_x;
        }
    }

    set minX(value) {
        this.offset_x += value - this.minX;
    }

    get maxX() {
        if (this.dots.length > 0) {
            return this.dots[this.dots.length - 1].maxX;
        } else {
            return this.offset_x + 11.8;
        }
    }

    set maxX(value) {
        this.offset_x += value - this.maxX;
    }

    _recalculateWidth() {
        this.width = this.maxX - this.minX;
    }

    recalculate(force = false) {
        if (!force && this._last_dot_count === this._dot_count && this._last_accidental === this._accidental && this._last_line === this._line && this._last_type === this._type) {
            return;
        }

        this._last_dot_count = this._dot_count;
        this._last_accidental = this._accidental;
        this._last_line = this._line;
        this._last_type = this._type;

        this.dots.forEach(x => x.destroy());
        this.dots = [];

        if (this.notehead)
            this.notehead.destroy();
        if (this.accidental_object)
            this.accidental_object.destroy();

        this.notehead = new ElementNoteHead(this, {type: this._type});
        this.offset_y = this._line * 10;

        if (this.accidental)
            this.accidental_object = new ElementAccidental(this, {type: this.accidental, offset_x: -12});

        let offset_x = 11.8;

        for (let i = 0; i < this._dot_count; i++) {
            offset_x += 3.3;

            this.dots.push(new ElementAugmentationDot(this, {
                offset_x: offset_x,
                offset_y: this.offset_y - Math.floor(this.offset_y / 10) * 10 - 5
            }));
            offset_x += 2.2;
        }

        this._recalculateWidth();
    }
}

class ElementStem extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._y1 = (params.y1 !== undefined) ? params.y1 : 0;
        this._y2 = (params.y2 !== undefined) ? params.y2 : 0;

        this.path = new Path(this, "");
        this.path.addClass("stem");

        this.recalculate();
    }

    get y1() {
        return this._y1;
    }

    set y1(value) {
        this._y1 = value;
        this.recalculate();
    }

    get y2() {
        return this._y2;
    }

    set y2(value) {
        this._y2 = value;
        this.recalculate();
    }

    recalculate(force = false) {
        this.path.d = `M 0 ${this._y1} L 0 ${this._y2}`;
    }
}

class ElementFlag extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._degree = (params.degree !== undefined) ? params.degree : 1; // how many curls there are
        this._orientation = (params.orientation !== undefined) ? params.orientation : "up"; // "up" or "down" is flag's position

        this.shape = null;

        this.recalculate();
    }

    get degree() {
        return this._degree;
    }

    set degree(value) {
        this._degree = value;
        this.recalculate();
    }

    get orientation() {
        return this._orientation;
    }

    set orientation(value) {
        this._orientation = value;
        this.recalculate();
    }

    recalculate() {
        if (!force && this._last_degree === this._degree && this._last_orientation === this._orientation) {
            return;
        }

        this._last_degree = this._degree;
        this._last_orientation = this._orientation;

        if (this.shape)
            this.shape.destroy();

        let SHAPE_ID = "FLAG_" + (this._orientation.toUpperCase()) + "_" + this._degree;

        this.shape = makeShape(this, SHAPE_ID);
    }
}

class ElementChord extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.notes = params.notes ? params.notes.map(x => new ElementNote(this, x)) : [];
        this._articulation = params.articulation || ""; // Values: falsy is none, "." is staccato, ">" is accent
        this._stem = null; // Values: falsy is none, "up" is upward facing stem, "down" is downward facing stem
        this._flag = null; // Values: falsy is none (0 is natural here), 1 is eighth, 2 is sixteenth, etc. to 8 is 1024th
        this._stem_y = (params.stem_y !== undefined) ? params.stem_y : 35; // Extra amount stem from last note

        this.articulation_object = null;
        this.stem_object = null;
        this.flag_object = null;

        this.recalculate();
    }

    get articulation() {
        return this._articulation;
    }

    set articulation(value) {
        this._articulation = value;
        this.recalculate();
    }

    get stem() {
        return this._stem;
    }

    set stem(value) {
        this._stem = value;
        this.recalculate();
    }

    get flag() {
        return this._flag;
    }

    set flag(value) {
        this._flag = value;
        this.recalculate();
    }

    get stem_y() {
        return this._stem_y;
    }

    set stem_y(value) {
        this._stem_y = value;
        this.recalculate();
    }

    recalculate(force = false) {
        if (!force && this._last_flag === this._flag && this._last_stem === this._stem && this._last_articulation === this._articulation && this._last_stem_y === this._stem_y) {
            return;
        }

        if (this.stem_object)
            this.stem_object.destroy();
        if (this.articulation_object)
            this.articulation_object.destroy();
        if (this.flag_object)
            this.flag_object.destroy();

        this.flag_object = new
        this.stem_object = new ElementStem(this, {y1: 0, y2: 0});
    }
}

export {ElementNote, ElementAugmentationDot, ElementNoteHead, ElementChord};