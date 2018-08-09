import {
    SVGContext, SVGElement, SVGGroup, SVGNS
} from "../svgmanip.js";

class ScoreContext extends SVGContext {
    constructor(domElem) {
        super(domElem);
    }

    propagateParentsUpdate() {
        if (this._update) {
            this._update();
        }
    }
}

class ScoreGroup extends SVGGroup {
    constructor(parent, tag = 'g', params = {}) {
        super(parent, tag, Object.assign(params, {use_zindex: false}));
    }

    propagateParentsUpdate(execbefore = true) {
        if (execbefore && this._update) {
            this._update();
        }

        if (this.parent) {
            this.parent.propagateParentsUpdate(execbefore);
        }

        if (!execbefore && this._update) {
            this._update();
        }
    }

    makeScoreElem(Class, ...args) {
        let element = new Class(this, ...args);
    }

    addScoreElem(...args) {
        this.makeScoreElem(...args);
    }

    static tag() {
        return "g";
    }
}


export {ScoreContext, ScoreGroup};