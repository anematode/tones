import {ElementClef, ElementTimeSig} from "./elements.js";
import {StaffMeasure, Measure} from "./elements/measure.js";
import {System} from "./elements/system.js";

function getExpression(x) {
    if (x instanceof Function) {
        return x;
    } else {
        return (() => x);
    }
}

/*
Elements should have the following properties to help the optimizer:

width() (width of object)
minX() (current minX of object based off offset_x)
maxX() current maxX of object based off offset_y)
spacingX(state) (desired spacing after maxX for the element, given a state, allowing smarter spacing)

state has the following structure:

{
   width: width of measure,
   count: number of elements
}
 */

class Optimizer {
    constructor(params = {}) {
        this.left_margin = params.left_margin ? getExpression(params.left_margin) : getExpression(15);
        this.right_margin = params.right_margin ? getExpression(params.right_margin) : getExpression(15);

        this.move_barlines = (params.move_barlines !== undefined) ? params.move_barlines : false;
    }

    optimize(elem) {
        if (elem instanceof StaffMeasure) {
            this.optimizeStaffMeasure(elem);
        } else if (elem instanceof Measure) {
            this.optimizeMeasure(elem);
        } else if (elem instanceof System) {
            this.optimizeSystem(elem);
        }
    }

    optimizeStaffMeasure(staff_measure) {
        let elements = staff_measure.elements;
        let width = staff_measure.width;

        let start_x = this.left_margin(width);
        let end_x = width - this.right_margin(width);

        let lastSpacingX = start_x;

        for (let i = 0; i < elements.length; i++) {
            let element = elements[i];

            if (element instanceof ElementClef) {
                element.minX = lastSpacingX;
                lastSpacingX = element.maxX + 10;
            } else if (element instanceof ElementTimeSig) {
                element.minX = lastSpacingX;
                lastSpacingX = element.maxX + 10;
            } else {
                element.minX = lastSpacingX;
                lastSpacingX = element.maxX + 5;
            }
        }
    }

    optimizeMeasure(measure) {
        for (let i = 0; i < measure.staff_measures.length; i++) {
            this.optimizeStaffMeasure(measure.staff_measures[i]);
        }
    }

    optimizeSystem(system) {
        if (!this.move_barlines) {
            for (let i = 0; i < system.measures.length; i++) {
                this.optimizeMeasure(system.measures[i]);
            }
        } else {
            for (let i = 0; i < system.measures.length; i++) {

            }
        }
    }
}

export {Optimizer};