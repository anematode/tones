import {ElementClef, ElementTimeSig} from "./elements.js";

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
    }

    optimize(staff_measure) {
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
}

export {Optimizer};