import {ScoreContext, ScoreGroup} from "../basescore.js";
import {ScoreElement} from "./element.js";
import * as utils from "../../../utils.js";
import DEFAULTS from "../scorevalues.js";

import {Translation} from "../../svgmanip";
import {Staff} from "./staff.js";
import {Barline} from "./barline.js";
import {Measure} from "./measure.js";

/*
Parameters:

offset_x, offset_y -> master offset
width -> width of stave
staff_count -> number of staffs at initialization
barline
 */
class System extends ScoreElement {
    constructor(parent, params = {}) {
        super(parent, Object.assign({offset_x: DEFAULTS.STAVE_MARGIN_X, offset_y: DEFAULTS.STAVE_MARGIN_Y}, params));

        let width = 0;

        this.makeSimpleParam("width", {
            obj: width,
            allow: [
                utils.isNumeric
            ]
        });

        this.makeParam("right_margin_x", () => parent.width - this.offset_x - this.width, (x) => {
            this.width = parent.width - this.offset_x - x;
        });

        this.width = params.width || parent.width - 2 * this.offset_x;

        if (params.right_margin_x)
            this.right_margin_x = params.right_margin_x;

        let staff_count = utils.select(params.staff_count, 0);
        this.staffs = (params.staffs !== undefined) ? params.staffs.map(staff => new Staff(this, staff)) : [];

        let measure_count = utils.select(params.measure_count, 0);
        this.measures = (params.measures !== undefined) ? params.measures.map(measure => new Measure(this, measure)) : []; // Measures

        for (let i = 0; i < staff_count; i++)
            this.addStaff();
        for (let i = 0; i < measure_count; i++)
            this.addMeasure();

        this.recalculate();
    }

    addStaff(params = {}) {
        return this.addStaffAfter(this.staffs.length - 1, params);
    }

    addStaffs(count = 1, params = {}) {
        for (let i = 0; i < count; i++) {
            this.addStaff(params);
        }
    }

    addStaffBefore(index, params = {}) {
        utils.assert(index >= 0 && index <= this.staffs.length);

        let staff = new Staff(this, params);
        let translation = new Translation();

        let spacing_y = params.spacing_y || DEFAULTS.STAFF_SEPARATION;

        utils.assert(spacing_y > 0);

        staff.stave_spacing_y = spacing_y;

        this.staffs.splice(index, 0, staff);

        for (let i = 0; i < this.measures.length; i++) {
            let measure = this.measures[i];

            measure._addStaffMeasureBefore(index);
        }

        this.recalculate();

        return staff;
    }

    addStaffAfter(index, params = {}) {
        return this.addStaffBefore(index + 1, params);
    }

    deleteStaff(index) {
        let staff = this.staffs[index];
        staff.destroy();

        this.staffs.splice(index, 1);

        for (let i = 0; i < this.measures.length; i++) {
            let measure = this.measures[i];

            measure._deleteStaffMeasure(index);
        }
    }

    setStaffSpacing(index, spacing_y) {
        utils.assert(spacing_y > 0);

        let staff = this.getStaff(index);

        staff.spacing_y = spacing_y;

        this.recalculate();
    }

    updateStaffHeights() {
        let last_y = 0;
        for (let i = 0; i < this.staffs.length; i++) {
            let staff = this.staffs[i];

            staff.stave_translation.y = last_y;

            last_y += staff.stave_spacing_y;
        }
    }

    lastStaff() {
        if (this.staffCount() <= 0) {
            return null;
        }

        return this.staffs[this.staffs.length - 1];
    }

    getStaff(index) {
        return this.staffs[index];
    }

    getStaffHeight(index) {
        return this.staffs[index].stave_translation.y;
    }

    getStaffIndex(staff) {
        let id;

        if (staff._id) {
            id = staff._id;
        } else {
            id = staff;
        }

        for (let i = 0; i < this.staffs.length; i++) {
            let staff = this.getStaff(i);

            if (staff._id === id) {
                return i;
            }
        }

        return -1;
    }

    removeStaff(index) {
        this.staffs[index].staff.destroy();
        this.staffs.splice(index, 1);
    }

    rescaleMeasures() {
        if (this.measureCount() === 0) return;
        let prevWidth = this.getMeasure(this.measureCount() - 1).end_x;
        let width = this.width;

        if (prevWidth === width) return;

        for (let i = 0; i < this.measures.length - 1; i++) {
            this.setBarlineXAfter(i, this.getBarlineXAfter(i) / prevWidth * width);
        }
    }

    recalculate() {
        for (let i = 0; i < this.staffs.length; i++) {
            this.staffs[i].width = this.width;
            this.staffs[i].recalculate();
        }

        // Recalculate staff heights
        this.updateStaffHeights();

        // Rescale measures
        this.rescaleMeasures();

        let height = this.height;

        // Recalculate measures
        for (let i = 0; i < this.measures.length; i++) {
            this.measures[i].height = height;
            this.measures[i].recalculate();
        }
    }

    measureApply(func) {
        for (let i = 0; i < this.measures.length; i++) {
            func(this.measures[i], i);
        }
    }

    addMeasure(params = {}) {
        let width = this.width;
        let measure_count = this.measures.length + 1;

        let measure = new Measure(this, Object.assign({height: this.height}, params));

        let start_x = 0;
        let end_x = width;

        for (let i = 0; i < measure_count - 1; i++) {
            let measure = this.measures[i];

            measure.start_x = measure.start_x / (measure_count) * (measure_count - 1);
            measure.end_x = measure.end_x / (measure_count) * (measure_count - 1);

            start_x = measure.end_x;

            measure.recalculate();
        }

        measure.start_x = start_x;
        measure.end_x = end_x;

        this.measures.push(measure);

        measure.recalculate();

        this.recalculate();

        return measure;
    }

    addMeasures(count = 1, params = {}) {
        for (let i = 0; i < count; i++) {
            this.addMeasure(params);
        }
    }

    getBarlineBefore(index) {
        return this.getMeasure(index).start_barline;
    }

    getBarlineAfter(index) {
        return this.getMeasure(index).end_barline;
    }

    getBarlineXBefore(index) {
        return this.getMeasure(index).start_x;
    }

    getBarlineXAfter(index) {
        return this.getMeasure(index).end_x;
    }

    setBarlineXBefore(index, value) {
        utils.assert(index > 0 && index < this.measures.length);

        this.getMeasure(index - 1).end_x = value;
        this.getMeasure(index).start_x = value;
    }

    setBarlineXAfter(index, value) {
        this.setBarlineXBefore(index + 1, value);
    }

    measureCount() {
        return this.measures.length;
    }

    getMeasure(index) {
        utils.assert(index >= 0 && index < this.measures.length);

        return this.measures[index];
    }

    measure(index) {
        return this.getMeasure(index);
    }

    getMeasureIndex(measure) {
        let id;

        if (measure._id) {
            id = measure._id;
        } else {
            id = measure;
        }

        for (let i = 0; i < this.measures.length; i++) {
            let m = this.getMeasure(i);

            if (m._id === id) {
                return i;
            }
        }

        return -1;
    }

    deleteMeasure(index) {
        utils.assert(index >= 0 && index < this.measures.length);

        let measure_count = this.measures.length;

        let before = index;
        let after = measure_count - index - 1;

        let measure = this.getMeasure(index);

        let start_x = measure.start_x;
        let end_x = measure.end_x;

        let middle_x = (start_x * after + end_x * before) / (after + before);

        measure.destroy();
        this.measures.splice(index, 1);

        for (let i = 0; i < index; i++) {
            // Measures before the deleted measure

            this.setBarlineXAfter(i, this.getBarlineXAfter(i) / start_x * middle_x);
        }

        // Measures after the deleted measure
        for (let i = index; i < this.measures.length - 1; i++) {
            this.setBarlineXAfter(i, this.width - (this.width - this.getBarlineXAfter(i)) / start_x * middle_x);
        }

        this.recalculate();
    }

    insertMeasureAfter(index, params = {}) {

    }

    getParams() {
        return {
            offset_x: this.offset_x,
            offset_y: this.offset_y,
            width: this.width,
            measures: this.measures.map(meas => meas.getParams()),
            staffs: this.staffs.map(staff => staff.getParams())
        };
    }

    get height() {
        return (this.staffs.length >= 1) ? this.maxY - this.minY : 0;
    }

    get maxY() {
        if (this.staffs.length >= 1) {
            let last_staff = this.staffs[this.staffs.length - 1];
            return last_staff.stave_translation.y + last_staff.maxY;
        } else {
            return null;
        }
    }

    get minY() {
        if (this.staffs.length >= 1) {
            let first_staff = this.staffs[0];
            return first_staff.stave_translation.y + first_staff.minY;
        } else {
            return null;
        }
    }

    get leftMargin() {
        return this.offset_x;
    }

    set leftMargin(value) {
        this.offset_x = value;
        this.recalculate();
    }

    get rightMargin() {
        return this.right_margin_x;
    }

    set rightMargin(value) {
        this.right_margin_x = value;
        this.recalculate();
    }

    optimize(optimizer = this.context.score.optimizer) {
        this.measures.forEach(meas => meas.optimize(optimizer));
    }
}

export { System };