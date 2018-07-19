import * as audio from "./audio.js";

/*
General node class with input and output
*/
class Node {
    constructor() {
        this.entry = audio.Context.createGain(); // entry to node
        this.exit = audio.Context.createGain(); // exit to node
    }

    connect(x) { // connect to node
        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }
        return this;
    }

    disconnect() { // disconnect from node
        this.exit.disconnect();
        return this;
    }

    destroy() { // destroy the node TODO
        this.disconnect();
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
    }

    connect(x) { // connect to node
        if (x instanceof Node) {
            this.exit.connect(x.entry);
        } else {
            this.exit.connect(x);
        }
        return this;
    }

    disconnect() { // disconnect from node, on timeout to allow remaining render quantums
        setTimeout(() => {
            this.exit.disconnect();
        }, 50);
        return this;
    }

    destroy() { // destroy the node
        this.disconnect();
    }

    connectToMaster() { // connect to master
        this.connect(audio.masterEntryNode);
    }
}

/*
node with no output
*/
class EndingNode {
    constructor() {
        this.entry = audio.Context.createGain();
    }

    connectFrom(c) { // connect from input node
        c.connect(this.entry);
    }
    
    connectFromMaster() { // connect from master node
        this.connectFrom(audio.masterEntryNode);
    }
}

export {Node, SourceNode, EndingNode};
