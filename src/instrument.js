import * as audio from "./audio.js";

class Instrument {
    constructor() {
        this.panNode = audio.Context.createStereoPanner();
        this.gainNode = audio.Context.createGain();
        this.analyzerNode = audio.Context.createAnalyser();
        this.entryNode = audio.Context.createGain();

        audio.chainNodes([
            this.entryNode,
            this.gainNode,
            this.panNode
        ]);

        this.panNode.connect(this.analyzerNode);

        this.panNode.pan.setValueAtTime(0, 0);

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

    connect(node) {
        this.panNode.connect(node);
    }

    disconnect() {
        this.panNode.disconnect();
    }
}

export { Instrument };