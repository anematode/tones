import * as audio from "./audio.js";
import * as utils from "../utils.js";

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
            this.stop(time);
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
            this.stop(time);
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

/*
Parameter manipulation node
 */
class ParameterValue {
    constructor(value = 0) {
        this.node = audio.Context.createConstantSource();
        this.value = this.node.offset;

        if (value !== undefined)
            this.value.value = value;

        this.node.start();
    }

    connect(node) {
        this.node.connect(node.entry || node);
    }

    disconnect(node) {
        if (!node)
            this.node.disconnect();
        else
            this.node.disconnect(node.entry || node);
    }

    stop(time) {
        clean_up(time)(this);
    }

    get isParameterValue() {
        return true;
    }
}

const clean_up = time => x => {
    if (x.isParameterValue) {
        x.node.stop(time);
        x.node.connect(audio.voidNode);

        x.node.onended = () => {
            x.node.disconnect();
        }
    }
};

class ParameterMultiply {
    constructor(x, a) {
        this.a_node = (a.connect) ? a : new ParameterValue(a);
        this.x_node = (x.connect) ? x : new ParameterValue(x);

        this.exit = audio.Context.createGain();
        this.exit.gain.value = 0;

        this.a_node.connect(this.exit.gain);
        this.x_node.connect(this.exit);

        this.a = this.a_node.isParameterValue ? this.a_node.value : this.a_node;
        this.x = this.x_node.isParameterValue ? this.x_node.value : this.x_node;
    }

    connect(node) {
        this.exit.connect(node.entry || node);
    }

    disconnect(node) {
        if (!node)
            this.exit.disconnect();
        else
            this.exit.disconnect(node.entry || node);
    }

    stop(time) {
        [this.a_node, this.x_node].forEach(clean_up(time));
    }
}

/*
Parameter linear node
 */
class LinearParameterTransform {
    constructor(x, a, b) {
        // transformation ax + b

        this.a_node = (a.connect) ? a : new ParameterValue(a);
        this.b_node = (b.connect) ? b : new ParameterValue(b);
        this.x_node = (x.connect) ? x : new ParameterValue(x);

        this.a_gain = audio.Context.createGain();

        this.a_gain.gain.value = 0;

        this.a_node.connect(this.a_gain.gain);
        this.x_node.connect(this.a_gain);

        this.exit = audio.Context.createGain();

        this.a_gain.connect(this.exit);
        this.b_node.connect(this.exit);

        this.a = this.a_node.isParameterValue ? this.a_node.value : this.a_node;
        this.b = this.b_node.isParameterValue ? this.b_node.value : this.b_node;
        this.x = this.x_node.isParameterValue ? this.x_node.value : this.x_node;
    }

    connect(node) {
        this.exit.connect(node.entry || node);
    }

    disconnect(node) {
        if (!node)
            this.exit.disconnect();
        else
            this.exit.disconnect(node.entry || node);
    }

    stop(time) {
        [this.a_node, this.b_node, this.x_node].forEach(clean_up(time));
    }
}

/*
Parameter add
 */
class ParameterAdd {
    constructor(x, y) {
        this.x_node = (x.connect) ? x : new ParameterValue(x);
        this.y_node = (y.connect) ? y : new ParameterValue(y);

        this.exit = audio.Context.createGain();
        this.exit.gain.value = 0;

        this.x_node.connect(this.exit);
        this.y_node.connect(this.exit);
    }

    connect(node) {
        this.exit.connect(node.entry || node);
    }

    disconnect(node) {
        if (!node)
            this.exit.disconnect();
        else
            this.exit.disconnect(node.entry || node);
    }

    stop(time) {
        [this.x_node, this.y_node].forEach(clean_up(time));
    }
}

export {Node, SourceNode, EndingNode, ParameterValue, LinearParameterTransform, ParameterAdd, ParameterMultiply};
