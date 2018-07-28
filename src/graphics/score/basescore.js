import {
    SVGContext, SVGElement, SVGGroup, SVGNS
} from "../svgmanip.js";
import {SHAPES} from "./elements/scoreshapes.js"

class ScoreContext extends SVGContext {
    constructor(domElem) {
        super(domElem);

        this.defs = this.addElement("defs");

        for (let key in SHAPES) {
            let symbol = document.createElementNS(SVGNS, "symbol");

            this.defs.element.appendChild(symbol);

            symbol.setAttributeNS(SVGNS, "id", "SYM" + key);

            let path = document.createElementNS(SVGNS, "path");

            symbol.appendChild(path);
            path.setAttributeNS(SVGNS, "d", SHAPES[key].path);
        }
    }

    propagateParentsUpdate() {
        if (this._update) {
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


export {ScoreContext, ScoreGroup};