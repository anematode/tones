import {Note, makeNote} from "./note.js";

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

function unionNoteGroups(group1, group2, unionStrategy = UNION_TYPE.trim()) {
    let notes = group1.notes.concat(group2.notes);
    let process = false;

    do {
        process = false;

        let n_len = notes.length;

        for (let i = 0; i < n_len; i++) {
            let note1 = notes[i];
            for (let j = i + 1; j < n_len; j++) { // (note1, note2) is every pair of notes
                let note2 = notes[j];

                if (note1.pitch.value === note2.pitch.value) { // same pitch, might need a union strategy
                    if ((note2.start < note1.start && note1.start < note2.end) ||
                        (note1.start < note2.start && note2.start < note1.end)) {

                        let result = unionStrategy(note1, note2);

                        if (Array.isArray(result)) {
                            for (let k = 0; k < result.length; k++) {
                                notes.push(result[k]);
                                n_len++;
                            }
                        } else if (result) {
                            notes.push(result);
                            n_len++;
                        }

                        notes.splice(j, 1);
                        notes.splice(i, 1);

                        i--; j--; n_len -= 2;
                        process = true;
                        break;
                    }
                }
            }

        }
    } while (process);

    return new NoteGroup(notes);
}

export {NoteGroup};