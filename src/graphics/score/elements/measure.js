import {ScoreContext, ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import DEFAULTS from "../scorevalues.js";

import {Barline} from "./barline.js";
import {Translation} from "../../svgmanip.js";
import {buildElements, jsonifyElements, constructElement} from "../elements.js";

// basic unit of manipulation
class StaffMeasure extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        let offset_x = (params.offset_x !== undefined) ? params.offset_x : 0;
        let offset_y = (params.offset_y !== undefined) ? params.offset_y : 0;

        this.measure_translation = new Translation(offset_x, offset_y);
        this.addTransform(this.measure_translation);

        this.elements = (params.elements) ? buildElements(params.elements) : [];
    }

    addElement(params = {}) {
        let element = constructElement(this, params);

        this.elements.push(element);

        return element;
    }

    addElements(...array) {
        if (array.length > 0 && Array.isArray(array[0])) {
            array = array[0];
        }

        let elements = [];

        for (let i = 0; i < array.length; i++) {
            elements.push(this.addElement(array[i]));
        }

        return elements;
    }

    getParams() {
        return {
            offset_x: this.measure_translation.x,
            offset_y: this.measure_translation.y,
            elements: jsonifyElements(this.elements)
        };
    }

    optimize(optimizer = this.context.score.optimizer) {
        optimizer.optimize(this);
    }
}


class Measure extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        // Parameters
        this.height = params.height || DEFAULTS.MEASURE_HEIGHT;

        utils.assert(this.height > 0, "Height must be positive");

        this.start_x = (params.start_x !== undefined) ? params.start_x : 0;
        this.end_x = (params.end_x !== undefined) ? params.end_x : 200;

        utils.assert(this.start_x < this.end_x, "Start x must be smaller than end x");

        // Internal
        this.start_barline = new Barline(this, params.start_barline || {offset_x: this.start_x, barline_type: "normal", height: this.height});
        this.end_barline = new Barline(this, params.end_barline || {offset_x: this.end_x, barline_type: "normal", height: this.height});

        this.staff_measures = (params.staff_measures !== undefined) ?
            params.staff_measures.map(meas => new StaffMeasure(this, meas)) :
            [...Array(this.parent.staffs.length).keys()].map(index => new StaffMeasure(this));

        this.recalculate();
    }

    get _staffs() {
        return this.parent.staffs;
    }

    _setStartX(value) {
        this.start_x = value;

        utils.assert(this.start_x < this.end_x, "Start x must be smaller than end x");

        this.recalculate();
    }

    _setEndX(value) {
        this.end_x = value;

        utils.assert(this.start_x < this.end_x, "Start x must be smaller than end x");

        this.recalculate();
    }

    _addStaffMeasureBefore(index, params = {}) {
        this.staff_measures.splice(index, 0, new StaffMeasure(this, params));

        this.recalculate();
    }

    _getStaffMeasure(index) {
        return this.staff_measures[index];
    }

    _deleteStaffMeasure(index) {
        let measure = this.staff_measures[index];
        measure.destroy();
        this.staff_measures.splice(index, 1);

        this.recalculate();
    }

    startBarline() {
        return this.start_barline;
    }

    endBarline() {
        return this.end_barline;
    }

    staff(index) {
        return this.staff_measures[index];
    }

    recalculate() {
        // set start and end barline x positions

        this.start_barline.offset_x = this.start_x;
        this.end_barline.offset_x = this.end_x;

        this.start_barline.height = this.height;
        this.end_barline.height = this.height;

        // regenerate start and end barline

        this.start_barline.recalculate();
        this.end_barline.recalculate();

        for (let i = 0; i < this.staff_measures.length; i++) {
            let measure = this.staff_measures[i];

            measure.measure_translation.x = this.start_x;
            measure.measure_translation.y = this._staffs[i].stave_translation.y;

            measure.width = this.end_x - this.start_x;
        }
    }

    getParams() {
        return {
            height: this.height,
            start_x: this.start_x,
            end_x: this.end_x,
            start_barline: this.start_barline.getParams(),
            end_barline: this.end_barline.getParams(),
            staff_measures: this.staff_measures.map(meas => meas.getParams())
        };
    }

    get minY() {
        return 0;
    }

    get maxY() {
        return this.height;
    }

    optimize(optimizer = this.context.score.optimizer) {
        this.staff_measures.forEach(meas => meas.optimize(optimizer));
    }
}

export {Measure, StaffMeasure};