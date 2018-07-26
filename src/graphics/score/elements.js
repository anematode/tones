
import {ScoreContext, ScoreElement, ScoreGroup} from "./basescore.js";
import * as utils from "../../utils.js";
import DEFAULTS from "./scorevalues.js";

import {Ellipse, Rotation, Translation, Path, MatrixTransform, ScaleTransform} from "../svgmanip.js";

class Element extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        this.translation = new Translation();
        this.addTransform(this.translation);

        this.precedence = 50;

        this.offset_x = (params.offset_x !== undefined) ? params.offset_x : 0;
        this.offset_y = (params.offset_y !== undefined) ? params.offset_y : 0;

        this.alignment = "left"; // can be left, right, center, none
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

//https://commons.wikimedia.org/wiki/File:G-clef.svg
let TREBLE_PATH_1 = "M 39.638014,63.891442 C 39.246174,65.983409 41.499606,70.115061 45.890584,70.256984 C 51.19892,70.428558 54.590321,66.367906 53.010333,59.740875 L 45.086538,23.171517 C 44.143281,18.81826 44.851281,16.457097 45.354941,15.049945 C 46.698676,11.295749 50.055822,9.7473042 50.873134,10.949208 C 51.339763,11.635413 52.468042,14.844006 49.256275,20.590821 C 46.751378,25.072835 35.096985,30.950138 34.2417,41.468011 C 33.501282,50.614249 43.075689,57.369301 51.339266,54.71374 C 56.825686,52.950639 59.653965,44.62402 56.258057,40.328987 C 47.29624,28.994371 32.923702,46.341263 46.846564,51.0935 C 45.332604,49.90238 44.300646,48.980054 44.1085,47.852721 C 42.237755,36.876941 58.741182,39.774741 54.294493,50.18735 C 52.466001,54.469045 45.080341,55.297323 40.874269,51.477433 C 37.350853,48.277521 35.787387,42.113231 39.708327,37.687888 C 45.018831,31.694223 51.288782,26.31366 52.954064,18.108736 C 54.923313,8.4061491 48.493821,0.84188926 44.429027,10.385835 C 43.065093,13.588288 42.557016,16.803074 43.863006,22.963534 L 51.780549,60.311215 C 52.347386,62.985028 51.967911,66.664419 49.472374,68.355474 C 48.236187,69.193154 43.861784,69.769668 42.791575,67.770092";
let TREBLE_PATH_2 = "M 48.24903 64.584198 A 3.439605 3.4987047 0 1 1  41.36982,64.584198 A 3.439605 3.4987047 0 1 1  48.24903 64.584198 z";
let TREBLE_TRANSFORM_2 = [-1.08512,-2.036848e-2,2.036848e-2,-1.08512,90.68868,135.0572];

//https://en.wikipedia.org/wiki/File:Bass_clef.svg
let BASS_PATH = "M 1239,8245 C 1397,8138 1515,8057 1591,8001 C 1667,7946 1747,7877 1829,7795 C 1911,7713 1980,7620 2036,7517 C 2080,7441 2118,7353 2149,7253 C 2180,7154 2196,7058 2199,6967 C 2199,6882 2188,6801 2165,6725 C 2143,6648 2105,6585 2051,6534 C 1997,6484 1927,6459 1840,6459 C 1756,6459 1677,6476 1603,6509 C 1530,6543 1478,6597 1449,6673 C 1449,6680 1445,6689 1439,6702 C 1441,6718 1449,6730 1464,6739 C 1479,6748 1492,6752 1504,6752 C 1510,6752 1527,6749 1553,6743 C 1580,6737 1602,6733 1620,6733 C 1673,6733 1720,6752 1763,6789 C 1805,6826 1826,6871 1826,6924 C 1826,6962 1815,6998 1794,7031 C 1773,7064 1744,7091 1707,7110 C 1670,7130 1629,7139 1585,7139 C 1505,7139 1437,7115 1381,7066 C 1326,7016 1298,6953 1298,6874 C 1298,6773 1329,6686 1390,6612 C 1452,6538 1530,6483 1626,6446 C 1721,6408 1817,6390 1915,6390 C 2022,6390 2124,6417 2219,6472 C 2315,6526 2390,6601 2446,6694 C 2502,6788 2531,6888 2531,6996 C 2531,7188 2467,7366 2339,7531 C 2211,7696 2053,7839 1864,7961 C 1738,8044 1534,8156 1253,8297 L 1239,8245 z M 2628,6698 C 2628,6662 2641,6632 2667,6608 C 2692,6583 2723,6571 2760,6571 C 2792,6571 2822,6585 2849,6612 C 2876,6638 2889,6669 2889,6703 C 2889,6739 2875,6770 2849,6795 C 2821,6819 2790,6831 2755,6831 C 2718,6831 2688,6819 2664,6792 C 2640,6766 2628,6735 2628,6698 z M 2628,7222 C 2628,7186 2641,7155 2665,7131 C 2690,7106 2721,7094 2760,7094 C 2792,7094 2821,7107 2849,7134 C 2875,7161 2889,7190 2889,7222 C 2889,7261 2876,7292 2851,7317 C 2825,7342 2795,7355 2760,7355 C 2721,7355 2690,7342 2665,7318 C 2641,7294 2628,7262 2628,7222 z ";
let BASS_TRANSFORM = [4.588483,0,0,4.575039,-4898.431,-28736.72];

class Clef extends Element {
    constructor(parent, params = {}) {
        super(parent, params);

        this._alignment_translation = new Translation();
        this.addTransform(this._alignment_translation);

        this.type = params.type || "treble";

        this.components = [];

        this.precedence = 0;
        this.alignment = "left";

        this.recalculate();
    }

    width() {
        switch (this.type) {
            case "treble":
            case "g":
                return 23.528888702392578;
            case "f":
            case "bass":
                return 28.05;
        } // derived from getBBox()
    }

    minX() {
        switch (this.type) {
            case "treble":
            case "g":
            case "f":
            case "bass":
                return this.offset_x - this.width();
        }
    }

    maxX() {
        switch (this.type) {
            case "treble":
            case "g":
            case "f":
            case "bass":
                return this.offset_x + this.width();
        }
    }

    recalculate() {
        for (let i = 0; i < this.components.length; i++) {
            this.components[i].destroy();
        }

        this.components = [];

        switch (this.type) {
            case "g":
            case "treble":
                let group = new ScoreGroup(this);

                let main = new Path(group, TREBLE_PATH_1);
                let circle = new Path(group, TREBLE_PATH_2);

                circle.addTransform(new MatrixTransform(...TREBLE_TRANSFORM_2));
                group.addTransform(new Translation(-45.96572685241699, -15));

                this.components.push(main);
                this.components.push(circle);

                break;
            case "f":
            case "bass":
                let path = new Path(this, BASS_PATH);

                path.addTransform(new ScaleTransform(0.017));
                path.addTransform(new Translation(-1239, -6378));

                this._alignment_translation.x = -14.025;



                console.log(path);
                this.components.push(path);

                break;
            default:
                throw new Error(`Unrecognized clef type ${this.type}`)
        }
    }
}

class NoteHead extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        this.type = params.type || "normal"; // Values: normal, half, whole
        this.side = params.side || "left"; // Values: left, right

        this.side_transform = new Translation(-7);
        this.vert_transform = new Translation(0, 0);

        this.addTransform(this.side_transform);
        this.addTransform(this.vert_transform);

        this.center_y = parent.center_y || 0;

        this.components = [];

        this.recalculate();
    }

    connectionY() { // y coord where a stem should connect with the note
        let center_y = this.center_y;

        switch (this.side) {
            case "left":
                return center_y - 2;
            case "right":
                return center_y + 2;
        }
    }

    get center_y() {
        return this.vert_transform.y;
    }

    set center_y(value) {
        this.vert_transform.y = value;
    }

    recalculate() {
        switch (this.side) {
            case "left":
                this.side_transform.x = -7;
                break;
            case "right":
                this.side_transform.y = 7;
                break;
        }

        let type = this.type;

        for (let i = 0; i < this.components.length; i++) {
            this.components[i].destroy();
        }

        this.components = [];

        switch (type) {
            case "normal":
                var ellipse = new Ellipse(this, 0, 0, 7, 4);
                ellipse.addTransform(new Rotation(-20));
            case "half":
                return;
            case "whole":
                return;
        }
    }

    getParams() {
        return {
            type: this.type,
            side: this.side
        };
    }
}

class ScoreNote extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);
    }
}

class NoteStem extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        this.type = params.type || "up"; // up, down, or none
        this.top_y = (params.top_y !== undefined) ? params.top_y : 0;
        this.bottom_y = (params.bottom_y !== undefined) ? params.bottom_y : 0;

        this.extra_y = (params.extra_y !== undefined) ? params.extra_y : 70;

        this.stem_object = new Path(this, "");
    }

    calculateHeights(notes) {
        let minY = Infinity;
        let maxY = -Infinity;

        let hasNotes = false;

        for (let i = 0; i < this.parent.notes.length; i++) {
            hasNotes = true;
            let note = this.parent.notes[i];

            let connectionY = note.connectionY();

            if (connectionY < minY)
                minY = connectionY;

            if (connectionY > maxY)
                maxY = connectionY;
        }

        switch (this.type) {
            case "up":
                this.maxY += this.extra_y;
                break;
            case "down":
                this.minY -= this.extra_y;
                break;
        }

        if (this.type === "none" || !hasNotes) {
            this.top_y = 0;
            this.bottom_y = 0;
        } else {
            this.top_y = this.minY;
            this.bottom_y = this.maxY;
        }
    }

    recalculate() {
        let type = this.type;

        if (type !== "none") {
            this.stem_object.d = `M 0 ${this.bottom_y} L 0 ${this.top_y}`;
        } else {
            this.stem_object.d = "";
        }
    }

    getParams() {
        return {
            type: this.type,
            top_y: this.top_y,
            bottom_y: this.bottom_y,
            extra_y: this.extra_y
        };
    }
}

class Chord extends ScoreGroup {
    constructor(parent, params = {}) {
        super(parent);

        let offset_x = (params.offset_x !== undefined) ? params.offset_x : 0;

        this.measure_translation = new Translation(offset_x);
        this.addTransform(this.measure_translation);

        this.notes = (params.notes !== undefined) ? params.notes.map(note => new ScoreNote(this, note)) : [];
        this.stem = (params.stem !== undefined) ? new NoteStem(this, params.stem) : null;

        this.recalculate();
    }

    get offset_x() {
        return this.measure_translation.x;
    }

    set offset_x(value) {
        this.measure_translation.x = value;
        this.recalculate();
    }

    recalculate() {
        this.stem.calculateHeights(this.notes);
        this.stem.recalculate();
    }

    addNote(params) {
        this.notes.push(new ScoreNote(this, params));
    }

    getParams() {
        return {
            offset_x: this.measure_translation.x,
            notes: this.notes.map(note => note.getParams())
        };
    }
}

function get_class(params = {}) {
    utils.assert(params.class, `Invalid element ${params}`);

    switch (params.class) {
        case "clef":
            return Clef;
        case "time":
            return TimeSignature;
    }
}

function constructElement(self, params = {}) {
    return new (get_class(params))(self, params);
}

function buildElements(json) {

}

function jsonifyElements(elements) {

}

export {buildElements, jsonifyElements, constructElement, Chord, ScoreNote, NoteStem, NoteHead, Clef};