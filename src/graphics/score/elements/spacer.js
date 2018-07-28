
import {ScoreElement} from "./element.js";
import * as utils from "../../../utils.js";
import {Translation, Path} from "../../svgmanip.js";

class ElementSpacer extends ScoreElement {
    constructor(parent, params) {
        super(parent);

        this.width_value = params.width;
        this.path = new Path(this, "");

        this.recalculate();
    }

    recalculate() {
        this.path.d = `M 0 0 L ${this.width_value} 0`;

        this.bboxCalc();
    }
}

class ElementPositioner extends ScoreElement {
    constructor(parent, params) {
        super(parent);

        this.x = params.x || 0;
        this.width = 0;
    }

    get minX() {
        return this.x;
    }

    set minX(value) {

    }

    get maxX() {
        return this.x;
    }

    set maxX(value) {

    }

    get minY() {
        return 0;
    }

    set minY(value) {

    }

    get maxY() {
        return 0;
    }

    set maxY(value) {

    }
}

export {ElementSpacer, ElementPositioner};