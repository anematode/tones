import { Instrument } from "./instrument.js";
import { PitchMappings, PitchMapping } from "./pitchmapping.js";
import * as audio from "./audio.js";

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

class PitchedInstrumentNode {
    constructor(parent) {
        this.gain = audio.Context.createGain();
        this.pan = audio.Context.createStereoPanner();
        this.parent = parent;
    }

    _connect(x) {
        this.pan.connect(x);
    }

    _disconnect() {
        this.pan.disconnect();
    }
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
                active_node: null,
            };
        }

        this.internal_timeouts = [];

        this._timeout_interval = periodicClearTimeout(this.internal_timeouts);
    }

    frequencyOf(keyboardPitch) {
        return this.pitch_mapping.transform(keyboardPitch);
    }

    getNoteState(note_num) {
        return this.note_states[note_num];
    }

    getActiveNote(note_num) {
        return this.note_states[note_num].active_node;
    }

    hasEventsScheduled(note_num) {
        let state = this.getNoteState(note_num);

        return !(state.future_nodes.length === 0 && !state.active_node);
    }

    predictNoteState(note_num) { // Return the predicted note state, without old_nodes
        if (!this.hasEventsScheduled(note_num)) {
            return {
                future_nodes: [],
                active_node: null
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

        if (note_state.active_node)
            note_state.active_node.node._release();

        let node_index = note_state.future_nodes.indexOf(node);
        note_state.active_node = note_state.future_nodes.splice(node_index, 1)[0];
    }

    setLongActiveNode(pitch, node) {
        let note_state = this.getNoteState(pitch);

        if (note_state.active_node)
            note_state.active_node.node._release();

        note_state.active_node = {
            node: node,
            start: audio.Context.currentTime,
            end: 1e10
        }
    }

    schedule(note, createMsBefore = 100, set_cancel_function) {
        // note is KeyboardNote
        if (note.start < audio.Context.currentTime) { // if note is old news, ignore it
            return null;
        }

        if (!createMsBefore)
            createMsBefore = 5000;

        if (note.start > audio.Context.currentTime + createMsBefore / 1e3 + 1e-3) {
            let future_timeout = null;

            let timeout = audio.setTimeoutAbsolute(() => {
                this.schedule(note, createMsBefore, x => {future_timeout = x});
            }, note.start - createMsBefore / 1e3);

            this._addInternalTimeout(timeout);

            return {
                cancel: function() {
                    timeout.cancel();

                    if (future_timeout)
                        future_timeout.cancel();
                }
            }
        }

        let frequency = this.pitch_mapping.transform(note.pitch);

        let note_state = this.getNoteState(note.pitch.value);
        let audio_node = this.createNode(frequency, note.start, note.end, note.vel, note.pan);

        let node = {
            node: audio_node,
            start: note.start,
            end: note.end
        };

        note_state.future_nodes.push(node);

        this._addInternalTimeout(audio.setTimeoutAbsolute(() => {
            this.setActiveNodeFromFuture(note.pitch.value, node);
        }, note.start));

        audio_node._connect(this.entryNode);

        let cancel_play = {
            cancel: function() {
                audio_node._destroy();
            }
        };

        if (set_cancel_function)
            set_cancel_function(cancel_play);

        return cancel_play;
    }

    playPitch(pitch, vel = 1, pan = 0) {
        let node = this.createNode(
            this.pitch_mapping.transform(pitch),
            audio.Context.currentTime,
            1e10,
            vel, pan
        );

        node._connect(this.entryNode);

        this.setLongActiveNode(pitch.value, node);
    }

    releasePitch(pitch) {
        let note = this.getActiveNote(pitch.value);
        if (note)
            note.node._release();
    }

    cancelAll() {
        for (let i = 0; i < this.internal_timeouts.length; i++) {
            this.internal_timeouts[i].cancel();
        }

        for (let i = 0; i < this.note_states.length; i++) {
            let state = this.note_states[i];

            if (state.active_note)
                state.active_note.node._destroy();
            state.active_note = null;

            for (let j = 0; j < state.future_nodes.length; j++) {
                state.future_nodes[j].node._destroy();
            }

            state.future_nodes = [];
        }
    }

    releaseAll() {
        for (let i = 0; i < 128; i++) {
            try {
                releasePitch(i);
            } catch (e) {}
        }
    }

    createNode(pitch, start, end, vel, pan) {
        let osc = audio.Context.createOscillator();

        osc.frequency.value = pitch;
        osc.start(start);
        osc.stop(end);

        return {
            node: osc,
            _connect: x => osc.connect(x),
            _disconnect: () => osc.disconnect(),
            _release: () => osc.stop(),
            _cancel: () => osc.stop(),
            _destroy: () => osc.disconnect(),
            _timeAfterRelease: () => 0
        };
    }

    iterateOverNodes(func) {
        for (let i = 0; i < this.note_states.length; i++) {
            let state = this.note_states[i];

            if (state.active_node)
                func(state.active_node);
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
        this.enableKeyboardPlay = false;

    }
}


export {PitchedInstrument, PitchedInstrumentNode};