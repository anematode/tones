import * as utils from "../utils.js";

let ID_INDEX = 0;

let ID_INTERNAL = new Uint32Array(1);
ID_INTERNAL[0] = 0xCF39ACE1;

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

class SVGElement {
    constructor(parent, tag) {
        if (!parent) { // used in construction of SVGContext, which has no parent
            this.context = this;
            this.element = tag;
            this.parent = null;
        } else { // Other nodes go here
            this.context = parent.context;
            this.element = utils.isString(tag) ? parent.createRawElement(tag, {}, true) : tag;
            this.parent = parent;

            parent.children.push(this);
        }

        this._id = getID();

        this.element.setAttributeNS(null, "_id", this._id);

        this.transform = new Transformation();
        this.transform._setModificationPropagation(() => {
            this.updateTransform();
        }, this._id);

        this.updateTransform();
        this.set("class", "");
    }

    updateTransform() {
        this.set("transform", this.transform.toSVGValue());
    }

    addTransform(...args) {
        this.transform.addTransform(...args);
        this.updateTransform();
    }

    removeTransform(...args) {
        this.transform.addTransform(...args);
        this.updateTransform();
    }

    resetTransform() {
        this.transform.removeAll();
        this.updateTransform();
    }

    getBBox() {
        return this.element.getBBox();
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

    _addTo(element = this.context.element) {
        element.appendChild(this.element);
        return this;
    }

    remove() {
        this.element.remove();
        this.parent.removeChild(this);
    }

    get(attribute) {
        return this.element.getAttributeNS(null, attribute);
    }

    getNames() {
        return this.element.getAttributeNames();
    }

    has(attribute) {
        return !!this.element.getAttributeNS(null, attribute);
    }

    getAll() {
        let names = this.getNames();
        let attribs = {};

        for (let i = 0; i < names.length; i++) {
            attribs[names[i]] = this.get(names[i]);
        }

        return attribs;
    }

    destroy() {
        this.remove();

        this._id = -1;
    }

    get destroyed() {
        return this._id === -1;
    }

    addEventListener(...args) {
        return this.element.addEventListener(...args);
    }

    removeEventListener(...args) {
        return this.element.removeEventListener(...args);
    }

    getClasses() {
        return this.get("class").split('\n');
    }

    addClass(x) {
        let classes = this.getClasses();

        for (let i = 0; i < classes.length; i++) {
            let Class = classes[i];

            if (x === Class) return;
        }

        this.set("class", this.get("class") + x);
    }

    removeClass(x) {
        if (!Array.isArray(x))
            x = [x];

        let classes = this.getClasses();

        for (let i = 0; i < x.length; i++) {
            for (let j = 0; j < classes.length; j++) {
                if (x[i] === classes[j]) {
                    classes.splice(j--, 1);
                }
            }
        }

        this.set("class", classes.join(' '));
    }

    hide() {
        this.set("display", "none");
    }

    show() {
        this.set("display", "");
    }
}

class SVGGroup extends SVGElement {
    constructor(parent, _contextDOM = null) { // DO NOT USE THE SECOND PARAMETER
        super(parent, _contextDOM ? _contextDOM : "g");

        this.children = [];
    }

    traverseNodes(func, evalBefore = true) {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (evalBefore)
                func(child, this, i);
            if (child.traverseNodes)
                child.traverseNodes(func, evalBefore);
            if (!evalBefore)
                func(child, this, i);
        }
    }

    createElement(name, attribs = {}, append = false) {
        let elem = this.createRawElement(name, attribs, append);

        let svgElement = new SVGElement(this, elem);
        this.children.push(svgElement);

        return svgElement;
    }

    createRawElement(name, attribs = {}, append = false) {
        let elem = document.createElementNS(SVGNS, name);

        Object.keys(attribs).forEach((key) => {
            elem.setAttributeNS(null, key, attribs[key]);
        });

        if (append)
            this.element.appendChild(elem);

        return elem;
    }

    addElement(name, attribs = {}) {
        return this.createElement(name, attribs, true);
    }

    makeGroup(attribs = {}, append = false) {
        let elem = document.createElementNS(SVGNS, 'g');

        Object.keys(attribs).forEach((key) => {
            elem.setAttributeNS(null, key, attribs[key]);
        });

        if (append)
            this.element.appendChild(elem);

        let svgElement = new SVGGroup(this, elem);
        this.children.push(svgElement);

        return svgElement;
    }

    addGroup(attribs = {}) {
        return this.makeGroup(attribs, true);
    }

    removeElement(elem, recursive = false) {
        let id;
        if (elem instanceof SVGElement) {
            id = elem._id;
        } else {
            id = elem;
        }

        return this.removeIf(e => e._id === id);
    }

    removeChild(elem, recursive = false) {
        let id;
        if (elem instanceof SVGElement) {
            id = elem._id;
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

            if (child._id === id) {
                this.children.splice(i--, 1);
                count += 1;
            }
        }

        return count;
    }

    removeIf(func, recursive = false) {
        let count = 0;

        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];

            if (recursive && child.removeIf) {
                let res = child.removeIf(func, recursive);
                count += res;
            }

            if (func(child)) {
                this.children[i].destroy();
                this.children.splice(i--, 1);
                count += 1;
            }
        }

        return 0;
    }

    destroy() {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
        }

        this.remove();
        this._id = -1;
    }

    makeCircle(cx = 0, cy = 0, r = 0) {
        return svgClassFactory(this, Circle, cx, cy, r);
    }

    addCircle(...args) {
        let circle = this.makeCircle(...args);
        this.element.appendChild(circle.element);
        return circle;
    }

    makeRect(x = 0, y = 0, width = 100, height = 100, rx = 0, ry = 0) {
        return svgClassFactory(this, Rectangle, x, y, width, height, rx, ry);
    }

    addRect(...args) {
        let rect = this.makeRect(...args);
        this.element.appendChild(rect.element);
        return rect;
    }

    makeEllipse(cx = 0, cy = 0, rx = 0, ry = 0) {
        return svgClassFactory(this, Ellipse, cx, cy, rx, ry);
    }

    addEllipse(...args) {
        let rect = this.makeEllipse(...args);
        this.element.appendChild(ellipse.element);
        return ellipse;
    }

    makeText(text = "lorem ipsum", x = 0, y = 0, dx = 0, dy = 0) {
        return svgClassFactory(this, Text, text, x, y, dx, dy);
    }

    addText(...args) {
        let text = this.makeText(...args);
        this.element.appendChild(text.element);
        return text;
    }

    makePath(d = "") {
        return svgClassFactory(this, Path, d);
    }

    addPath(...args) {
        let path = this.makePath(...args);
        this.element.appendChild(path.element);
        return path;
    }

    makePolygon(points = []) {
        return svgClassFactory(this, Polygon, points);
    }

    addPolygon(...args) {
        let poly = this.makePolygon(...args);
        this.element.appendChild(poly.element);
        return path;
    }
}

class SVGContext extends SVGGroup {
    constructor(domElem) {
        if (typeof domElem === "string") {
            domElem = document.getElementById(domElem);
        }

        if (!domElem) {
            throw new Error("Must pass valid DOM element or id");
        }

        super(null, domElem);

        this.context = this;

        this.children = [];
        this._id = getID();

        this.element.setAttributeNS(null, "_id", this._id);
    }

    get width() {
        return parseInt(this.element.getAttributeNS(null, "width"));
    }

    get height() {
        return parseInt(this.element.getAttributeNS(null, "height"));
    }

    set width(value) {
        this.element.setAttributeNS(SVGNS, "width", value);
    }

    set height(value) {
        this.element.setAttributeNS(SVGNS, "height", value);
    }

    makeCircle(cx = 0, cy = 0, r = 0) {
        return svgClassFactory(this, Circle, 'circle', cx, cy, r);
    }
}

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

    propagateChange() {
        Object.keys(this.propagators).forEach(key => {
            this.propagators[key]();
        });
    }
}

class SimpleTransformation extends ChildUpdater {
    constructor() {
        super();
    }
}

class Transformation extends ChildUpdater {
    constructor(transforms = []) {
        super();

        this.transforms = transforms;
        this._id = getID("T");
    }

    transform(x, y) {
        for (let i = this.transforms.length - 1; i >= 0; i--) {
            let result = this.transforms[i].transform(x, y);

            x = result[0];
            y = result[1];
        }
    }

    toSVGValue() {
        let text = "";

        for (let i = 0; i < this.transforms.length; i++) {
            text += this.transforms[i].toSVGValue() + ' ';
        }

        return text;
    }

    addTransform(t) {
        this.transforms.push(t);

        t._setModificationPropagation(() => {
            this.propagateChange();
        }, this._id);
    }

    prependTransform(t) {
        this.transforms.unshift(t);

        t._setModificationPropagation(() => {
            this.propagateChange();
        }, this._id);
    }

    removeTransform(elem) {
        let id;
        if (elem instanceof SimpleTransformation) {
            id = elem._id;
        } else {
            id = elem;
        }

        this.removeIf(e => e._id === id);
        this.propagateChange();
    }

    removeIf(func) {
        for (let i = 0; i < this.transforms.length; i++) {
            if (func(this.transforms[i])) {
                this.transforms[i]._removeModificationPropagation(this._id);
                this.transforms.splice(i--, 0);
            }
        }
    }

    removeAll() {
        this.removeIf(() => true);
    }
}

class Translation extends SimpleTransformation {
    constructor(xd = 0, yd = 0) {
        super();

        this._x = xd;
        this._y = yd;

        this._id = getID("T");
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    set x(value) {
        this._x = value;
        this.propagateChange();
    }

    set y(value) {
        this._y = value;
        this.propagateChange();
    }

    transform(x, y) {
        if (Array.isArray(x)) {
            y = x[1];
            x = x[0];
        }

        return [x + this.x, y + this.y];
    }

    toSVGValue() {
        return `translate(${this.x}, ${this.y})`;
    }
}

class MatrixTransform extends SimpleTransformation {
    constructor(a, b, c, d, e, f) {
        super();

        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
        this._e = e;
        this._f = f;
    }

    get a() {
        return this._a;
    }

    get b() {
        return this._b;
    }

    get c() {
        return this._c;
    }

    get d() {
        return this._d;
    }

    get e() {
        return this._e;
    }

    get f() {
        return this._f;
    }

    set a(value) {
        this._a = value;
        this.propagateChange();
    }

    set b(value) {
        this._b = value;
        this.propagateChange();
    }

    set c(value) {
        this._c = value;
        this.propagateChange();
    }

    set d(value) {
        this._d = value;
        this.propagateChange();
    }

    set e(value) {
        this._e = value;
        this.propagateChange();
    }

    set f(value) {
        this._f = value;
        this.propagateChange();
    }

    transform(x, y) {
        if (Array.isArray(x)) {
            y = x[1];
            x = x[0];
        }

        return [this.a * x + this.c * y + this.e, this.b * x + this.d * y + this.f];
    }

    toSVGValue() {
        return `matrix(${this.a} ${this.b} ${this.c} ${this.d} ${this.e} ${this.f})`;
    }
}

class ScaleTransform extends SimpleTransformation {
    constructor(xs, ys = xs) {
        super();

        this._xs = xs;
        this._ys = ys;
    }

    transform(x, y) {
        if (Array.isArray(x)) {
            y = x[1];
            x = x[0];
        }

        return [x * this.xs, y * this.ys];
    }

    get xs() {
        return this._xs;
    }

    get ys() {
        return this._ys;
    }

    set xs(value) {
        this._xs = value;
        this.propagateChange();
    }

    set ys(value) {
        this._ys = value;
        this.propagateChange();
    }

    toSVGValue() {
        return `scale(${this.xs} ${this.ys})`;
    }
}

class Rotation extends SimpleTransformation {
    constructor(a, x = 0, y = 0) {
        super();

        this._a = a;
        this._x = x;
        this._y = y;
    }

    transform(x, y) {
        let xr = this.x;
        let yr = this.y;
        let a = this.a * Math.PI / 180;

        x -= xr;
        y -= yr;

        let s = Math.sin(a), c = Math.cos(a);

        let xn = x * c - y * s;
        let yn = x * s + y * c;

        return [xn + xr, xn + yr];
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
        this.propagateChange();
    }

    set x(value) {
        this._x = value;
        this.propagateChange();
    }

    set y(value) {
        this._y = value;
        this.propagateChange();
    }

    toSVGValue() {
        return `rotate(${this.a} ${this.x} ${this.y})`;
    }
}

class Circle extends SVGElement {
    constructor(parent, cx = 0, cy = 0, r = 0) {
        super(parent, 'circle');

        this._cx = cx;
        this._cy = cy;
        this._r = r;

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
        this.updateSVG();
    }

    set cy(value) {
        this._cy = value;
        this.updateSVG();
    }

    set r(value) {
        this._r = value;
        this.updateSVG();
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
    constructor(parent, x = 0, y = 0, width = 100, height = 100, rx = 0, ry = 0) {
        super(parent, 'rect');

        this._width = width;
        this._height = height;
        this._x = x;
        this._y = y;
        this._rx = rx;
        this._ry = ry;
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
        this.updateSVG();
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = value;
        this.updateSVG();
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
        return "rect";
    }
}

class Ellipse extends SVGElement {
    constructor(parent, cx = 0, cy = 0, rx = 0, ry = 0) {
        super(parent, 'ellipse');

        this._cx = cx;
        this._cy = cy;
        this._rx = rx;
        this._ry = ry;

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
    constructor(parent, text = "lorem ipsum", x = 0, y = 0, dx = 0, dy = 0) {
        super(parent, 'text');

        this._text = text;
        this._x = x;
        this._y = y;
        this._dx = dx;
        this._dy = dy;

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
    constructor(parent, d = "") {
        super(parent, 'path');

        this._d = d;
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

class Polygon extends SVGElement {
    constructor(parent, points = []) { // Note: you'll have to call updateSVG when changing points because IMPLOSION
        super(parent, 'polygon');

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
    ChildUpdater
};