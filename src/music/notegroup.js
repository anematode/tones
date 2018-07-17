import {Note, makeNote} from "./note.js";
import * as utils from "../utils.js";
import { KeyboardPitch } from "../audio/keyboardpitch.js";

class NoteGroup {
    constructor(notes) {
        if (Array.isArray(notes)) {
            this.notes = notes;
        } else {
            this.notes = [notes];
        }

        for (let i = 0; i < this.notes.length; i++) {
            if (!(this.notes[i] instanceof Note)) {
                this.notes[i] = new Note(this.notes[i]);
            }
        }

        this.fix();
        this.sort();
    }

    sort() {
        this.notes.sort((x, y) => x.start < y.start );
    }

    apply(func) {
        for (let i = 0; i < this.notes.length; i++) {
            func(this.notes[i]);
        }
    }

    addNote(params) {
        if (params instanceof Note) {
            this.notes.push(params);
        } else {
            this.notes.push(new Note(params));
        }

        this.fix();
        this.sort();
    }

    addNotes(notes) {
        for (let i = 0; i < notes.length; i++) {
            let note = notes[i];
            if (note instanceof Note) {
                this.notes.push(note);
            } else {
                this.notes.push(new Note(note));
            }
        }

        this.fix();
        this.sort();
    }

    addGroup(group) {
        this.notes = unionNoteGroups(this, group).notes;
    }

    removeNote(note) {
        if (note instanceof Note) {
            for (let i = 0; i < this.notes.length; i++) {
                if (this.notes[i] === note) {
                    this.notes.splice(i, 1);
                    return;
                }
            }
        } else if (note instanceof Function) {
            for (let i = 0; i < this.notes.length; i++) {
                if (note(this.notes[i])) {
                    this.notes.splice(i, 1);
                    return;
                }
            }
        }
    }

    translate(x) {
        this.apply(n => n.translate(x));
        return this;
    }

    tr(x) {
        return this.translate(x);
    }

    transpose(x) {
        this.apply(n => n.transpose(x));
        return this;
    }

    tp(x) {
        return this.transpose(x);
    }

    amplify(x) {
        this.apply(n => n.amplify(x));
        return this;
    }

    amp(x) {
        return this.amplify(x);
    }

    quieten(x) {
        this.apply(n => n.quieten(x));
        return this;
    }

    quiet(x) {
        return this.apply(n => n.quiet(x));
    }

    getNotes(minX = -Infinity, maxX = Infinity) {
        let notes = [];

        for (let i = 0; i < this.notes.length; i++) {
            let note = this.notes[i];
            if (note.start > minX && note.start < maxX) {
                notes.push(note);
            }
        }

        return new NoteGroup(notes);
    }

    fix(unionStrategy = UNION_TYPE.trim()) {
        this.notes = fixNoteArray(this.notes, unionStrategy);
    }

    minStart() {
        let min_start = -Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].start < min_start) {
                min_start = this.notes[i].start;
            }
        }
    }

    maxStart() {
        let max_start = -Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].start > max_start) {
                max_start = this.notes[i].start;
            }
        }
    }

    minEnd() {
        let min_end = -Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].end < min_end) {
                min_end = this.notes[i].end;
            }
        }
    }

    maxEnd() {
        let max_end = -Infinity;
        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].end > max_end) {
                max_end = this.notes[i].end;
            }
        }
    }

    schedule(instrument, timeContext, params = {}) {
        let minX = (params.minX !== undefined) ? params.minX :
            ((params.minTime !== undefined) ? timeContext.ctxTimeToBeat(params.minTime) : -Infinity);
        let maxX = (params.maxX !== undefined) ? params.maxX :
            ((params.maxTime !== undefined) ? timeContext.ctxTimeToBeat(params.maxTime) : Infinity);

        let notes = this.getNotes(minX, maxX).notes;

        for (let i = 0; i < notes.length; i++) {
            instrument.schedule(notes[i].keyboardNote(timeContext));
        }
    }
}

const COINCIDENT_TYPE = { // Union cases where two notes of the same pitch start at the same time
    sum: function(x, y) { // Merge the notes properties
        return new Note({
            pitch: x.pitch,
            vel: x.vel + y.vel,
            end: Math.max(x.end, y.end),
            pan: (x.pan + y.pan) / 2,
            start: x.start
        });
    },
    remove: function(x, y) { // Remove both notes
        return;
    },
    longer: function(x, y) { // Choose the longer one
        if (y.end > x.end) {
            return y;
        } else {
            return x;
        }
    },
    shorter: function(x, y) { // Choose the shorter one
        if (y.end > x.end) {
            return x;
        } else {
            return y;
        }
    },
    max_properties: function(x, y) { // Choose the maximum properties
        return new Note({
            pitch: x.pitch,
            vel: Math.max(x.vel, y.vel),
            end: Math.max(x.end, y.end),
            pan: (x.pan + y.pan) / 2,
            start: x.start
        });
    }
};

const UNION_TYPE = { // Union cases where two notes of the same pitch intersect
    merge: ((coincident_type = COINCIDENT_TYPE.sum) => function(x, y) { // Merge the notes together into one note with max length
        if (x.start === y.start) {
            return coincident_type(x, y);
        } else if (x.start < y.start) {
            return new Note({
                pitch: x.pitch,
                vel: x.vel,
                end: y.end,
                pan: x.pan,
                start: x.start
            });
        } else {
            return new Note({
                pitch: y.pitch,
                vel: y.vel,
                end: x.end,
                pan: y.pan,
                start: y.start
            });
        }
    }),
    trim: ((coincident_type = COINCIDENT_TYPE.sum) => function(x, y) { // Trim the first note so it ends when the second note starts
        if (x.start === y.start) {
            return coincident_type(x, y);
        } else if (x.start < y.start) {
            return [new Note({
                pitch: x.pitch,
                vel: x.vel,
                end: y.start,
                pan: x.pan,
                start: x.start
            }), y];
        } else {
            return [new Note({
                pitch: y.pitch,
                vel: y.vel,
                end: x.start,
                pan: y.pan,
                start: y.start
            }), x];
        }
    }),
    remove: ((coincident_type = COINCIDENT_TYPE.sum) => function(x, y) { // Remove the notes
        if (x.start === y.start) {
            return coincident_type(x, y);
        }
    }),
    first: ((coincident_type = COINCIDENT_TYPE.sum) => function(x, y) { // choose the first note
        if (x.start === y.start) {
            return coincident_type(x, y);
        } else if (x.start < y.start) {
            return x;
        } else {
            return y;
        }
    }),
    second: ((coincident_type = COINCIDENT_TYPE.sum) => function(x, y) { // choose the second note
        if (x.start === y.start) {
            return coincident_type(x, y);
        } else if (x.start > y.start) {
            return x;
        } else {
            return y;
        }
    })
};

function fixNoteArray(arr, unionStrategy = UNION_TYPE.trim()) {
    let process = false;

    do {
        process = false;

        let n_len = arr.length;

        for (let i = 0; i < n_len; i++) {
            let note1 = arr[i];
            for (let j = i + 1; j < n_len; j++) { // (note1, note2) is every pair of notes
                let note2 = arr[j];

                if (note1.pitch.value === note2.pitch.value) { // same pitch, might need a union strategy
                    if ((note2.start < note1.start && note1.start < note2.end) ||
                        (note1.start < note2.start && note2.start < note1.end)) {

                        let result = unionStrategy(note1, note2);

                        if (Array.isArray(result)) {
                            for (let k = 0; k < result.length; k++) {
                                arr.push(result[k]);
                                n_len++;
                            }
                        } else if (result) {
                            arr.push(result);
                            n_len++;
                        }

                        arr.splice(j, 1);
                        arr.splice(i, 1);

                        i--; j--; n_len -= 2;
                        process = true;
                        break;
                    }
                }
            }

        }
    } while (process);

    return arr;
}

function unionNoteGroups(group1, group2, unionStrategy = UNION_TYPE.trim()) {
    let notes = group1.notes.concat(group2.notes);

    return new NoteGroup(fixNoteArray(notes, unionStrategy));
}

function trimComments(line) {
    for (let i = 0; i < line.length; i++) {
        if (line[i] === "#") {
            return line.slice(0, i);
        }
    }
    return line;
}

class Rest extends Note {
    constructor(params) {
        super(params);
        this.isRest = true;
    }
}

let ENV = {
    d1: 1,
    whole: 1,
    w: 1,
    d2: 0.5,
    half: 0.5,
    h: 0.5,
    d4: 0.25,
    q: 0.25,
    quarter: 0.25,
    d8: 0.125,
    eighth: 0.125,
    e: 0.125,
    d16: 1 / 16,
    sixteenth: 1 / 16,
    s: 1/16,
    d32: 1/32,
    tt: 1/32,
    d64: 1/64,
    sf: 1/64,
    d128: 1/128,
    d256: 1/256,
    d512: 1/512
};

let WARNED_EVAL_EXPRESSION = false;


function _evalExpressions(exprs) {
    if (!WARNED_EVAL_EXPRESSION) {
        WARNED_EVAL_EXPRESSION = true;
        console.warn("evalExpression uses eval(), which is dangerous and therefore should only be used for testing purposes.");
    }
    try {
        return new Function("ENV", "exprs", "let _=[];with(ENV){for(let i=0;i<exprs.length;i++){_.push([exprs[i][0],eval(exprs[i][1])])}}return _")(ENV, exprs);
    } catch (e) {
        throw new Error(`Invalid expression ${exprs}`);
    }
}

function exprApply(note, kv_pair) {
    let value = kv_pair[1];

    switch (kv_pair[0]) {
        case 'd':
        case 'dur':
        case 'duration':
            if (value <= 0 && !note.isRest)
                throw new Error(`Duration length ${value} is invalid`);
            note.duration = value;
            break;
        case 's':
        case 'start':
            note.start = value;
            break;
        case 'e':
        case 'end':
            note.duration = value - note.start;
            if (note.duration <= 0 && !note.isRest)
                throw new Error(`End value ${value} is invalid`);
            break;
        case 's_off':
        case 's_offset':
        case 'start_offset':
            note.start += value;
            break;
        case 'd_off':
        case 'd_offset':
        case 'duration_offset':
        case 'dur_offset':
            note.duration += value;
            if (note.duration <= 0)
                throw new Error(`Duration offset value ${value} makes a duration of ${note.duration}`);
            break;
        case 'v':
        case 'vel':
        case 'velocity':
            if (value <= 0)
                throw new Error(`Velocity value ${value} is invalid`);
            note.vel = value;
            break;
        case 'p':
        case 'pan':
            if (pan < -1 || pan > 1)
                throw new Error(`Pan value ${value} is invalid`);
            note.pan = value;
            break;
    }
}

function applyCurly(notes, exprs_string) {
    if (!exprs_string)
        return;

    let exprs = exprs_string.split(',').map(expr => {
        let kv_pair = expr.split(":");
        if (kv_pair.length !== 2)
            throw new Error(`Invalid key value pair ${expr}`);
        return kv_pair;
    });

    exprs = _evalExpressions(exprs);

    for (let i = 0; i < notes.length; i++) {
        let note = notes[i];

        for (let j = 0; j < exprs.length; j++) {
            exprApply(note, exprs[j]);
        }
    }
}

function parseGroupString(string, prev_note, override_prev_note = false, depth = 0) {
    prev_note = prev_note || new Note({start: -0.25, duration: 0.25, pan: 0, vel: 1});
    prev_note._depth = depth;

    let next_start = prev_note.end;

    let generator = parserGenerator(string);
    let token = null;

    let notes = [];
    let active_notes = [];

    function pushNotes() {
        if (!override_prev_note && active_notes.length > 0) {
            prev_note = active_notes[active_notes.length - 1];
        }
        for (let i = 0; i < active_notes.length; i++) {
            if (!active_notes[i].isRest) {
                notes.push(active_notes[i]);
            }
        }
        active_notes = [];
    }

    while (true) {
        token = generator.next();

        if (token.done) break;

        let contents = token.value;
        let value = contents.value;

        switch (contents.type) {
            case "pitch":
                pushNotes();

                let c = new Note({
                    pan: prev_note.pan,
                    vel: prev_note.vel,
                    duration: prev_note.duration,
                    start: prev_note.end,
                    pitch: value
                });

                c._depth = depth;
                active_notes = [c];

                break;
            case "curly":
                applyCurly(active_notes, value);
                pushNotes();

                break;
            case "bracket":
                pushNotes();

                active_notes = parseGroupString(value, prev_note, true, depth + 1);
                break;
            case "paren":
                pushNotes();

                active_notes = parseGroupString(value, prev_note, false, depth + 1);
                break;
            case "rest":
                pushNotes();

                let rest = new Rest({
                    pan: prev_note.pan,
                    vel: prev_note.vel,
                    duration: prev_note.duration,
                    start: prev_note.end,
                    pitch: prev_note.pitch
                });

                active_notes = [rest];

                break;
        }
    }

    pushNotes();

    return notes;
}

function* parserGenerator(string) {
    let groupingHistory = [];

    let in_paren = function () {
        return (groupingHistory.includes('('));
    };

    let in_bracket = function () {
        return (groupingHistory.includes('['));
    };

    let in_properties = function () {
        return (groupingHistory.includes('{'));
    };

    let last_opening = function () {
        if (groupingHistory.length === 0) {
            throw new Error("Unbalanced parentheses, brackets, and/or curly braces");
        }
        return (groupingHistory[groupingHistory.length - 1]);
    };

    let remove_last_opening = function () {
        if (groupingHistory.length === 0) {
            throw new Error("Unbalanced parentheses, brackets, and/or curly braces");
        }
        return groupingHistory.splice(groupingHistory.length - 1, 1);
    };

    let at_top_level = function() {
        return !groupingHistory.length;
    };

    let ltoi = -1; // Last top level opening index
    let note_concat = "";

    for (let i = 0; i < string.length; i++) {
        //console.log(groupingHistory, string[i]);
        let ret_value = null;

        switch (string[i]) {
            case '[':
                if (in_properties())
                    throw new Error("Cannot have bracket in properties");
                if (at_top_level())
                    ltoi = i + 1;
                groupingHistory.push('[');
                break;
            case ']':
                if (last_opening() === '[')
                    remove_last_opening();
                else
                    throw new Error("Mismatched bracket");
                if (at_top_level())
                    ret_value = {type: "bracket", value: string.slice(ltoi, i)};
                break;
            case '(':
                if (at_top_level())
                    ltoi = i + 1;
                groupingHistory.push('(');
                break;
            case ')':
                if (last_opening() === '(')
                    remove_last_opening();
                else
                    throw new Error("Mismatched parentheses");
                if (at_top_level())
                    ret_value = {type: "paren", value: string.slice(ltoi, i)};
                break;
            case '{':
                if (in_properties())
                    throw new Error("Cannot have nested curly braces");
                if (at_top_level())
                    ltoi = i + 1;
                groupingHistory.push('{');
                break;
            case '}':
                if (last_opening() === '{')
                    remove_last_opening();
                else
                    throw new Error("Mismatched curly braces");
                if (at_top_level())
                    ret_value = {type: "curly", value: string.slice(ltoi, i)};
                break;
            case 'R':
                if (at_top_level())
                    ret_value = {type: "rest", value: "R"};
                break;
            default:
                if (at_top_level()) {
                    let prev_note_concat = note_concat;
                    note_concat += string[i];
                    try {
                        let p = new KeyboardPitch(note_concat);
                    } catch (e) {
                        try {
                            yield {type: "pitch", value: new KeyboardPitch(prev_note_concat)};
                            note_concat = string[i];
                        } catch (f) {

                        }
                    }
                } else {
                    continue;
                }
        }

        if (ret_value) {
            if (note_concat) {
                try {
                    let p = new KeyboardPitch(note_concat);
                    yield {type: "pitch", value: p};
                    note_concat = "";
                } catch (e) {
                    throw new Error(`Invalid pitch "${note_concat}"`)
                }
            }

            yield ret_value;
        }
    }

    if (note_concat) {
        try {
            let p = new KeyboardPitch(note_concat);
            yield {type: "pitch", value: p};
        } catch (e) {
            throw new Error(`Invalid pitch "${note_concat}"`)
        }
    }
}

/*
A somewhat difficult to use function, but useful for quick tests
 */
function parseAbbreviatedGroup(string) {
    if (!utils.isString(string)) {
        throw new Error("Parse group must act on a string");
    }

    let lines = string.split('\n');

    for (let i = 0; i < lines.length; i++) {
        lines[i] = trimComments(lines[i]).replace(/\s/g,''); // remove comments and whitespace
    }

    string = lines.join('');

    return new NoteGroup(parseGroupString(string));
}

export {NoteGroup, parseAbbreviatedGroup};