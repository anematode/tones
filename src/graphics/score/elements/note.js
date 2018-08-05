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

        let type;

        this.makeSimpleParam("type", {
            obj: type,
            allow: [
                "normal", "half", "whole", "double", "none"
            ]
        });

        this.type = utils.select(params.type, "normal");

        this.impl.shape = null;

        this.recalculate();
    }

    rightConnectionX() {
        switch (this.type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_x + 1.18 * 10;
            default:
                throw new Error(`Note of type ${this.type} cannot have a connection`);
        }
    }

    leftConnectionX() {
        switch (this.type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_x;
            default:
                throw new Error(`Note of type ${this.type} cannot have a connection`);
        }
    }

    rightConnectionY() {
        switch (this.type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_y - 0.168 * 10;
            default:
                throw new Error(`Note of type ${this.type} cannot have a connection`);
        }
    }

    leftConnectionY() {
        switch (this.type) {
            case "normal":
            case "none":
            case "half":
                return this.offset_y + 0.168 * 10;
            default:
                throw new Error(`Note of type ${this.type} cannot have a connection`);
        }
    }

    recalculate() {
        if (this.impl.shape)
            this.impl.shape.destroy();

        switch (this.type) {
            case "normal":
                this.impl.shape = makeShape(this, "NOTEHEAD_NORMAL");
                break;
            case "half":
                this.impl.shape = makeShape(this, "NOTEHEAD_HALF");
                break;
            case "whole":
                this.impl.shape = makeShape(this, "NOTEHEAD_WHOLE");
                break;
            case "double":
                this.impl.shape = makeShape(this, "NOTEHEAD_DOUBLE_WHOLE");
                break;
            case "none":
                break;
            default:
                throw new Error(`Unrecognized notehead type ${this.type}`);
        }
    }

}

class ElementAugmentationDot extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.path = makeShape(this, "AUGMENTATION_DOT");

        this.recalculate();
    }

    getBBox() {
        return {x: this.offset_x, y: this.offset_y - 2, width: 4, height: 4};
    }

    _recalculate() {

    }
}

class ElementNote extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        let accidental, line, type;

        this.makeSimpleParam("line", {
            obj: line,
            allow: [
                utils.isNumeric
            ]
        });

        this.makeSimpleParam("type", {
            obj: type,
            allow: [
                "normal", "half", "whole"
            ]
        });

        this.makeSimpleParam("accidental", {
            obj: accidental
        });

        this.line = utils.select(params.line, 0);
        this.type = utils.select(params.type, "normal");
        this.accidental = utils.select(params.accidental, params.acc, "");

        this.impl.notehead = null;
        this.impl.accidental_object = null;

        this.recalculate();
    }

    _recalculate() {
        if (this.impl.notehead)
            this.impl.notehead.destroy();
        if (this.impl.accidental_object)
            this.impl.accidental_object.destroy();

        this.impl.notehead = new ElementNoteHead(this, {type: this.type});
        this.offset_y = this.line * 10;

        if (this.accidental)
            this.impl.accidental_object = new ElementAccidental(this, {type: this.accidental, offset_x: -12});
    }
}

class ElementStem extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        let y1, y2;

        this.makeSimpleParam("y1", {
            obj: y1,
            allow: [
                utils.isNumeric
            ]
        });

        this.makeSimpleParam("y2", {
            obj: y2,
            allow: [
                utils.isNumeric
            ]
        });

        this.y1 = utils.select(params.y1, 0);
        this.y2 = utils.select(params.y2, 0);

        this.impl.path = new Path(this, "");
        this.impl.path.addClass("note-stem");

        this.recalculate();
    }

    _recalculate() {
        this.impl.path.d = `M 0 ${this.y1} L 0 ${this.y2}`;
    }
}

class ElementFlag extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        let degree = 1;

        this.makeSimpleParam("degree", {
            obj: degree,
            allow: [
                (x) => (utils.isInteger(x) && utils.inRange(x, 1, 8))
            ]
        });

        this.makeSimpleParam("orientation", {
            obj: degree,
            allow: [
                "up", "down"
            ]
        });

        this.degree = utils.select(params.degree, 1);
        this.orientation = utils.select(params.orientation, "up");

        this.impl.shape = null;

        this.recalculate();
    }

    _recalculate() {
        if (this.impl.shape)
            this.impl.shape.destroy();

        let SHAPE_ID = "FLAG_" + (this.orientation.toUpperCase()) + "_" + this.degree;

        this.impl.shape = makeShape(this, SHAPE_ID);
    }
}

const STEM_THICKNESS = 2; // Move to defaults TODO

class ElementChord extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, params);

        this.impl.chord_group = new ScoreGroup(this);

        this.notes = params.notes ? params.notes.map(x => new ElementNote(this.impl.chord_group, x)) : [];

        let articulation = "";
        this.makeSimpleParam("articulation", {obj: articulation});

        this.articulation = utils.select(params.articulation, ".");

        let stem = "";
        this.makeSimpleParam("stem", {obj: stem, allow: [
                (x) => !x, "up", "down"
            ]
        });

        this.stem = utils.select(params.stem, "up"); // Values: falsy is none, "up" is upward facing stem, "down" is downward facing stem

        let flag = "";
        this.makeSimpleParam("flag", {obj: flag, allow: [
                (x) => !x, (x) => (utils.isInteger(x) && utils.inRange(x, 0, 8))
            ]
        });

        this.flag = utils.select(params.flag, 0); // Values: falsy is none (0 is natural here), 1 is eighth, 2 is sixteenth, etc. to 8 is 1024th

        let stem_y = 0;
        this.makeSimpleParam("stem_y", {obj: stem_y, allow: [
                utils.isNumeric
            ]
        });

        this.stem_y = utils.select(params.stem_y, 35); // Extra amount stem from last note
        
        let dot_count = 0;
        this.makeSimpleParam("dot_count", {obj: dot_count, allow: [
                (x) => (utils.isInteger(x) && utils.inRange(x, 0, 5))
            ]
        });
        
        this.dot_count = utils.select(params.dot_count, 0);
        
        let force_y = 0;
        this.makeSimpleParam("force_y", {obj: force_y, allow: [
                utils.isNumeric, (x) => (x === null)
            ]
        });
        
        this.force_y = utils.select(params.force_y, null); // Force the stem to go here and stop displaying the flag, for use in beaming

        this.impl.articulation_object = null;
        this.impl.stem_object = null;
        this.impl.flag_object = null;
        this.impl.dots = [];
        this.impl.lines = []; // extra lines when notes go beyond staff

        this.impl.centering_translation = new Translation();
        this.impl.chord_group.addTransform(this.impl.centering_translation);

        this.recalculate();
    }

    addNote(params = {}) {
        let note = new ElementNote(this.impl.chord_group, params);
        this.notes.push(note);

        this.needs_recalculate = true;

        return note;
    }

    removeNote(index) {
        this.notes[index].destroy();
        this.notes.splice(index, 1);

        this.needs_recalculate = true;
    }

    sortNotes() {
        this.notes.sort((n1, n2) => (n1.line - n2.line));
    }

    _recalculate() {
        if (this.impl.stem_object)
            this.impl.stem_object.destroy();
        if (this.impl.articulation_object)
            this.impl.articulation_object.destroy();
        if (this.impl.flag_object)
            this.impl.flag_object.destroy();

        this.impl.lines.forEach(x => x.destroy());
        this.impl.lines = [];

        this.impl.dots.forEach(x => x.destroy());
        this.impl.dots = [];

        this.sortNotes();

        let prevline = Infinity;
        let prev_connect = 1;

        let default_connect = (!this.stem) ? 0 : ((this.stem === "up") ? 0 : 1);

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

            if (note.line < prevline - 0.6) {
                note.connectOn = default_connect; // 1 is right, 0 is left
                note.offset_x = note.connectOn * (11.8 - STEM_THICKNESS / 2) - 11.8;
            } else {
                note.connectOn = 1 - prev_connect;
                note.offset_x = note.connectOn * (11.8 - STEM_THICKNESS / 2) - 11.8;
            }

            if (note.connectOn === 0) {
                if (note.line < minlLineY)
                    minlLineY = Math.floor(note.line + 0.5);
                if (note.line > maxlLineY)
                    maxlLineY = Math.ceil(note.line - 0.5);
                let n_x = note.impl.notehead.maxX + note.offset_x;
                if (n_x > maxlLineX)
                    maxlLineX = n_x;
            } else {
                if (note.line < minrLineY)
                    minrLineY = Math.floor(note.line + 0.5);
                if (note.line > maxrLineY)
                    maxrLineY = Math.ceil(note.line - 0.5);
            }

            let dot_y = Math.floor((note.offset_y + 5) / 10) * 10 - 5;

            if (dot_positions.includes(dot_y)) {
                if (!dot_positions.includes(dot_y + 10))
                    dot_positions.push(dot_y + 10);
            } else {
                dot_positions.push(dot_y);
            }

            if (this.stem) {
                let connectionY = (note.connectOn ? note.impl.notehead.leftConnectionY() : note.impl.notehead.rightConnectionY()) + note.offset_y;

                if (connectionY < minConnectionY)
                    minConnectionY = connectionY;
                if (connectionY > maxConnectionY)
                    maxConnectionY = connectionY;
            }

                let pminX = note.impl.notehead.minX + note.offset_x;
                let pmaxX = note.impl.notehead.maxX + note.offset_x;

                if (pminX < minX)
                    minX = pminX;
                if (pmaxX > maxX)
                    maxX = pmaxX;

                prevline = note.line;
                prev_connect = note.connectOn;
        }

        if (!(this.force_y === null)) { // if there's a stem y value to be forced, use it
            if (minConnectionY > this.force_y) {
                minConnectionY = this.force_y;
            } else if (maxConnectionY < this.force_y) {
                maxConnectionY = this.force_y;
            } else { // welp the stem will connect in the middle of the chord

            }
        } else {
            if (this.stem === "up")
                minConnectionY -= this.stem_y;
            else
                maxConnectionY += this.stem_y;
        }

        if (this.notes.length === 0) {
            minConnectionY = 0;
            maxConnectionY = 0;
        }

        if (this.stem) { // If stem is not falsy then draw a stem
            if (this.flag && this.force_y === null) // Only draw when there's no stem y
                this.impl.flag_object = new ElementFlag(this.impl.chord_group, {degree: this.flag, orientation: this.stem});

            this.impl.stem_object = new ElementStem(this.impl.chord_group, {y1: minConnectionY, y2: maxConnectionY});

            if (this.flag && this.force_y === null) {
                this.impl.flag_object.offset_y = (this.stem === "up") ? this.impl.stem_object.y1 : this.impl.stem_object.y2;
                this.impl.flag_object.offset_x = - STEM_THICKNESS / 2;
            }
        }

        for (let j = 0; j < dot_positions.length; j++) {
            let offset_x = maxX + 1.5;
            let dot_y = dot_positions[j];

            for (let i = 0; i < this.dot_count; i++) {
                offset_x += 3.3;

                    this.impl.dots.push(new ElementAugmentationDot(this.impl.chord_group, {
                        offset_x: offset_x,
                        offset_y: dot_y
                    }));

                offset_x += 2.2;
            }
        }

        for (let i = minlLineY; i < 0; i++) {
            let y = 10 * i;
            let p = new Path(this.impl.chord_group, `M ${minX - 3} ${y} L ${maxlLineX + 3} ${y}`);
            p.addClass("stave-line");
            this.impl.lines.push(p);
        }

        for (let i = 5; i <= maxlLineY; i++) {
            let y = 10 * i;
            let p = new Path(this.impl.chord_group, `M ${minX - 3} ${y} L ${maxlLineX + 3} ${y}`);
            p.addClass("stave-line");
            this.impl.lines.push(p);
        }

        for (let i = minrLineY; i < 0; i++) {
            let y = 10 * i;
            let p = new Path(this.impl.chord_group, `M -3 ${y} L ${maxX + 3} ${y}`);
            p.addClass("stave-line");
            this.impl.lines.push(p);
        }

        for (let i = 5; i <= maxrLineY; i++) {
            let y = 10 * i;
            let p = new Path(this.impl.chord_group, `M -3 ${y} L ${maxX + 3} ${y}`);
            p.addClass("stave-line");
            this.impl.lines.push(p);
        }

        let prevBoundingRects = [];

        for (let i = 0; i < this.notes.length; i++) {
            let note = this.notes[i];

            if (note.impl.accidental_object) {
                let box = note.impl.accidental_object.getBBox();

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

                note.impl.accidental_object.offset_x = pos - note.offset_x;
                box = note.impl.accidental_object.getBBox();

                box.x += note.offset_x;
                box.y += note.offset_y;

                prevBoundingRects.push(box);
            }
        }

        this.impl.centering_translation.x = ((this.stem === "up") ? 1 : -1) * (11.8 - STEM_THICKNESS / 2) / 2;
    }

    _getOtherParams() {
        return {
            notes: this.notes.map(note => note.getParams())
        }
    }
}

export {ElementNote, ElementAugmentationDot, ElementNoteHead, ElementStem, ElementFlag, ElementChord};