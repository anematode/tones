import * as utils from "../utils.js";

let ID_INDEX = 0;

let ID_INTERNAL = new Uint32Array(1);
ID_INTERNAL[0] = 0xCF39ACE1;

/* Linear shift register to generate unique IDs for elements */
function getID(prefix = "S") {
    let lsb = ID_INTERNAL[0] & 1;
    ID_INTERNAL[0] >>= 1;
    if (lsb)
        ID_INTERNAL[0] ^= 0xD11AB400;

    return prefix + ID_INTERNAL[0];
}

const SVGNS = "http://www.w3.org/2000/svg";

function svgClassFactory(group, class_, ...args) {
    return new class_(group, ...args);
}

// Class which allows modification of parents by setting "propagators"
class ChildUpdater {
    constructor() {
        this.propagators = {};
    }

    _setModificationPropagation(func, id) {
        this.propagators[id] = func;
    }

    _removeModificationPropagation(id) {
        delete this.propagators[id];
    }

    propagateChange(...args) {
        if (this._propagateChange)
            this._propagateChange(...args);

        Object.keys(this.propagators).forEach(key => {
            this.propagators[key](...args);
        });
    }
}

const presentationAttributes = ['alignmentBaseline', 'baselineShift', 'clip', 'clipPath', 'clipRule', 'color', 'colorInterpolation', 'colorInterpolationFilters', 'colorProfile', 'colorRendering', 'cursor', 'direction', 'display', 'dominantBaseline', 'enableBackground', 'fill', 'fillOpacity', 'fillRule', 'filter', 'floodColor', 'floodOpacity', 'fontFamily', 'fontSize', 'fontSizeAdjust', 'fontStretch', 'fontStyle', 'fontVariant', 'fontWeight', 'glyphOrientationHorizontal', 'glyphOrientationVertical', 'imageRendering', 'kerning', 'letterSpacing', 'lightingColor', 'markerEnd', 'markerMid', 'markerStart', 'mask', 'opacity', 'overflow', 'pointerEvents', 'shapeRendering', 'stopColor', 'stopOpacity', 'stroke', 'strokeDasharray', 'strokeDashoffset', 'strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'strokeOpacity', 'strokeWidth', 'textAnchor', 'textDecoration', 'textRendering', 'unicodeBidi', 'vectorEffect', 'visibility', 'wordSpacing', 'writingMode']

class SVGElement {
    constructor(parent, tag, params = {}) {
        /*
        Parameters:
        id, custom id;
        append, whether or not to append the element to the parent immediately
         */
        params.append = utils.select(params.append, true);

        if (!parent && tag instanceof Element) { // used in construction of SVGContext, which has no parent
            this.context = this;
            this.element = tag;
            Object.defineProperty(this, "parent", {
                value: null,
                writable: false
            });
        } else { // Other nodes go here
            utils.assert(parent, "parent must be passed to SVGElement constructor");

            this.context = parent.context;
            this.element = utils.isString(tag) ? parent.createRawElement(tag, {}, params.append) : tag;
            Object.defineProperty(this, "parent", {
                value: parent,
                writable: false
            });

            parent.children.push(this);
            parent.sortZIndex();
        }

        this.id = utils.select(params.id, getID()); // id of element

        this.updateID();

        this.transform = new Transformation(); // element transformations
        this.transform._setModificationPropagation(() => { // make changes to transform cause changes here
            this.updateTransform();
        }, this.id);

        this._z_index = utils.select(params.z_index, 0);
        if (params.class)
            this.set("class", params.class);

        this.setPresentationAttributes(params);
    }

    hasChildren() {
        return false;
    }

    get tag() {
        return this.element.tagName;
    }

    setPresentationAttributes(params = {}) {
        for (let key in params) {
            if (params.hasOwnProperty(key) && presentationAttributes[key]) {
                try {
                    this[key] = params[key];
                } catch (e) {

                }
            }
        }
    }

    updateID() { // update the DOM element's id
        this.checkDestroyed();
        this.element.setAttributeNS(null, "id", this.id);
    }

    updateTransform() { // update transform tag in svg
        this.checkDestroyed();
        let value = this.transform.toSVGValue();

        if (value)
            this.set("transform", value);

        return this;
    }

    applyTransform(x, y) {
        return this.transform.transform(x, y);
    }

    applyInverseTransform(x, y) {
        return this.transform.inverse(x, y);
    }

    addTransform(x) { // add simple transformation to transform
        this.checkDestroyed();

        if (Array.isArray(x)) {
            x.forEach(item => this.transform.addTransform(item));
        } else {
            this.transform.addTransform(x);
        }

        this.updateTransform();

        return this;
    }

    squishTransform() {
        this.transform.squish();

        return this;
    }

    getCTM() {
        return this.element.getCTM();
    }

    getScreenCTM() {
        return this.element.getScreenCTM();
    }

    bringToFront() {
        if (this.parent)
            this.parent.bringFront(this);
    }

    sendToBack() {
        if (this.parent)
            this.parent.sendBack(this);
    }

    get transforms() { // this element's transforms
        this.checkDestroyed();
        return this.transform.transforms;
    }

    removeTransform(t) { // remove simple transformation from transform
        this.checkDestroyed();

        if (Array.isArray(t)) {
            t.forEach(item => this.transform.removeTransform(item));
        } else {
            this.transform.removeTransform(t);
        }

        this.updateTransform();

        return this;
    }

    resetTransform() { // reset transform to none
        this.checkDestroyed();
        this.transform.removeAll();
        this.updateTransform();

        return this;
    }

    getBBox() { // get bounding box of element
        this.checkDestroyed();
        return this.element.getBBox();
    }

    /*
    Set the value of an attribute
     */
    set(attribute, value) {
        this.checkDestroyed();
        if (attribute instanceof Object) {
            Object.keys(attribute).forEach((key) => {
                let value = attribute[key];

                if (value !== undefined) {
                    this.element.setAttributeNS(null, key, attribute[key]);
                } else {
                    this.element.removeAttributeNS(null, key);
                }
            });
        } else {
            if (value !== undefined) {
                this.element.setAttributeNS(null, attribute, value);
            } else {
                this.element.removeAttributeNS(null, attribute);
            }
        }

        return this;
    }

    /*
    Remove the element, but not necessarily destroy it
     */
    _removeElementDOM() {
        this.checkDestroyed();
        this.element.remove();
        this.parent.removeChild(this);
    }

    remove() { // alias for destroy
        this.destroy();
    }

    /*
    get the value of an attribute, null if nonexistent
     */
    get(attribute) {
        this.checkDestroyed();
        return this.element.getAttributeNS(null, attribute);
    }

    /*
    get attribute keys
     */
    getAttribs() {
        this.checkDestroyed();
        return this.element.getAttributeNames();
    }

    /*
    Check if the element has a certain attribute
     */
    has(attribute) {
        this.checkDestroyed();
        return !!this.element.getAttributeNS(null, attribute);
    }

    /*
    Utility function to highlight an element
     */
    highlight() { // TODO fix for changing getBBox, no class highlight
        this.checkDestroyed();

        if (!this._highlight_box) {
            this._highlight_box = new TONES.Rectangle(this.parent, this.getBBox());
            this._highlight_box.fill = "#ff5";
            this._highlight_box.opacity = 0.3;
        }

        return this;
    }

    /*
    Utility function to unhighlight an element
     */
    unhighlight() {
        this.checkDestroyed();

        if (this._highlight_box) {
            this._highlight_box.destroy();
            this._highlight_box = undefined;
        }

        return this;
    }

    /*
    Get dictionary of attributes
     */
    getAll() {
        this.checkDestroyed();
        let names = this.getAttribs();
        let attribs = {};

        for (let i = 0; i < names.length; i++) {
            attribs[names[i]] = this.get(names[i]);
        }

        return attribs;
    }

    /*
    Destroy the element, making it unusable
     */
    destroy() {
        this.checkDestroyed();
        this._removeElementDOM();
        this.destroyChildDefs();

        this.id = -1;
    }

    /*
    Is the element destroyed
     */
    get destroyed() {
        return this.id === -1;
    }

    /*
    Throw an error if the element is destroyed
     */
    checkDestroyed() {
        if (this.destroyed)
            throw new Error("This element is destroyed and can no longer be used");
    }

    /*
    Add an event listener to the element
     */
    addEventListener(...args) {
        this.checkDestroyed();
        return this.element.addEventListener(...args);
    }

    /*
    Remove an event listener to the element
     */
    removeEventListener(...args) {
        this.checkDestroyed();
        return this.element.removeEventListener(...args);
    }

    /*
    get class names as array or as string
     */
    getClasses(asArray = true) {
        return asArray ? [...this.element.classList.values()] : this.element.classList.value;
    }

    /*
    add a class to the element
     */
    addClass(x) {
        this.checkDestroyed();

        if (!Array.isArray(x))
            x = [x];

        x.forEach(item => this.element.classList.add(item));

        return this;
    }

    /*
    Check whether the element has a class
     */
    hasClass(x) {
        return this.element.classList.contains(x);
    }

    /*
    remove a class or array of classes from the element
     */
    removeClass(x) {
        this.checkDestroyed();

        if (!Array.isArray(x))
            x = [x];

        x.forEach(item => this.element.classList.remove(item));

        return this;
    }

    /*
    Hide the element with display = none
     */
    hide() {
        this.checkDestroyed();

        this.display = "";
    }

    /*
    Show the element
    */
    show() {
        this.checkDestroyed();

        this.display = "none";
    }

    /*
    Add a child definition to the whole svg's <defs> tag for use
     */
    addChildDef(tag, attribs = {}) {
        this.checkDestroyed();

        let defs = this.context.definitions;

        let elem = defs.addGroup(tag, attribs);

        if (this.child_defs === undefined)
            this.child_defs = [];

        this.child_defs.push(elem);

        return elem;
    }

    /*
    destroy a child def by id
     */
    destroyChildDef(id) {
        this.checkDestroyed();

        this.child_defs.forEach(x => {
            let eid = x.id;

            if (id === eid)
                x.destroy();
        })
    }

    /*
    destroy all child defs
     */
    destroyChildDefs() {
        this.checkDestroyed();

        if (this.child_defs) {
            this.child_defs.forEach(x => {
                try {
                    x.destroy()
                } catch (e) {

                }
            });
        }
    }

    clientRect() {
        return this.element.getBoundingClientRect();
    }

    get z_index() {
        return this._z_index;
    }

    set z_index(value) {
        this._z_index = value;

        this.parent.sortZIndex();
    }

    get style() {
        return this.element.style;
    }

    get alignmentBaseline() {
        return this.get("alignment-baseline");
    }

    set alignmentBaseline(value) {
        this.set("alignment-baseline", value);
    }

    get baselineShift() {
        return this.get("baseline-shift");
    }

    set baselineShift(value) {
        this.set("baseline-shift", value);
    }

    get clip() {
        return this.get("clip");
    }

    set clip(value) {
        this.set("clip", value);
    }

    get clipPath() {
        return this.get("clip-path");
    }

    set clipPath(value) {
        this.set("clip-path", value);
    }

    get clipRule() {
        return this.get("clip-rule");
    }

    set clipRule(value) {
        this.set("clip-rule", value);
    }

    get color() {
        return this.get("color");
    }

    set color(value) {
        this.set("color", value);
    }

    get colorInterpolation() {
        return this.get("color-interpolation");
    }

    set colorInterpolation(value) {
        this.set("color-interpolation", value);
    }

    get colorInterpolationFilters() {
        return this.get("color-interpolation-filters");
    }

    set colorInterpolationFilters(value) {
        this.set("color-interpolation-filters", value);
    }

    get colorProfile() {
        return this.get("color-profile");
    }

    set colorProfile(value) {
        this.set("color-profile", value);
    }

    get colorRendering() {
        return this.get("color-rendering");
    }

    set colorRendering(value) {
        this.set("color-rendering", value);
    }

    get cursor() {
        return this.get("cursor");
    }

    set cursor(value) {
        this.set("cursor", value);
    }

    get direction() {
        return this.get("direction");
    }

    set direction(value) {
        this.set("direction", value);
    }

    get display() {
        return this.get("display");
    }

    set display(value) {
        this.set("display", value);
    }

    get dominantBaseline() {
        return this.get("dominant-baseline");
    }

    set dominantBaseline(value) {
        this.set("dominant-baseline", value);
    }

    get enableBackground() {
        return this.get("enable-background");
    }

    set enableBackground(value) {
        this.set("enable-background", value);
    }

    get fill() {
        return this.get("fill");
    }

    set fill(value) {
        this.set("fill", value);
    }

    get fillOpacity() {
        return this.get("fill-opacity");
    }

    set fillOpacity(value) {
        this.set("fill-opacity", value);
    }

    get fillRule() {
        return this.get("fill-rule");
    }

    set fillRule(value) {
        this.set("fill-rule", value);
    }

    get filter() {
        return this.get("filter");
    }

    set filter(value) {
        this.set("filter", value);
    }

    get floodColor() {
        return this.get("flood-color");
    }

    set floodColor(value) {
        this.set("flood-color", value);
    }

    get floodOpacity() {
        return this.get("flood-opacity");
    }

    set floodOpacity(value) {
        this.set("flood-opacity", value);
    }

    get fontFamily() {
        return this.get("font-family");
    }

    set fontFamily(value) {
        this.set("font-family", value);
    }

    get fontSize() {
        return this.get("font-size");
    }

    set fontSize(value) {
        this.set("font-size", value);
    }

    get fontSizeAdjust() {
        return this.get("font-size-adjust");
    }

    set fontSizeAdjust(value) {
        this.set("font-size-adjust", value);
    }

    get fontStretch() {
        return this.get("font-stretch");
    }

    set fontStretch(value) {
        this.set("font-stretch", value);
    }

    get fontStyle() {
        return this.get("font-style");
    }

    set fontStyle(value) {
        this.set("font-style", value);
    }

    get fontVariant() {
        return this.get("font-variant");
    }

    set fontVariant(value) {
        this.set("font-variant", value);
    }

    get fontWeight() {
        return this.get("font-weight");
    }

    set fontWeight(value) {
        this.set("font-weight", value);
    }

    get glyphOrientationHorizontal() {
        return this.get("glyph-orientation-horizontal");
    }

    set glyphOrientationHorizontal(value) {
        this.set("glyph-orientation-horizontal", value);
    }

    get glyphOrientationVertical() {
        return this.get("glyph-orientation-vertical");
    }

    set glyphOrientationVertical(value) {
        this.set("glyph-orientation-vertical", value);
    }

    get imageRendering() {
        return this.get("image-rendering");
    }

    set imageRendering(value) {
        this.set("image-rendering", value);
    }

    get kerning() {
        return this.get("kerning");
    }

    set kerning(value) {
        this.set("kerning", value);
    }

    get letterSpacing() {
        return this.get("letter-spacing");
    }

    set letterSpacing(value) {
        this.set("letter-spacing", value);
    }

    get lightingColor() {
        return this.get("lighting-color");
    }

    set lightingColor(value) {
        this.set("lighting-color", value);
    }

    get markerEnd() {
        return this.get("marker-end");
    }

    set markerEnd(value) {
        this.set("marker-end", value);
    }

    get markerMid() {
        return this.get("marker-mid");
    }

    set markerMid(value) {
        this.set("marker-mid", value);
    }

    get markerStart() {
        return this.get("marker-start");
    }

    set markerStart(value) {
        this.set("marker-start", value);
    }

    get mask() {
        return this.get("mask");
    }

    set mask(value) {
        this.set("mask", value);
    }

    get opacity() {
        return this.get("opacity");
    }

    set opacity(value) {
        this.set("opacity", value);
    }

    get overflow() {
        return this.get("overflow");
    }

    set overflow(value) {
        this.set("overflow", value);
    }

    get pointerEvents() {
        return this.get("pointer-events");
    }

    set pointerEvents(value) {
        this.set("pointer-events", value);
    }

    get shapeRendering() {
        return this.get("shape-rendering");
    }

    set shapeRendering(value) {
        this.set("shape-rendering", value);
    }

    get stopColor() {
        return this.get("stop-color");
    }

    set stopColor(value) {
        this.set("stop-color", value);
    }

    get stopOpacity() {
        return this.get("stop-opacity");
    }

    set stopOpacity(value) {
        this.set("stop-opacity", value);
    }

    get stroke() {
        return this.get("stroke");
    }

    set stroke(value) {
        this.set("stroke", value);
    }

    get strokeDasharray() {
        return this.get("stroke-dasharray");
    }

    set strokeDasharray(value) {
        this.set("stroke-dasharray", value);
    }

    get strokeDashoffset() {
        return this.get("stroke-dashoffset");
    }

    set strokeDashoffset(value) {
        this.set("stroke-dashoffset", value);
    }

    get strokeLinecap() {
        return this.get("stroke-linecap");
    }

    set strokeLinecap(value) {
        this.set("stroke-linecap", value);
    }

    get strokeLinejoin() {
        return this.get("stroke-linejoin");
    }

    set strokeLinejoin(value) {
        this.set("stroke-linejoin", value);
    }

    get strokeMiterlimit() {
        return this.get("stroke-miterlimit");
    }

    set strokeMiterlimit(value) {
        this.set("stroke-miterlimit", value);
    }

    get strokeOpacity() {
        return this.get("stroke-opacity");
    }

    set strokeOpacity(value) {
        this.set("stroke-opacity", value);
    }

    get strokeWidth() {
        return this.get("stroke-width");
    }

    set strokeWidth(value) {
        this.set("stroke-width", value);
    }

    get textAnchor() {
        return this.get("text-anchor");
    }

    set textAnchor(value) {
        this.set("text-anchor", value);
    }

    get textDecoration() {
        return this.get("text-decoration");
    }

    set textDecoration(value) {
        this.set("text-decoration", value);
    }

    get textRendering() {
        return this.get("text-rendering");
    }

    set textRendering(value) {
        this.set("text-rendering", value);
    }

    get unicodeBidi() {
        return this.get("unicode-bidi");
    }

    set unicodeBidi(value) {
        this.set("unicode-bidi", value);
    }

    get vectorEffect() {
        return this.get("vector-effect");
    }

    set vectorEffect(value) {
        this.set("vector-effect", value);
    }

    get visibility() {
        return this.get("visibility");
    }

    set visibility(value) {
        this.set("visibility", value);
    }

    get wordSpacing() {
        return this.get("word-spacing");
    }

    set wordSpacing(value) {
        this.set("word-spacing", value);
    }

    get writingMode() {
        return this.get("writing-mode");
    }

    set writingMode(value) {
        this.set("writing-mode", value);
    }

    get id_num() {
        return parseInt(this.id.slice(1));
    }
}

// https://stackoverflow.com/questions/10716986/swap-2-html-elements-and-preserve-event-listeners-on-them?lq=1

function swapElements(obj1, obj2) {
    // save the location of obj2
    let parent2 = obj2.parentNode;
    let next2 = obj2.nextSibling;
    // special case for obj1 is the next sibling of obj2
    if (next2 === obj1) {
        // just put obj1 before obj2
        parent2.insertBefore(obj1, obj2);
    } else {
        // insert obj2 right before obj1
        obj1.parentNode.insertBefore(obj2, obj1);

        // now insert obj1 where obj2 was
        if (next2) {
            // if there was an element after obj2, then insert obj1 right before that
            parent2.insertBefore(obj1, next2);
        } else {
            // otherwise, just append as last child
            parent2.appendChild(obj1);
        }
    }
}

// https://stackoverflow.com/questions/31807168/check-if-array-is-in-monotonic-sequence
function isIncreasing(array) {
    return array.every(function (e, i, a) {
        if (i) return e >= a[i - 1]; else return true;
    });
}

class SVGGroup extends SVGElement {
    constructor(parent, tag = 'g', params = {}) {
        super(parent, tag, params);

        this.children = [];
        this.use_zindex = utils.select(params.use_zindex, parent ? parent.use_zindex : undefined, true);
    }

    /*
    Traverse group's nodes recursively
     */
    traverseNodes(func, recursive = true, onlyLeaf = false, evalBefore = true) {
        this.checkDestroyed();
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (evalBefore && (!onlyLeaf || !child.hasChildren()))
                func(child, i);
            if (recursive && child.traverseNodes)
                child.traverseNodes(func, evalBefore);
            if (!evalBefore && (!onlyLeaf || !child.hasChildren()))
                func(child, i);
        }
    }

    /*
    create a child element of this group, returning a SVGElement
     */
    createElement(name, attribs = {}, append = false, namespace = SVGNS) {
        this.checkDestroyed();

        let elem = this.createRawElement(name, attribs, append, namespace);

        let svgElement = new SVGElement(this, elem);

        if (append)
            this.sortZIndex();

        return svgElement;
    }

    hasChildren() {
        return !!this.children.length;
    }

    /*
    create a raw child element of this group, returning the DOM element
     */
    createRawElement(name, attribs = {}, append = false, namespace = SVGNS) {
        this.checkDestroyed();

        let elem = document.createElementNS(namespace, name);

        Object.keys(attribs).forEach((key) => {
            elem.setAttributeNS(null, key, attribs[key]);
        });

        if (append)
            this._addDOMElement(elem);

        return elem;
    }

    _addDOMElement(elem) {
        this.element.appendChild(elem);
    }

    addElement(name, attribs = {}, namespace = SVGNS) {
        this.checkDestroyed();

        return this.createElement(name, attribs, true, namespace);
    }

    createGroup(tag = 'g', attribs = {}, append = false, namespace = SVGNS) {
        this.checkDestroyed();

        let elem = document.createElementNS(namespace, tag);

        Object.keys(attribs).forEach((key) => {
            elem.setAttributeNS(null, key, attribs[key]);
        });

        if (append)
            this.element.appendChild(elem);

        let svgElement = new SVGGroup(this, elem);

        if (append)
            this.sortZIndex();

        return svgElement;
    }

    addGroup(tag = 'g', attribs = {}, namespace = SVGNS) {
        this.checkDestroyed();

        return this.createGroup(tag, attribs, true, namespace);
    }

    destroyElement(...args) {
        this.removeElement(...args);
    }

    removeElement(elem, recursive = false) {
        this.checkDestroyed();

        let id;
        if (elem instanceof SVGElement) {
            id = elem.id;
        } else {
            id = elem;
        }

        return this.removeIf(e => e.id === id);
    }

    destroyChild(...args) {
        this.removeChild(...args);
    }

    removeChild(elem, recursive = false) {
        this.checkDestroyed();

        let id;
        if (elem instanceof SVGElement) {
            id = elem.id;
        } else {
            id = elem;
        }

        let count = 0;

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (recursive && child.removeChild) {
                let res = child.removeChild(id, recursive);
                count += res;
            }

            if (child.id === id) {
                this.children.splice(i--, 1);
                count += 1;
            }
        }

        return count;
    }

    removeIf(func, recursive = false) {
        this.checkDestroyed();

        let count = 0;

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (recursive && child.removeIf) {
                let res = child.removeIf(func, recursive);
                count += res;
            }

            if (func(child)) {
                child.destroy();
                i--;

                count += 1;
            }
        }

        if (count > 0)
            this.sortZIndex();

        return count;
    }

    removeAll() {
        this.removeIf(() => true);
    }

    destroyIf(...args) {
        this.removeIf(...args);
    }

    destroy() {
        this.checkDestroyed();
        if (this._destroy)
            this._destroy();

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
        }

        this._removeElementDOM();
        this.destroyChildDefs();

        this.id = -1;
    }

    select(func, recursive = false) {
        this.checkDestroyed();

        let ret = [];

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (recursive && child.select) {
                let res = child.select(func, recursive);
                ret.push(...res);
            }

            if (func(child)) {
                ret.push(child);
            }
        }

        return ret;
    }

    getChild(child, recursive = false) {
        this.checkDestroyed();

        let id;
        if (child.id) {
            id = child.id;
        } else {
            id = child;
        }

        let found = this.select((x) => x.id === id, recursive);

        if (found.length === 0)
            return null;

        return found[0];
    }

    isChild(child, recursive = true) {
        this.checkDestroyed();

        if (child.id && recursive) {
            return this.element.contains(child.element) && this.element !== child.element;
        } else {
            return !!this.getChild(child, recursive);
        }
    }

    getIndex(child) {
        this.checkDestroyed();

        let id;
        if (child.id) {
            id = child.id;
        } else {
            id = child;
        }

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (child.id === id)
                return i;
        }

        return -1;
    }

    child(index) {
        this.checkDestroyed();
        utils.assert(index < this.children.length && index >= 0, `Index ${index} out of range [0, ${this.children.length})`);
        return this.children[index];
    }

    swapIndices(i1, i2) {
        this.checkDestroyed();

        utils.assert(i1 < this.children.length && i1 >= 0, `Index ${i1} out of range [0, ${this.children.length})`);
        utils.assert(i2 < this.children.length && i2 >= 0, `Index ${i2} out of range [0, ${this.children.length})`);

        let c1 = this.children[i1];
        let c2 = this.children[i2];

        swapElements(c1.element, c2.element);

        this.children[i1] = c2;
        this.children[i2] = c1;

        this.sortZIndex();
    }

    swap(c1, c2) {
        this.checkDestroyed();

        if (!utils.isNumeric(c1)) {
            c1 = this.getIndex(c1);
            utils.assert(c1 !== -1, `c1 is not a child of this`);
        }

        if (!utils.isNumeric(c2)) {
            c2 = this.getIndex(c2);
            utils.assert(c2 !== -1, `c2 is not a child of this`);
        }

        this.swapIndices(c1, c2);
        this.sortZIndex();
    }

    moveIndexToAfter(i1, i2) {
        this.checkDestroyed();

        if (i1 === i2)
            return;

        utils.assert(i1 < this.children.length && i1 >= 0, `Index ${i1} out of range [0, ${this.children.length})`);
        utils.assert(i2 < this.children.length && i2 >= 0, `Index ${i2} out of range [0, ${this.children.length})`);

        let before_child = this.children[i2];
        let child = this.children[i1];

        this.children.splice(i1, 1);
        let before_index = this.getIndex(before_child);

        this.children.splice(before_index + 1, 0, child);

        child.element.remove();
        this.element.insertBefore(child.element, before_child.element.nextSibling);

        this.sortZIndex();
    }

    sortZIndex() {
        this.checkDestroyed();

        if (this.use_zindex) {
            let children = this.children;
            let prev = -Infinity;

            for (let i = 0; i < children.length; i++) {
                let child = children[i];

                if (prev > child._z_index) {
                    this.sort((x, y) => (x._z_index - y._z_index));

                    return;
                }

                prev = child._z_index;
            }
        }
    }

    moveAfter(c1, c2) {
        this.checkDestroyed();

        if (!utils.isNumeric(c1)) {
            c1 = this.getIndex(c1);
            utils.assert(c1 !== -1, `c1 is not a child of this`);
        }

        if (!utils.isNumeric(c2)) {
            c2 = this.getIndex(c2);
            utils.assert(c2 !== -1, `c2 is not a child of this`);
        }

        this.moveIndexToAfter(c1, c2);
    }

    moveIndexToBefore(i1, i2) {
        this.checkDestroyed();

        if (i1 === i2)
            return;

        utils.assert(i1 < this.children.length && i1 >= 0, `Index ${i1} out of range [0, ${this.children.length})`);
        utils.assert(i2 < this.children.length && i2 >= 0, `Index ${i2} out of range [0, ${this.children.length})`);

        let before_child = this.children[i2];
        let child = this.children[i1];

        this.children.splice(i1, 1);
        let before_index = this.getIndex(before_child);

        this.children.splice(before_index, 0, child);

        child.element.remove();
        this.element.insertBefore(child.element, before_child.element);

        this.sortZIndex();
    }

    moveBefore(c1, c2) {
        this.checkDestroyed();

        if (!utils.isNumeric(c1)) {
            c1 = this.getIndex(c1);
            utils.assert(c1 !== -1, `c1 is not a child of this`);
        }

        if (!utils.isNumeric(c2)) {
            c2 = this.getIndex(c2);
            utils.assert(c2 !== -1, `c2 is not a child of this`);
        }

        this.moveIndexToBefore(c1, c2);
    }

    updateElementOrder() {
        this.checkDestroyed();

        this.children.forEach(child => {
            child.element.remove();
            child.parent.element.appendChild(child.element);
        });
    }

    bringIndexToFront(i1) {
        this.checkDestroyed();
        this.moveIndexToAfter(i1, this.children.length - 1);
    }

    bringFront(c1) {
        this.checkDestroyed();
        this.moveAfter(c1, this.children.length - 1);
    }

    sendIndexToBack(i1) {
        this.checkDestroyed();
        this.moveIndexToBefore(i1, 0);
    }

    sendBack(c1) {
        this.checkDestroyed();
        this.moveBefore(c1, 0);
    }

    sort(func) {
        this.checkDestroyed();
        if (!func)
            func = () => 0;

        this.children.sort(func);
        this.updateElementOrder();
    }
}

class SVGContext extends SVGGroup {
    constructor(domElem, params = {}) {
        if (typeof domElem === "string") {
            domElem = document.getElementById(domElem);
        }

        if (!domElem)
            throw new Error("Must pass valid DOM element or id");

        if (domElem.tagName !== "svg")
            throw new Error("passed DOM element is not an SVG");

        super(null, domElem, params);

        this.context = this;

        this.children = [];
        this.id = getID();

        this.element.setAttributeNS(null, "id", this.id);

        this.definitions = this.addGroup("defs");
        this.definitions._z_index = -Infinity; // defs should come first
    }

    get width() {
        this.checkDestroyed();
        return this.clientRect().width;
    }

    get height() {
        this.checkDestroyed();
        return this.clientRect().height;
    }

    set width(value) {
        this.checkDestroyed();
        this.element.setAttributeNS(SVGNS, "width", value);
    }

    set height(value) {
        this.checkDestroyed();
        this.element.setAttributeNS(SVGNS, "height", value);
    }
}

class TMatrix {
    constructor(arr, b, c, d, e, f) {
        if (Array.isArray(arr) || (arr && arr.BYTES_PER_ELEMENT && arr.buffer instanceof ArrayBuffer)) { // arr is an array
            this.data = new Float32Array(6);

            for (let i = 0; i < Math.min(6, arr.length); i++) {
                this.data[i] = arr[i];
            }
        } else if (arr && arr.a) {
            this.data = new Float32Array([arr.a, arr.b, arr.c, arr.d, arr.e, arr.f]);

            for (let i = 0; i < 6; i++) {
                if (isNaN(this.data[i]))
                    this.data[i] = 0;
            }
        } else if (!arr) {
            this.data = new Float32Array([1, 0, 0, 1, 0, 0]);
        } else {
            this.data = new Float32Array([arr, b, c, d, e, f]);

            for (let i = 0; i < 6; i++) {
                if (isNaN(this.data[i]))
                    this.data[i] = 0;
            }
        }
    }

    get a() {
        return this.data[0];
    }

    set a(value) {
        this.data[0] = value;
    }

    get b() {
        return this.data[1];
    }

    set b(value) {
        this.data[1] = value;
    }

    get c() {
        return this.data[2];
    }

    set c(value) {
        this.data[2] = value;
    }

    get d() {
        return this.data[3];
    }

    set d(value) {
        this.data[3] = value;
    }

    get e() {
        return this.data[4];
    }

    set e(value) {
        this.data[4] = value;
    }

    get f() {
        return this.data[5];
    }

    set f(value) {
        this.data[5] = value;
    }

    clone() {
        return new TMatrix(this.data);
    }

    static identity() {
        return new TMatrix(1, 0, 0, 1, 0, 0);
    }

    setIdentity() {
        this.data[0] = 1;
        this.data[1] = 0;
        this.data[2] = 0;
        this.data[3] = 1;
        this.data[4] = 0;
        this.data[5] = 0;
    }

    multiply(matrix) {
        let m2 = ((matrix instanceof TMatrix) ? matrix : new TMatrix(...arguments)).data;

        this.multiplyMatrix(m2);
    }

    multiplyMatrix(matrix) {
        let m1 = this.data;
        let m2 = matrix.data;

        let a = m1[0] * m2[0] + m1[2] * m2[1],
            b = m1[1] * m2[0] + m1[3] * m2[1],
            c = m1[0] * m2[2] + m1[2] * m2[3],
            d = m1[1] * m2[2] + m1[3] * m2[3];

        m1[4] = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
        m1[5] = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];

        m1[0] = a, m1[1] = b, m1[2] = c, m1[3] = d;

        return this;
    }

    inverse() {
        let det = this.determinant();

        let m = this.data;

        return new TMatrix(
            m[3] / det, // a = d
            -m[1] / det, // b = -b
            -m[2] / det, // c = -c
            m[0] / det, // d = a
            (m[2] * m[5] - m[3] * m[4]) / det, // e = cf - de
            (m[1] * m[4] - m[0] * m[5]) / det // f = be - af
        );
    }

    toSVGValue() {
        return `matrix(${this.data.join(' ')})`;
    }

    transform(x, y) {
        if (Array.isArray(x)) {
            y = x[1];
            x = x[0];
        }

        return [this.a * x + this.c * y + this.e, this.b * x + this.d * y + this.f];
    }

    determinant() {
        return this.a * this.d - this.b * this.c;
    }
}

class SimpleTransformation extends ChildUpdater {
    constructor() {
        super();

        this.matrix = new TMatrix();
    }

    transform(x, y) {
        return this.matrix.transform(x, y);
    }

    inverse(x, y) {
        return this.matrix.inverse(x, y);
    }
}

class Transformation extends ChildUpdater {
    constructor(transforms = []) {
        super();

        this.transforms = transforms;
        this.matrix = new TMatrix();
        this.id = getID("T");
    }

    transform(x, y) {
        if (Array.isArray(x)) {
            y = x[1];
            x = x[0];
        }

        return this.matrix.transform(x, y);
    }

    inverse(x, y, cacheInverseMatrix = false) {
        if (Array.isArray(x)) {
            y = x[1];
            x = x[0];
        }

        let inverse_matrix;

        if (cacheInverseMatrix && !this.inverse_matrix) {
            inverse_matrix = this.inverse_matrix = this.matrix.inverse();
        } else {
            inverse_matrix = this.inverse_matrix ? this.inverse_matrix : this.matrix.inverse();
        }

        return (x === undefined) ? inverse_matrix : inverse_matrix.transform(x, y);
    }

    squish() {
        let matrix = this.matrix.clone();
        this.removeAll();

        this.transforms = [new MatrixTransform(matrix)];
        this._update();
    }

    updateMatrix() {
        let matrix = this.matrix;
        matrix.setIdentity();

        for (let i = this.transforms.length - 1; i >= 0; i--) {
            matrix.multiplyMatrix(this.transforms[i].matrix);
        }

        if (this.inverse_matrix)
            this.inverse_matrix = undefined; // Invalidate cached inverse matrix
    }

    toSVGValue() {
        return this.matrix.toSVGValue();
    }

    _update() {
        this.updateMatrix();
        this.propagateChange();
    }

    addTransform(t) {
        this.transforms.push(t);
        this._update();

        t._setModificationPropagation(() => {
            this._update();
        }, this.id);
    }

    add(t) {
        this.addTransform(t);
    }

    prependTransform(t) {
        this.transforms.unshift(t);
        this._update();

        t._setModificationPropagation(() => {
            this._update();
        }, this.id);
    }

    prepend(t) {
        this.prependTransform(t);
    }

    removeTransform(elem) {
        let id;
        if (elem instanceof SimpleTransformation) {
            id = elem.id;
        } else {
            id = elem;
        }

        this.removeIf(e => e.id === id);
        this.propagateChange();
    }

    remove(t) {
        this.removeTransform(t);
    }

    removeIf(func) {
        let count = 0;

        for (let i = 0; i < this.transforms.length; i++) {
            if (func(this.transforms[i])) {
                this.transforms[i]._removeModificationPropagation(this.id);
                this.transforms.splice(i--, 1);
                count += 1;
            }
        }

        if (count > 0)
            this._update();
    }

    removeAll() {
        this.removeIf(() => true);
    }
}

class Translation extends SimpleTransformation {
    constructor(xd = 0, yd = 0) {
        super();

        this.x = xd;
        this.y = yd;

        this.id = getID("T");
    }

    get x() {
        return this.matrix.e;
    }

    get y() {
        return this.matrix.f;
    }

    set x(value) {
        this.matrix.e = value;
        this.propagateChange();
    }

    set y(value) {
        this.matrix.f = value;
        this.propagateChange();
    }

    toSVGValue() {
        return `translate(${this.x}, ${this.y})`;
    }
}

class MatrixTransform extends SimpleTransformation {
    constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
        super();

        if (a.a) {
            b = a.b;
            c = a.c;
            d = a.d;
            e = a.e;
            f = a.f;
            a = a.a;
        } else if (Array.isArray(a)) {
            b = a[1];
            c = a[2];
            d = a[3];
            e = a[4];
            f = a[5];
            a = a[0];
        }

        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
    }

    get a() {
        return this.matrix.a;
    }

    set a(value) {
        this.matrix.a = value;
        this.propagateChange();
    }

    get b() {
        return this.matrix.b;
    }

    set b(value) {
        this.matrix.b = value;
        this.propagateChange();
    }

    get c() {
        return this.matrix.c;
    }

    set c(value) {
        this.matrix.c = value;
        this.propagateChange();
    }

    get d() {
        return this.matrix.d;
    }

    set d(value) {
        this.matrix.d = value;
        this.propagateChange();
    }

    get e() {
        return this.matrix.e;
    }

    set e(value) {
        this.matrix.e = value;
        this.propagateChange();
    }

    get f() {
        return this.matrix.f;
    }

    set f(value) {
        this.matrix.f = value;
        this.propagateChange();
    }

    toSVGValue() {
        return `matrix(${this.a} ${this.b} ${this.c} ${this.d} ${this.e} ${this.f})`;
    }
}

class SkewX extends SimpleTransformation {
    constructor(a) {
        super();

        this.a = a;
    }

    get a() {
        return this.matrix.c;
    }

    set a(value) {
        this.matrix.c = value;
        this.propagateChange();
    }

    toSVGValue() {
        return `skewX(${this.a})`;
    }
}

class SkewY extends SimpleTransformation {
    constructor(a) {
        super();

        this.a = a;
    }

    get a() {
        return this.matrix.b;
    }

    set a(value) {
        this.matrix.b = value;
        this.propagateChange();
    }

    toSVGValue() {
        return `skewY(${this.a})`;
    }
}

class ScaleTransform extends SimpleTransformation {
    constructor(xs = 1, ys = xs) {
        super();

        this.xs = xs;
        this.ys = ys;
    }

    get xs() {
        return this.matrix.a;
    }

    get ys() {
        return this.matrix.d;
    }

    set xs(value) {
        this.matrix.a = value;

        this.propagateChange();
    }

    set ys(value) {
        this.matrix.d = value;

        this.propagateChange();
    }

    toSVGValue() {
        return `scale(${this.xs} ${this.ys})`;
    }
}

class Rotation extends SimpleTransformation {
    constructor(a = 0, x = 0, y = 0) {
        super();

        this._a = a;
        this._x = x;
        this._y = y;

        this.updateMatrix();
    }

    updateMatrix() {
        let angle = this._a * Math.PI / 180;

        let s = Math.sin(angle), c = Math.cos(angle), x = this._x, y = this._y;

        this.matrix.a = c;
        this.matrix.b = s;
        this.matrix.c = -s;
        this.matrix.d = c;
        this.matrix.e = x - x * c + y * s;
        this.matrix.f = y - y * c - x * s;
    }

    get a() {
        return this._a;
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    set a(value) {
        this._a = value;

        this.updateMatrix();
        this.propagateChange();
    }

    set x(value) {
        this._x = value;

        this.updateMatrix();
        this.propagateChange();
    }

    set y(value) {
        this._y = value;

        this.updateMatrix();
        this.propagateChange();
    }

    toSVGValue() {
        return `rotate(${this.a} ${this.x} ${this.y})`;
    }
}

class Circle extends SVGElement {
    constructor(parent, params = {}) {
        super(parent, 'circle', params);

        this._cx = utils.select(params.cx, 0);
        this._cy = utils.select(params.cy, 0);
        this._r = utils.select(params.r, 0);

        this.updateSVG();
    }

    get cx() {
        return this._cx;
    }

    get cy() {
        return this._cy;
    }

    get r() {
        return this._r;
    }

    set cx(value) {
        this._cx = value;
        this.set("cx", this._cx);
    }

    set cy(value) {
        this._cy = value;
        this.set("cy", this._cy);
    }

    set r(value) {
        this._r = value;
        this.set("r", this._r);
    }

    area() {
        return Math.PI * this.r * this.r;
    }

    circumference() {
        return 2 * Math.PI * this.r;
    }

    diameter() {
        return this.r * Math.PI;
    }

    updateSVG() {
        this.set("cx", this.cx);
        this.set("cy", this.cy);
        this.set("r", this.r);
    }
}

class Rectangle extends SVGElement {
    constructor(parent, params = {}) {
        super(parent, 'rect', params);

        this._width = utils.select(params.width, 100);
        this._height = utils.select(params.height, 100);
        this._x = utils.select(params.x, 0);
        this._y = utils.select(params.y, 0);
        this._rx = utils.select(params.rx, 0);
        this._ry = utils.select(params.ry, 0);

        this.updateSVG();
    }

    updateSVG() {
        this.set('width', this.width);
        this.set('height', this.height);
        this.set('x', this.x);
        this.set('y', this.y);
        this.set('rx', this.rx);
        this.set('ry', this.ry);
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
        this.set("width", this._width);
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = value;
        this.set("height", this._height);
    }

    get x() {
        return this._x;
    }

    set x(value) {
        this._x = value;
        this.set("x", this._x);
    }

    get y() {
        return this._y;
    }

    set y(value) {
        this._y = value;
        this.set("y", this._y);
    }

    get rx() {
        return this._rx;
    }

    set rx(value) {
        this._rx = value;
        this.set("rx", this._rx);
    }

    get ry() {
        return this._ry;
    }

    set ry(value) {
        this._ry = value;
        this.set("ry", this._ry);
    }

    static tag() {
        return "rect";
    }
}

class Ellipse extends SVGElement {
    constructor(parent, params = {}) {
        super(parent, 'ellipse', params);

        this._cx = utils.select(params.cx, 0);
        this._cy = utils.select(params.cy, 0);
        this._rx = utils.select(params.rx, 0);
        this._ry = utils.select(params.ry, 0);

        this.updateSVG();
    }

    updateSVG() {
        this.set('cx', this.cx);
        this.set('cy', this.cy);
        this.set('rx', this.rx);
        this.set('ry', this.ry);
    }

    get cx() {
        return this._cx;
    }

    set cx(value) {
        this._cx = value;
        this.updateSVG();
    }

    get cy() {
        return this._cy;
    }

    set cy(value) {
        this._cy = value;
        this.updateSVG();
    }

    get rx() {
        return this._rx;
    }

    set rx(value) {
        this._rx = value;
        this.updateSVG();
    }

    get ry() {
        return this._ry;
    }

    set ry(value) {
        this._ry = value;
        this.updateSVG();
    }

    static tag() {
        return "ellipse";
    }
}

class Text extends SVGElement {
    constructor(parent, params = {}) {
        super(parent, 'text', params);

        this._text = utils.select(params.text, "lorem ipsum");
        this._x = utils.select(params.x, 0);
        this._y = utils.select(params.y, 0);
        this._dx = utils.select(params.dx, 0);
        this._dy = utils.select(params.dy, 0);

        this.updateSVG();
    }

    updateSVG() {
        this.set('x', this.x);
        this.set('y', this.y);
        this.set('dx', this.dx);
        this.set('dy', this.dy);
        this.element.textContent = this._text;
    }

    get x() {
        return this._x;
    }

    set x(value) {
        this._x = value;
        this.updateSVG();
    }

    get y() {
        return this._y;
    }

    set y(value) {
        this._y = value;
        this.updateSVG();
    }

    get dx() {
        return this._dx;
    }

    set dx(value) {
        this._dx = value;
        this.updateSVG();
    }

    get dy() {
        return this._dy;
    }

    set dy(value) {
        this._dy = value;
        this.updateSVG();
    }

    get text() {
        return this._text;
    }

    set text(value) {
        this._text = value;
        this.updateSVG();
    }

    static tag() {
        return "text";
    }
}

class Path extends SVGElement {
    constructor(parent, params = {}) {
        super(parent, 'path', utils.isString(params) ? {} : params);

        if (utils.isString(params)) {
            this._d = utils.select(params, "");
        } else {
            this._d = this._d = utils.select(params.d, "");
        }

        this.updateSVG();
    }

    updateSVG() {
        this.set("d", this._d);
    }

    get d() {
        return this._d;
    }

    set d(value) {
        this._d = value;
        this.updateSVG();
    }

    static tag() {
        return "path";
    }
}

class Line extends SVGElement {
    constructor(parent, params = {}) {
        super(parent, 'line', params);

        this.x1 = utils.select(params.x1, 0);
        this.x2 = utils.select(params.x2, 0);
        this.y1 = utils.select(params.y1, 0);
        this.y2 = utils.select(params.y2, 0);
    }

    get x1() {
        return this._x1;
    }

    get x2() {
        return this._x2;
    }

    get y1() {
        return this._y1;
    }

    get y2() {
        return this._y2;
    }

    set x1(value) {
        this._x1 = value;
        this.set("x1", value);
    }

    set x2(value) {
        this._x2 = value;
        this.set("x2", value);
    }

    set y1(value) {
        this._y1 = value;
        this.set("y1", value);
    }

    set y2(value) {
        this._y2 = value;
        this.set("y2", value);
    }

}

class Polygon extends SVGElement {
    constructor(parent, points = []) { // Note: you'll have to call updateSVG when changing points because IMPLOSION
        super(parent, 'polygon', params);

        this.points = points;
        this.updateSVG();
    }

    updateSVG() {
        let text = "";

        for (let i = 0; i < this.points.length; i++) {
            text += this.points[i].join(',');
        }

        this.set("points", text);
    }
}

export {
    SVGContext,
    SVGElement,
    SVGGroup,
    Circle,
    Rectangle,
    Ellipse,
    Text,
    Path,
    Polygon,
    Transformation,
    Translation,
    getID as getSVGID,
    MatrixTransform,
    ScaleTransform,
    Rotation,
    ChildUpdater,
    Line,
    SVGNS,
    TMatrix,
    SkewX,
    SkewY
};