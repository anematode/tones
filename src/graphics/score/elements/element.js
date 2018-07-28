import {ScoreGroup} from "../basescore";
import {Translation} from "../../svgmanip";

/*
Abstract class of a score element
 */
class ScoreElement extends ScoreGroup {
    constructor(parent, params = {}) {
        let _secret_group = new ScoreGroup(parent);

        super(_secret_group);

        this._secret_group = _secret_group;

        this.translation = new Translation();
        this.addTransform(this.translation);

        this.offset_x = (params.offset_x !== undefined) ? params.offset_x : 0;
        this.offset_y = (params.offset_y !== undefined) ? params.offset_y : 0;

        this.duration = (params.duration !== undefined) ? params.duration : 0;
        this.bboxCalc();
    }

    remove() {
        this.element.remove();

        this._secret_group.remove();

        this.parent.removeChild(this);
    }

    getBBox() {
        return this._secret_group.getBBox();
    }

    get offset_x() {
        return this.translation.x;
    }

    set offset_x(value) {
        this.translation.x = value;
        this.bboxCalc();
    }

    get offset_y() {
        return this.translation.y;
    }

    set offset_y(value) {
        this.translation.y = value;
        this.bboxCalc();
    }

    get minX() {
        return this.bounding_box.x;
    }

    set minX(value) {
        this.offset_x = value - this.minX;
    }

    get maxX() {
        return this.bounding_box.x + this.bounding_box.width;
    }

    set maxX(value) {
        this.offset_x = value - this.maxX;
    }

    get width() {
        return this.bounding_box.width;
    }

    get minY() {
        return this.bounding_box.y;
    }

    set minY(value) {
        this.offset_y = value - this.minY;
    }

    get maxY() {
        return this.bounding_box.y + this.bounding_box.height;
    }

    set maxY(value) {
        this.offset_y = value - this.maxY;
    }

    get height() {
        return this.bounding_box.height;
    }

    bboxCalc() {
        this.bounding_box = this.getBBox();
    }
}

export {ScoreElement};