import * as audio from "./audio.js";
import {SourceNode} from "./node.js";

/*
General instrument class.

panNode -> master pan of the instrument
gainNode -> master gain of the instrument
entryNode -> internal instrument sources should enter here
*/
class Instrument extends SourceNode {
    constructor(parameters) {
        super(parameters.context);

        this.panNode = audio.Context.createStereoPanner();
        this.gainNode = audio.Context.createGain();
        this.entryNode = audio.Context.createGain();

        audio.chainNodes([
            this.entryNode,
            this.gainNode,
            this.panNode,
            this.exit
        ]);

        if (parameters.destinationNode) // can specify node to connect to immediately
            this.exit.connect(parameters.destinationNode);

        this.previousVolume = null;
    }

    set volume(gain) {
        this.gainNode.gain = gain;
    }

    setVolume(volume) {
        this.volume = volume;
    }

    get volume() {
        return this.gainNode.gain;
    }

    mute() { // mute the instrument allowing unmuting to return to old volune
        this.previousVolume = this.volume;
        this.setVolume(0);
    }

    unmute() { // unmute the instrument
        this.setVolume(this.volume);
    }
}

export { Instrument };
