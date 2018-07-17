import * as audio from "./audio.js";

class Node {
    constructor(context) {
        this.context = context || audio.Context;
        this.entry = this.context.createGain();
        this.exit = this.context.createGain();
    }

    connect(x) {
        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }
        return this;
    }

    disconnect() {
        this.exit.disconnect();
        return this;
    }

    destroy() {
        this.disconnect();
    }

    connectToMaster() {
        this.connect(audio.masterEntryNode);
    }
}

class SourceNode {
    constructor(context) {
        this.context = context || audio.Context;
        this.exit = this.context.createGain();
    }

    connect(x) {
        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }
        return this;
    }

    disconnect() {
        setTimeout(function() {
            this.exit.disconnect();
        }, 100);
        return this;
    }

    destroy() {
        this.disconnect();
    }

    connectToMaster() {
        this.connect(audio.masterEntryNode);
    }
}

class EndingNode {
    constructor(context) {
        this.context = context || audio.Context;
        this.entry = this.context.createGain();
    }

    connectFrom(c) {
        c.connect(this.entry);
    }
}

export {Node, SourceNode, EndingNode};