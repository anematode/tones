import * as audio from "./audio.js";

class Filter {
    constructor() {
        this.entryNode = audio.Context.createGain();
        this.exitNode = audio.Context.createGain();
    }

    connect(x) {
        this.exitNode.connect(x);
    }

    disconnect() {
        this.exitNode.disconnect();
    }

    connectFrom(p) {
        p.connect(this.entryNode);
    }
}