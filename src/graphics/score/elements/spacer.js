
import {ScoreElement} from "./element.js";
import * as utils from "../../../utils.js";
import {Translation} from "../../svgmanip.js";

class ElementSpacer extends ScoreElement {
    constructor(parent, params) {
        super(parent);

        this.width = params.width;
    }

    get minX() {
        return this.offset_x;
    }

    set minX(value) {
        this.offset_x = value;
    }

    get maxX() {
        return this.offset_x + width;
    }

    set maxX(value) {
        this.offset_x = value - width;
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
}

export {ElementSpacer, ElementPositioner};