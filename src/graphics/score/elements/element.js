import {ScoreGroup} from "../basescore";
import {Translation} from "../../svgmanip";

class ScoreElement extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        this.translation = new Translation();
        this.addTransform(this.translation);

        this.offset_x = (params.offset_x !== undefined) ? params.offset_x : 0;
        this.offset_y = (params.offset_y !== undefined) ? params.offset_y : 0;
    }

    get offset_x() {
        return this.translation.x;
    }

    set offset_x(value) {
        this.translation.x = value;
    }

    get offset_y() {
        return this.translation.y;
    }

    set offset_y(value) {
        this.translation.y = value;
    }
}

export {ScoreElement};