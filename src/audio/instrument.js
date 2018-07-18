import * as audio from "./audio.js";
import {SourceNode} from "./node.js";

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

        if (parameters.destinationNode)
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

    mute() {
        this.previousVolume = this.volume;
        this.setVolume(0);
    }

    unmute() {
        this.setVolume(this.volume);
    }
}

export { Instrument };