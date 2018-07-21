import * as audio from "./audio.js";

/*
General node class with input and output
*/
class Node {
    constructor() {
        this.entry = audio.Context.createGain(); // entry to node
        this.exit = audio.Context.createGain(); // exit to node
        this.destroyed = false;
    }

    _checkDestroyed() {
        if (this.destroyed)
            throw new Error("Node is destroyed");
    }

    isDestroyed() {
        return this.destroyed;
    }

    connect(x) { // connect to node
        this._checkDestroyed();

        if (this._connect) {
            this._connect(x);
        }

        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else if (x instanceof EndingNode) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }
        return this;
    }

    disconnect(x) { // disconnect from node
        this._checkDestroyed();

        if (this._disconnect) {
            this._disconnect(x);
        }

        if (!x) {
            this.exit.disconnect();
        } else if (x instanceof Node) {
            this.exit.disconnect(x.entry);
        } else if (x instanceof EndingNode) {
            this.exit.disconnect(x.entry);
        } else {
            this.exit.disconnect(x);
        }

        return this;
    }

    destroy() {
        if (this.isDestroyed()) {
            return;
        }

        if (this._destroy) {
            this._destroy();
        }

        try {
            this.stop();
        } catch (e) {}

        this.disconnect();
        this.connect(audio.voidNode); // allow further render quantums so the stop call propagates

        setTimeout(() => {
            this.exit.disconnect();
        }, 1000); // Disconnect it later

        this.destroyed = true;
    }

    connectToMaster() { // connect the node to master
        this.connect(audio.masterEntryNode);
    }
}

/*
Node with no input producing audio
*/
class SourceNode {
    constructor() {
        this.exit = audio.Context.createGain();
        this.destroyed = false;
    }

    _checkDestroyed() {
        if (this.destroyed)
            throw new Error("Node is destroyed");
    }

    isDestroyed() {
        return this.destroyed;
    }

    connect(x) { // connect to node
        this._checkDestroyed();

        if (this._connect) {
            this._connect(x);
        }

        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else if (x instanceof EndingNode) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }

        return this;
    }

    disconnect(x) { // disconnect from node
        this._checkDestroyed();

        if (this._disconnect) {
            this._disconnect(x);
        }

        if (!x) {
            this.exit.disconnect();
        } else if (x instanceof Node) {
            this.exit.disconnect(x.entry);
        } else if (x instanceof EndingNode) {
            this.exit.disconnect(x.entry);
        } else {
            this.exit.disconnect(x);
        }

        return this;
    }

    destroy() { // destroy the node

        if (this.isDestroyed()) {
            return;
        }

        if (this._destroy) {
            this._destroy();
        }

        try {
            this.stop();
        } catch (e) {}

        this.disconnect();
        this.connect(audio.voidNode); // allow further render quantums so the stop call propagates

        setTimeout(() => {
            this.exit.disconnect();
        }, 1000); // Disconnect it later

        this.destroyed = true;
    }

    connectToMaster() { // connect to master
        return this.connect(audio.masterEntryNode);
    }
}

/*
node with no output
*/
class EndingNode {
    constructor() {
        this.entry = audio.Context.createGain();
        this.source = null;
    }

    connectFrom(node) { // connect from input node
        node.connect(this.entry);
        this.source = node;
    }
    
    connectFromMaster() { // connect from master node
        this.connectFrom(audio.masterEntryNode);
    }

    disconnectFrom() { // disconnect from node
        this.source.disconnect(this.entry);
    }
}

export {Node, SourceNode, EndingNode};
