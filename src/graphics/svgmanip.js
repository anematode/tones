import * as utils from "../utils.js";

let ID_INDEX = 0;

let ID_INTERNAL = new Uint32Array(1);
ID_INTERNAL[0] = 0xCF39ACE1;

function getID() {

    let lsb = ID_INTERNAL[0] & 1;
    ID_INTERNAL[0] >>= 1;
    if (lsb)
        ID_INTERNAL[0] ^= 0xD11AB400;

    return "S" + ID_INTERNAL[0];
}

const SVGNS = "http://www.w3.org/2000/svg";

class SVG {
    constructor(domElem) {
        if (typeof domElem === "string") {
            domElem = document.getElementById(domElem);
        }

        if (!domElem) {
            throw new Error("Must pass valid DOM element or id");
        }

        this.svg = domElem;
    }

    createElement(name, attribs = {}, append = false) {
        let elem = document.createElementNS(SVGNS, name);

        Object.keys(attribs).forEach((key) => {
            elem.setAttributeNS(null, key, attribs[key]);
        });

        if (append)
            this.svg.appendChild(elem);

        return new SVGElement(this.svg, elem);
    }

    addElement(name, attribs = {}) {
        return this.createElement(name, attribs, true);
    }
}

class SVGElement {
    constructor(svg, element) {
        this.svg = svg;
        this.element = element;
        this._id = getID();

        this.element.setAttributeNS(null, "_id", this._id);
    }

    set(attribute, value) {
        if (attribute instanceof Object) {
            Object.keys(attribute).forEach((key) => {
                this.element.setAttributeNS(null, key, attribute[key]);
            });
        } else {
            this.element.setAttributeNS(null, attribute, value);
        }

        return this;
    }

    get(attribute) {
        return this.element.getAttributeNS(null, attribute);
    }

    getNames() {
        return this.element.getAttributeNames();
    }

    getAll() {
        return this.element.getAttribute
    }
}

export {SVG, SVGElement, getID};