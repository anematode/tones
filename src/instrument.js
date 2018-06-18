import * as audio from "./audio.js";

class Instrument {
    constructor(destinationNode = audio.masterEntryNode) {
        this.gainNode = audio.Context.createGain();
        this.analyzerNode = audio.Context.createAnalyser();
        this.entryNode = audio.Context.createChannelMerger();
        this.destinationNode = destinationNode;

        audio.chainNodes([
            this.entryNode,
            this.gainNode,
            this.analyzerNode,
            destinationNode
        ]);

        this.previousVolume = null;
    }

    set volume(gain) {
        this.gainNode.gain = gain;
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