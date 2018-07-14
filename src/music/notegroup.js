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

    }
}

export {NoteGroup};