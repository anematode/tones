import {Chord, ScoreNote, NoteStem, NoteHead, Clef} from "./elements.js";

function getExpression(x) {
    if (x instanceof Function) {
        return x;
    } else {
        return (() => x);
    }
}

class Optimizer {
    constructor(params = {}) {
        this.left_margin = params.left_margin ? getExpression(params.left_margin) : getExpression(13);
        this.right_margin = params.right_margin ? getExpression(params.right_margin) : getExpression(13);
    }

    optimize(staff_measure) {
        let elements = staff_measure.elements;

        let width = staff_measure.width;
        let start_x = this.left_margin();
        let end_x = width - this.right_margin();

        for (let i = 0; i < elements.length; i++) {

        }
    }
}

export {Optimizer};