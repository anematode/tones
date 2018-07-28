import {ScoreElement} from "./element.js";
import {makeShape} from "./scoreshapes.js";
import {ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import {Translation} from "../../svgmanip.js";
import {ElementAccidental} from "./accidental";
import {Path} from "../../svgmanip";

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
            case "half":
                return this.offset_x + 1.18 * 10;
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
                return this.offset_y - 0.168 * 10;
            default:
                throw new Error(`Note of type ${this._type} cannot have a connection`);
        }
    }

    leftConnectionY() {
        switch (this._type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_y + 0.168 * 10;
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
                break;
            case "half":
                this.shape = makeShape(this, "NOTEHEAD_HALF");
                break;
            case "whole":
                this.shape = makeShape(this, "NOTEHEAD_WHOLE");
                break;
            case "double":
                this.shape = makeShape(this, "NOTEHEAD_DOUBLE_WHOLE");
                break;
            case "none":
                break;
            default:
                throw new Error(`Unrecognized notehead type ${this._type}`);
        }

        this.bboxCalc();
    }

}

class ElementAugmentationDot extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.path = makeShape(this, "AUGMENTATION_DOT");

        this.recalculate();
    }

    bboxCalc() {
        this.bounding_box = {x: this.offset_x, y: this.offset_y - 2, width: 4, height: 4};
    }

    recalculate() {
        this.bboxCalc();
    }
}

class ElementNote extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._line = (params.line !== undefined) ? params.line : 0;
        this._type = (params.type !== undefined) ? params.type : "normal";

        this._accidental = (params.accidental) ? params.accidental : ""; // falsy value for no accidental, will be calculated by parent

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

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
        this.recalculate();
    }

    recalculate(force = false) {
        if (!force && this._last_accidental === this._accidental && this._last_line === this._line && this._last_type === this._type) {
            return;
        }

        this._last_accidental = this._accidental;
        this._last_line = this._line;
        this._last_type = this._type;

        if (this.notehead)
            this.notehead.destroy();
        if (this.accidental_object)
            this.accidental_object.destroy();

        this.notehead = new ElementNoteHead(this, {type: this._type});
        this.offset_y = this._line * 10;

        if (this.accidental)
            this.accidental_object = new ElementAccidental(this, {type: this.accidental, offset_x: -12});

        this.bboxCalc();
    }
}

class ElementStem extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this._y1 = (params.y1 !== undefined) ? params.y1 : 0;
        this._y2 = (params.y2 !== undefined) ? params.y2 : 0;

        this.path = new Path(this, "");
        this.path.addClass("note-stem");

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

        this.bboxCalc();
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

    recalculate(force = false) {
        if (!force && this._last_degree === this._degree && this._last_orientation === this._orientation) {
            return;
        }

        this._last_degree = this._degree;
        this._last_orientation = this._orientation;

        if (this.shape)
            this.shape.destroy();

        let SHAPE_ID = "FLAG_" + (this._orientation.toUpperCase()) + "_" + this._degree;

        this.shape = makeShape(this, SHAPE_ID);

        this.bboxCalc();
    }
}

const STEM_THICKNESS = 2; // Move to defaults TODO

class ElementChord extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.chord_group = new ScoreGroup(this);

        this.notes = params.notes ? params.notes.map(x => new ElementNote(this.chord_group, x)) : [];
        this._articulation = params.articulation || ""; // Values: falsy is none, "." is staccato, ">" is accent
        this._stem = (params.stem !== undefined) ? params.stem : "up"; // Values: falsy is none, "up" is upward facing stem, "down" is downward facing stem
        this._flag = (params.flag !== undefined) ? params.flag : 0; // Values: falsy is none (0 is natural here), 1 is eighth, 2 is sixteenth, etc. to 8 is 1024th
        this._stem_y = (params.stem_y !== undefined) ? params.stem_y : 35; // Extra amount stem from last note
        this._dot_count = (params.dot_count !== undefined) ? params.dot_count : 0;

        this.articulation_object = null;
        this.stem_object = null;
        this.flag_object = null;
        this.dots = [];
        this.lines = []; // extra lines when notes go beyond staff

        this.centering_translation = new Translation();
        this.chord_group.addTransform(this.centering_translation);

        this.recalculate();
    }

    addNote(params = {}) {
        let note = new ElementNote(this.chord_group, params);
        this.notes.push(note);

        this.recalculate(true);

        return note;
    }

    removeNote(index) {
        this.notes[index].destroy();
        this.notes.splice(index, 1);

        this.recalculate(true);
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

    get dot_count() {
        return this._dot_count;
    }

    set dot_count(value) {
        this._dot_count = value;
        this.recalculate();
    }

    sortNotes() {
        this.notes.sort((n1, n2) => (n1._line - n2._line));
    }

    recalculate(force = false) { // If it's just the notes that have changed, you'll have to force recalculate it
        if (!force && this._last_flag === this._flag
            && this._last_stem === this._stem
            && this._last_articulation === this._articulation
            && this._last_stem_y === this._stem_y
            && this._last_dot_count === this._dot_count) {
            return;
        }

        this._last_flag = this._flag;
        this._last_stem = this._stem;
        this._last_articulation = this._articulation;
        this._last_stem_y = this._stem_y;
        this._last_dot_count = this._dot_count;

        if (this.stem_object)
            this.stem_object.destroy();
        if (this.articulation_object)
            this.articulation_object.destroy();
        if (this.flag_object)
            this.flag_object.destroy();

        this.lines.forEach(x => x.destroy());
        this.lines = [];

        this.dots.forEach(x => x.destroy());
        this.dots = [];

        this.sortNotes();

        let prev_line = Infinity;
        let prev_connect = 1;

        let default_connect = (!this._stem) ? 0 : ((this._stem === "up") ? 0 : 1);

        let minConnectionY = Infinity;
        let maxConnectionY = -Infinity;

        let minX = Infinity;
        let maxX = -Infinity;

        let minlLineY = 5;
        let maxlLineY = -1;
        let minrLineY = 5;
        let maxrLineY = -1;

        let maxlLineX = -Infinity;
        let maxrLineX = -Infinity;

        let dot_positions = [];

        for (let i = this.notes.length - 1; i >= 0; i--) {
            let note = this.notes[i];

            if (note._line < prev_line - 0.6) {
                note.connectOn = default_connect; // 1 is right, 0 is left
                note.offset_x = note.connectOn * (11.8 - STEM_THICKNESS / 2) - 11.8;
            } else {
                note.connectOn = 1 - prev_connect;
                note.offset_x = note.connectOn * (11.8 - STEM_THICKNESS / 2) - 11.8;
            }

            if (note.connectOn === 0) {
                if (note._line < minlLineY)
                    minlLineY = Math.floor(note._line + 0.5);
                if (note._line > maxlLineY)
                    maxlLineY = Math.ceil(note._line - 0.5);
                let n_x = note.notehead.maxX + note.offset_x;
                if (n_x > maxlLineX)
                    maxlLineX = n_x;
            } else {
                if (note._line < minrLineY)
                    minrLineY = Math.floor(note._line + 0.5);
                if (note._line > maxrLineY)
                    maxrLineY = Math.ceil(note._line - 0.5);
            }

            let dot_y = Math.floor((note.offset_y + 5) / 10) * 10 - 5;

            if (dot_positions.includes(dot_y)) {
                if (!dot_positions.includes(dot_y + 10))
                    dot_positions.push(dot_y + 10);
            } else {
                dot_positions.push(dot_y);
            }

            if (this._stem) {
                let connectionY = (note.connectOn ? note.notehead.leftConnectionY() : note.notehead.rightConnectionY()) + note.offset_y;

                if (connectionY < minConnectionY)
                    minConnectionY = connectionY;
                if (connectionY > maxConnectionY)
                    maxConnectionY = connectionY;
            }

                let pminX = note.notehead.minX + note.offset_x;
                let pmaxX = note.notehead.maxX + note.offset_x;

                if (pminX < minX)
                    minX = pminX;
                if (pmaxX > maxX)
                    maxX = pmaxX;

                prev_line = note._line;
                prev_connect = note.connectOn;
        }

        if (this._stem === "up")
            minConnectionY -= this._stem_y;
        else
            maxConnectionY += this._stem_y;

        if (this.notes.length === 0) {
            minConnectionY = 0;
            maxConnectionY = 0;
        }

        if (this._stem) { // If stem is not falsy then draw a stem
            if (this._flag)
                this.flag_object = new ElementFlag(this.chord_group, {degree: this._flag, orientation: this._stem});

            this.stem_object = new ElementStem(this.chord_group, {y1: minConnectionY, y2: maxConnectionY});

            if (this._flag) {
                this.flag_object.offset_y = (this._stem === "up") ? this.stem_object.y1 : this.stem_object.y2;
                this.flag_object.offset_x = - STEM_THICKNESS / 2;
            }
        }

        for (let j = 0; j < dot_positions.length; j++) {
            let offset_x = maxX + 1.5;
            let dot_y = dot_positions[j];

            for (let i = 0; i < this._dot_count; i++) {
                offset_x += 3.3;

                    this.dots.push(new ElementAugmentationDot(this.chord_group, {
                        offset_x: offset_x,
                        offset_y: dot_y
                    }));

                offset_x += 2.2;
            }
        }

        for (let i = minlLineY; i < 0; i++) {
            let y = 10 * i;
            let p = new Path(this.chord_group, `M ${minX - 3} ${y} L ${maxlLineX + 3} ${y}`);
            p.addClass("stave-line");
            this.lines.push(p);
        }

        for (let i = 5; i <= maxlLineY; i++) {
            let y = 10 * i;
            let p = new Path(this.chord_group, `M ${minX - 3} ${y} L ${maxlLineX + 3} ${y}`);
            p.addClass("stave-line");
            this.lines.push(p);
        }

        for (let i = minrLineY; i < 0; i++) {
            let y = 10 * i;
            let p = new Path(this.chord_group, `M -3 ${y} L ${maxX + 3} ${y}`);
            p.addClass("stave-line");
            this.lines.push(p);
        }

        for (let i = 5; i <= maxrLineY; i++) {
            let y = 10 * i;
            let p = new Path(this.chord_group, `M -3 ${y} L ${maxX + 3} ${y}`);
            p.addClass("stave-line");
            this.lines.push(p);
        }


        let prevBoundingRects = [];

        for (let i = 0; i < this.notes.length; i++) {
            let note = this.notes[i];

            if (note.accidental_object) {
                let box = note.accidental_object.getBBox();

                box.x += note.offset_x;
                box.y += note.offset_y;

                let top_height = box.y - 2;
                let bottom_height = box.y + box.height + 2;

                let prev_intersect = minX;
                let pos = Infinity;

                prevBoundingRects.sort((x, y) => (x.x - y.x));

                for (let j = prevBoundingRects.length - 1; j >= 0; j--) {
                    let rect = prevBoundingRects[j];

                    if (rect.y <= bottom_height && top_height <= rect.y + rect.height) {
                        if (rect.x + rect.width + 2 < prev_intersect - box.width) { // enough space, maybe?
                            pos = prev_intersect - box.width - 2;
                        }
                        prev_intersect = rect.x;
                    }
                }

                if (pos === Infinity)
                    pos = prev_intersect - box.width - 2;

                note.accidental_object.offset_x = pos - note.offset_x;
                box = note.accidental_object.getBBox();

                box.x += note.offset_x;
                box.y += note.offset_y;

                prevBoundingRects.push(box);
            }
        }

        this.centering_translation.x = ((this._stem === "up") ? 1 : -1) * (11.8 - STEM_THICKNESS / 2) / 2;
        this.bboxCalc();
    }
}

export {ElementNote, ElementAugmentationDot, ElementNoteHead, ElementStem, ElementFlag, ElementChord};