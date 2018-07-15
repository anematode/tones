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
        this.addNotes(group.notes);
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

const COINCIDENT_TYPE = {
    sum_velocities: "sum_velocities"
};

const UNION_TYPE = {
    union: "union",
    only_first: "only_first"
};

function unionNoteGroups(group1, group2, coincidentStrategy = COINCIDENT_TYPE.sum_velocities, unionStrategy = UNION_TYPE.union) {
    let notes = group1.notes.concat(group2.notes);
    let process = false;

    do {
        for (let i = 0; i < notes.length; i++) {
            let note1 = notes[i];
            for (let j = i + 1; j < notes.length; j++) { // (note1, note2) is every pair of notes
                let note2 = notes[j];

                if (note1.pitch === note2.pitch) { // same pitch, might need a union strategy

                }
            }
        }
    } while (process);


}

export {NoteGroup};