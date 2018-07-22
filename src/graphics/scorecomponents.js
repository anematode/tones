import {ScoreContext, ScoreElement, ScoreGroup} from "./basescore.js";
import {Translation, Rotation, Path} from "./svgmanip.js";
import * as utils from "../utils.js";

const DEFAULT_STAVE_MARGIN_X = 50;
const DEFAULT_STAVE_MARGIN_Y = 50;
const STAFF_LINE_SEPARATION = 10;
const STAFF_SEPARATION = 100;

class _StaffPropertyObject {
    constructor(parent, staff, translation, trans_y) {
        this.staff = staff;
        this._translation = translation;
        this.parent = parent;
        this._trans_y = trans_y;
    }

    get trans_y() {
        return this._trans_y;
    }

    set trans_y(value) {
        this._trans_y = value;

        this.parent._update();
    }
}

class Stave extends ScoreGroup {
    constructor(parent, staff_count = 2, offset_x = DEFAULT_STAVE_MARGIN_X, offset_y = DEFAULT_STAVE_MARGIN_Y, width = parent.width) {
        super(parent);

        this.margin_translation = new Translation(offset_x, offset_y);
        this.addTransform(this.margin_translation);

        this._staffs = [];
        this.width = width;

        for (let i = 0; i < staff_count; i++) {
            this.addStaff();
        }
    }

    get offset_x() {
        return this.margin_translation.x;
    }

    set offset_x(value) {
        this.margin_translation.x = value;
    }

    addStaff(params = {}) {
        let staff = new Staff(this);
        let translation = new Translation();

        let trans_y = (params.y !== undefined) ? params.y : (this.staffCount() === 0 ? 0 : this.getStaffProps(this.staffCount() - 1).translation.y + STAFF_SEPARATION);

        translation.y = trans_y;
        staff.addTransform(translation);

        this._staffs.push({staff, translation});

        return staff;
    }

    getStaff(index) {
        return this._staffs[index].staff;
    }

    staffCount() {
        return this._staffs.length;
    }

    getStaffProps(index) {
        return this._staffs[index];
    }

    removeStaff(index) {
        this._staffs[index].staff.destroy();
        this._staffs.splice(index, 1);
    }

    recalculate() {

    }
}

class StaffLines extends ScoreGroup {
    constructor(parent, line_count = 5, width = parent.width, line_separation = STAFF_LINE_SEPARATION) {
        utils.assert(parent instanceof Staff);

        super(parent);

        this.ian = 10;

        this._lines = [];
        this._width = width;
        this._line_count = line_count;

        this.recalculate();
    }

    get line_count() {
        return this._line_count;
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
        this.recalculate();
    }

    set line_count(value) {
        this._line_count = value;
        this.recalculate();
    }

    get height() {
        return STAFF_LINE_SEPARATION * (this.line_count - 1);
    }

    recalculate() {
            let new_lines = [];

            for (let i = 0; i < this._lines.length; i++) {
                this._lines[i].destroy();
            }

            for (let i = 0; i < this.line_count; i++) {
                let xs = 0;
                let ys = i * STAFF_LINE_SEPARATION;
                let xe = this.width;
                let ye = ys;

                let line = new Path(this, `M ${xs} ${ys} L ${xe} ${ye}`);
                line.addClass("stave-line");

                new_lines.push(line);
            }

            this._lines = new_lines;
    }
}

let TREBLE_PATH = "M 39.638014,63.891442 C 39.246174,65.983409 41.499606,70.115061 45.890584,70.256984 C 51.19892,70.428558 54.590321,66.367906 53.010333,59.740875 L 45.086538,23.171517 C 44.143281,18.81826 44.851281,16.457097 45.354941,15.049945 C 46.698676,11.295749 50.055822,9.7473042 50.873134,10.949208 C 51.339763,11.635413 52.468042,14.844006 49.256275,20.590821 C 46.751378,25.072835 35.096985,30.950138 34.2417,41.468011 C 33.501282,50.614249 43.075689,57.369301 51.339266,54.71374 C 56.825686,52.950639 59.653965,44.62402 56.258057,40.328987 C 47.29624,28.994371 32.923702,46.341263 46.846564,51.0935 C 45.332604,49.90238 44.300646,48.980054 44.1085,47.852721 C 42.237755,36.876941 58.741182,39.774741 54.294493,50.18735 C 52.466001,54.469045 45.080341,55.297323 40.874269,51.477433 C 37.350853,48.277521 35.787387,42.113231 39.708327,37.687888 C 45.018831,31.694223 51.288782,26.31366 52.954064,18.108736 C 54.923313,8.4061491 48.493821,0.84188926 44.429027,10.385835 C 43.065093,13.588288 42.557016,16.803074 43.863006,22.963534 L 51.780549,60.311215 C 52.347386,62.985028 51.967911,66.664419 49.472374,68.355474 C 48.236187,69.193154 43.861784,69.769668 42.791575,67.770092";

class Clef extends Path {
    constructor(parent, d) {
        utils.assert(parent instanceof Staff);

        super(parent, d);
    }
}

let CLEFS = {
    TREBLE: TREBLE_PATH
};

class Accidental extends ScoreGroup {

}

class Note extends ScoreGroup {

}

class Chord extends ScoreGroup {

}

class Barline extends ScoreGroup {
    constructor(parent, params) {

        super(parent);

        this.barline_type = params.type || "normal";
        this.height = params.height || 100;
        this.components = [];
        this.recalculate();
    }

    recalculate() {
        this.components.forEach(x => x.destroy());
        this.components = [];

        switch (this.barline_type) {
            case "none":
                return;
            case "normal":
                let path = new Path(this, `M 0 0 L 0 ${this.height}`);
                path.addClass("barline");
                this.components.push(path);
                break;
        }
    }
}

class Measure extends ScoreGroup {
    constructor(parent, params = {}) {
        utils.assert(parent instanceof Staff);

        super(parent);

        this.start_barline = null;
        this.end_barline = null;

        this.start_x = (params.start !== undefined) ? params.start : 0;
        this.end_x = (params.end !== undefined) ? params.end : 200;

        this.start_barline_type = (params.start_bt !== undefined) ? params.start_bt : "normal";
        this.end_barline_type = (params.end_bt !== undefined) ? params.end_bt : "normal";

        this.recalculate();
    }

    /*addBarline(...args) {
        let barline = new Barline(this, ...args);
        this.barlines.push(barline);
    }*/

    recalculate() {
        this.height = this.parent.height;

        if (this.start_barline) {
            this.start_barline.destroy();
            this.end_barline.destroy();
        }

        this.start_barline = new Barline(this, {type: this.start_barline_type, height: this.height});
        this.end_barline = new Barline(this, {type: this.end_barline_type, height: this.height});

        this.start_barline.addTransform(new Translation(this.start_x));
        this.end_barline.addTransform(new Translation(this.end_x));
    }
}

class Staff extends ScoreGroup {
    constructor(parent) {
        utils.assert(parent instanceof Stave);

        super(parent);

        let lines = new StaffLines(this, 5);

        this.lines = lines;
        this.measures = [];
        this.barlines = [];
        this.ending_barlines = [];

        this.recalculate();
    }

    get width() {
        return this.parent.width;
    }

    addMeasure(...args) {
        let measure = new Measure(this, ...args);
        this.measures.push(measure);
        return measure;
    }

    recalculate() {
        this.height = this.lines.height;

        for (let i = 0; i < this.measures.length; i++) {
            this.measures[i].height = this.height;
        }
    }
}

export {Stave, Staff, Clef};