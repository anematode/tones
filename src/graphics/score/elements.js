
import {ScoreContext, ScoreGroup} from "./basescore.js";
import * as utils from "../../utils.js";
import DEFAULTS from "./scorevalues.js";

import {ElementClef} from "./elements/clef.js";
import {ElementTimeSig} from "./elements/timesig";
import {ElementKeySig} from "./elements/keysig";
import {ElementSpacer, ElementPositioner} from "./elements/spacer.js";
import {ElementNote} from "./elements/note.js";

function get_class(params = {}) {
    utils.assert(params.class, `Invalid element ${params}`);

    switch (params.class) {
        case "clef":
            return ElementClef;
        case "time":
            return ElementTimeSig;
        case "key":
            return ElementKeySig;
        case "space":
            return ElementSpacer;
        case "position":
            return ElementPositioner;

    }
}

function constructElement(parent, params = {}) {
    return new (get_class(params))(parent, params);
}

function buildElements(parent, json) {
    let elements = [];

    for (let i = 0; i < json.length; i++) {
        constructElement(parent, json[i]);
    }

    return elements;
}

function jsonifyElements(elements) { // Major TODO: implement getParams on all elements
}

export {
    buildElements, jsonifyElements, constructElement,
    ElementClef, ElementTimeSig, ElementKeySig, ElementSpacer, ElementPositioner, ElementNote
};