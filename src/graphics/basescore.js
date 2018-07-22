import {
    SVGContext, SVGElement, SVGGroup
} from "./svgmanip.js";

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

class ScoreElement extends SVGElement { // The only annoying part (workaround SVGElement)
    constructor(parent, tag = "rect") {
        super(parent, tag);
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
}

class ScoreGroup extends SVGGroup {
    constructor(parent) {
        super(parent);
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


export {ScoreContext, ScoreElement, ScoreGroup};