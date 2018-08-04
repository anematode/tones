import {ScoreContext, ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import DEFAULTS from "../scorevalues.js";

import {Path, Translation} from "../../svgmanip";
import {Barline} from "./barline.js";
import {Measure} from "./measure.js";

class StaffLines extends ScoreGroup {
    constructor(parent, line_count = 5, width = parent.width, line_separation = DEFAULTS.STAFF_LINE_SEPARATION) {
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

    recalculate() {
        let new_lines = [];

        for (let i = 0; i < this._lines.length; i++) {
            this._lines[i].destroy();
        }

        for (let i = 0; i < this.line_count; i++) {
            let xs = 0;
            let ys = i * DEFAULTS.STAFF_LINE_SEPARATION;
            let xe = this.width;
            let ye = ys;

            let line = new Path(this, `M ${xs} ${ys} L ${xe} ${ye}`);
            line.addClass("stave-line");

            new_lines.push(line);
        }

        this._lines = new_lines;
    }

    get maxY() {
        return (this.line_count - 1) * DEFAULTS.STAFF_LINE_SEPARATION;
    }

    get minY() {
        return 0;
    }

    get height() {
        return this.maxY - this.minY;
    }
}

class Staff extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        this.width = params.width || parent.width;

        // Internal
        let lines = new StaffLines(this, 5);
        this.lines = lines;

        this.stave_translation = new Translation(0, (params.stave_translation_y !== undefined) ? params.stave_translation_y : 0);
        this.stave_spacing_y = (params.stave_spacing_y !== undefined) ? params.stave_spacing_y : 0;

        this.addTransform(this.stave_translation);

        this.recalculate();
    }

    recalculate() {
        this.lines.width = this.width;

        this.height = this.lines.height;
    }

    get minY() {
        return this.lines.minY;
    }

    get maxY() {
        return this.lines.maxY;
    }

    getParams() {
        return {
            stave_translation_y: this.stave_translation.y,
            stave_spacing_y: this.stave_spacing_y,
            width: this.width
        };
    }
}

export {Staff};