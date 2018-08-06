import {ScoreGroup} from "../basescore";
import {Translation} from "../../svgmanip";
import * as utils from "../../../utils.js";

/*
Abstract class of a score element
 */
class ScoreElement extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);
        this.param_list = [];

        let translation = new Translation();
        this.addTransform(translation);

        let bounding_box = {x: 0, y: 0, width: 0, height: 0};

        this.makeParam("bounding_box", () => {
            if (this.needs_bb_recalculate || this.needs_recalculate)
                bounding_box = this.getBBox();
            return bounding_box; // may have to do Object.assign / spread
        }, () => {
            throw new Error("Cannot set bounding box");
        });

        this.makeParam("offset_x", () => translation.x, (value) => {
            let delta = value - this.offset_x;
            translation.x = value;

            if (this.bounding_box) {
                this.bounding_box.x += delta;
            }
        });

        this.makeParam("offset_y", () => translation.y, (value) => {
            let delta = value - this.offset_y;
            translation.y = value;

            if (this.bounding_box) {
                this.bounding_box.y += delta;
            }
        });

        let duration = 0;

        this.makeSimpleParam("duration", {
            obj: duration,
            allow: [
                (x) => (utils.isNumeric(x) && x >= 0)
            ]
        });

        this.offset_x = utils.select(params.offset_x, 0);
        this.offset_y = utils.select(params.offset_y, 0);
        this.impl = {};

        this.duration = utils.select(params.duration, 0);

        this.needs_recalculate = true;
        this.needs_bb_recalculate = true;
    }

    setParams(object) {
        for (let key in object) {
            if (object.hasOwnProperty(key) && this.param_list.includes(key)) {
                this[key] = object[key];
            }
        }
    }

    recalculate(force = false) {
        if (!force && !this.needs_recalculate)
            return;

        this.needs_recalculate = false;

        if (this._recalculate)
            this._recalculate();

        this.needs_bb_recalculate = true;
        // propagate here
    }

    getParams() {
        let ret = {};

        for (let i = 0; i < this.param_list.length; i++) {
            let param = this.param_list[i];

            ret[param] = this[param];
        }

        if (this._getOtherParams)
            Object.assign(ret, this._getOtherParams());

        return ret;
    }

    makeParam(name, getter, setter) {
        let that = this;

        Object.defineProperty(this, name, {
            set(v) {
                setter(v);
            },
            get() {
                return getter();
            }
        });

        this.param_list.push(name);
    }

    makeSimpleParam(name, params = {}) {
        params.mark = utils.select(params.mark, true);

        if (params.allow) {
            let allowed = params.allow.map(x => (x instanceof Function) ? x : ((a) => a === x));

            this.makeParam(name, () => params.obj, (value) => {
                utils.assert(allowed.some(func => {
                    try {
                        return func(value)
                    } catch (e) {
                        return false;
                    }
                }), `Invalid value ${value} for parameter ${name}`);

                params.obj = value;

                if (params.mark)
                    this.needs_recalculate = true;
            });
        } else {
            this.makeParam(name, () => params.obj, (value) => {
                params.obj = value
            });
        }
    }

    remove() {
        this.element.remove();

        this.parent.removeChild(this);
    }

    getBBox() {
        if (this.needs_recalculate)
            this.recalculate();
        if (!this.needs_bb_recalculate)
            return Object.assign({}, this.bounding_box);

        let box = (this._getBBox) ? this._getBBox() : this.element.getBBox();

        box.x += this.offset_x;
        box.y += this.offset_y;

        return box;
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
}

export {ScoreElement};