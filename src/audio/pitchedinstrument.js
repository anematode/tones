import { Instrument } from "./instrument.js";
import { PitchMappings, PitchMapping } from "./pitchmapping.js";
import * as audio from "./audio.js";
import * as utils from "../utils.js";
import {noteToName} from "./keyboardpitch.js";

function periodicClearTimeout(list, timeout = 1000) {
    let timer = setInterval(() => {
        for (let i = 0; i < list.length; i++) {
            if (list[i].ended()) {
                list.splice(i, 1);
                i--;
            }
        }
    }, timeout);
}

// Abstract class, Instrument with pitch
class PitchedInstrument extends Instrument {
    constructor(parameters = {}) {
        /*
        Takes parameters: pitch_mapping
        Creates functions:
            schedule(KeyboardNote, msBefore = 100)
                -> if (note.start < currentTime) don't schedule it, also takes into account overlapping notes, returns
                   cancellable object allowing the note to be cancelled; cancelling during playing causes instant release,
                   msBefore is how many milliseconds before the note is played it should be internally scheduled
            playPitch(KeyboardPitch, vel = 1, pan = 0)
                -> play a pitch with velocity vel and pan value pan immediately (useful for interactive playPitch)
            releasePitch(KeyboardPitch)
                -> release a pitch (useful for interactive play)
            predictedState(audioCtxTime)
                -> get the predicted state of all notes, based on currently playing and scheduled notes, as a boolean array
            releaseAll()
                -> immediately release all notes, but don't cancel later scheduled notes
            cancelAll()
                -> immediately release all notes and cancel all scheduled notes
            isPlaying
        Requires functions:
            createNode(pitch, start, end)
                -> returning an object with the following properties:
                    _connect(node), connecting the note's exit node to a node,
                    _disconnect(), disconnecting the note's exit node,
                    _release(), immediately releasing the note;
                    _cancel(), immediately cancelling the note;
                    _destroy(), immediately destroying the note,
                    _timeAfterRelease(), returning the amount of time needed until the note can be destroyed after release
         */

        super(parameters);

        this.pitch_mapping = parameters.pitch_mapping || PitchMappings.ET12;

        this.note_states = Array(128);

        for (let i = 0; i < 128; i++) {
            /*
            Each entry in future_nodes as well as active node, will have the following format:
            node: output of createNode (with cancel functions etc.),
            start: seconds against audio context time of note start,
            end: seconds against audio context time of note end
            */

            this.note_states[i] = {
                future_nodes: [],
                active_note: null,
            };
        }

        this.internal_timeouts = [];

        this._timeout_interval = periodicClearTimeout(this.internal_timeouts);
        this._active_note_remover = setInterval(() => {
            this.clearOldActiveNodes();
        }, 500);
    }

    frequencyOf(keyboardPitch) {
        return this.pitch_mapping.transform(keyboardPitch);
    }

    getNoteState(note_num) {
        return this.note_states[note_num];
    }

    getActiveNote(note_num) {
        return this.note_states[note_num].active_note;
    }

    hasEventsScheduled(note_num) {
        let state = this.getNoteState(note_num);

        return !(state.future_nodes.length === 0 && !state.active_note);
    }

    predictNoteState(note_num) { // Return the predicted note state
        if (!this.hasEventsScheduled(note_num)) {
            return {
                future_nodes: [],
                active_note: null
            }
        }

        let curr_state = this.getNoteState(note_num);
        let future_state = [];

        for (let i = 0; i < curr_state.future_nodes.length; i++) {
            let node = curr_state[i];

            // TODO
        }
    }

    _addInternalTimeout(timeout) {
        this.internal_timeouts.push(timeout);
    }

    setActiveNodeFromFuture(pitch, node) {
        let note_state = this.getNoteState(pitch);

        if (note_state.active_note)
            note_state.active_note.node.release();

        let node_index = note_state.future_nodes.indexOf(node);
        note_state.active_note = note_state.future_nodes.splice(node_index, 1)[0];
    }

    setLongActiveNode(pitch, node) {
        let note_state = this.getNoteState(pitch);

        if (note_state.active_note)
            note_state.active_note.node.release();


        note_state.active_note = {
            node: node,
            start: audio.Context.currentTime,
            end: Infinity
        }
    }

    clearOldActiveNodes() {
        for (let i = 0; i < 128; i++) {
            let curr_state = this.getNoteState(i);

            if (curr_state.active_note) {
                if (curr_state.active_note.end < audio.Context.currentTime + 0.05) {
                    curr_state.active_note = null;
                }
            }
        }
    }

    schedule(note, createMsBefore = 1500, id = 0) {
        // note is KeyboardNote

        // console.log(note, id);
        if (note.end < audio.Context.currentTime) { // if note is old news, ignore it
            // console.log("Ignored ", note, id, audio.Context.currentTime);
            return null;

        }

        if (!createMsBefore)
            createMsBefore = 5000;

        let note_id = id ? id : utils.getID();

        if (note.start > audio.Context.currentTime + 2 * createMsBefore / 1e3) {
            // console.log("Make timeout: ", note.pitch.name(), note_id, note);

            let timeout =
                new utils.CancellableTimeout(() => {
                    // console.log("Calling timeout: ", note.pitch.name(), note_id, note);
                    this.schedule(note, createMsBefore, note_id);
                },
                note.start - createMsBefore / 1e3, true);

            timeout.id = note_id;

            this._addInternalTimeout(timeout);

            return {
                cancel: () => {
                    this.terminateNote(note_id);
                },
                id: note_id
            }
        }


        // console.log("Scheduling: ", note.pitch.name(), note.start, audio.Context.currentTime, note_id);
        let frequency = this.pitch_mapping.transform(note.pitch);

        let note_state = this.getNoteState(note.pitch.value);
        let audio_node = this.createNode(frequency, Math.max(note.start, audio.Context.currentTime), note.end, note.vel, note.pan);

        audio_node.id = note_id;

        let node = {
            node: audio_node,
            start: note.start,
            end: note.end,
            id: note_id
        };

        note_state.future_nodes.push(node);

        let setActiveTimeout = new utils.CancellableTimeout(() => {
            this.setActiveNodeFromFuture(note.pitch.value, node);
        }, note.start, true);

        setActiveTimeout.id = note_id;

        this._addInternalTimeout(setActiveTimeout);

        audio_node.connect(this.entryNode);

        return {
            cancel: () => {
                this.terminateSource(note_id)
            },
            id: note_id
        };
    }

    terminateTimeout(id) {
        for (let i = 0; i < this.internal_timeouts.length; i++) {
            let timeout = this.internal_timeouts[i];

            if (timeout.id === id) {
                timeout.cancel();
                this.internal_timeouts.splice(i--, 0);
            }
        }
    }

    terminateSource(id) {
        for (let i = 0; i < 128; i++) {
            let state = this.getNoteState(i);

            for (let j = 0; j < state.future_nodes.length; j++) {
                let note = state.future_nodes[j];

                if (note.id === id) {
                    note.destroy();
                    state.future_nodes.splice(j--, 0);
                }
            }
        }
    }

    terminateNote(id) {
        this.terminateTimeout(id);
        this.terminateSource(id);
    }

    playPitch(pitch, vel = 1, pan = 0) {
        let node = this.createNode(
            this.pitch_mapping.transform(pitch),
            audio.Context.currentTime,
            Infinity,
            vel, pan);

        let note_id = utils.getID();
        node.id = note_id;

        node.connect(this.entryNode);

        this.setLongActiveNode(pitch.value, node);

        return {
            cancel: () => {
                this.terminateNote(note_id);
            },
            id: note_id
        };
    }

    releasePitch(pitch) {
        let note = this.getActiveNote(pitch.value);
        if (note) {
            note.node.release();
            note.end = -1;
        }
    }

    cancelAll() {
        for (let i = 0; i < this.internal_timeouts.length; i++) {
            this.internal_timeouts[i].cancel();
        }

        for (let i = 0; i < this.note_states.length; i++) {
            let state = this.note_states[i];

            if (state.active_note)
                state.active_note.node.destroy();
            state.active_note = null;

            for (let j = 0; j < state.future_nodes.length; j++)
                state.future_nodes[j].node.destroy();

            state.future_nodes = [];
        }
    }

    releaseAll() {
        for (let i = 0; i < 128; i++) {
            try {
                this.releasePitch(i);
            } catch (e) {}
        }
    }

    createNode(pitch, start, end, vel, pan) {
        let osc = audio.Context.createOscillator();

        osc.frequency.value = pitch;
        osc.start(start);
        osc.stop(end);

        return {
            node: osc
        };
    }

    iterateOverNodes(func) {
        for (let i = 0; i < this.note_states.length; i++) {
            let state = this.note_states[i];

            if (state.active_note)
                func(state.active_note);
            for (let j = 0; j < state.future_nodes.length; j++) {
                func(state.future_nodes[j]);
            }
        }
    }

    setPitchMapping(mapping) {
        this.pitch_mapping = (mapping instanceof PitchMapping) ? mapping : new PitchMapping(mapping);
    }

    destroy() {
        this.cancelAll();
        clearInterval(this._timeout_interval);
        clearInterval(this._active_note_remover);
        this.enableKeyboardPlay = false;
    }
}


export {PitchedInstrument};