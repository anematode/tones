let Context;

try {
    Context = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    alert("Your browser doesn't support the Web Audio API; audio functionality will be impaired.");
    console.warn("The browser does not support the Web Audio API; audio functionality will be impaired.");
    // TODO: Add popup?
}

function chainNodes(nodes) {
    for (let i = 0; i < nodes.length - 1; i++) {
        nodes[i].connect(nodes[i + 1]);
    }
}

const masterEntryNode = Context.createChannelMerger();
const masterGainNode = Context.createGain();
const masterAnalyzerNode = Context.createAnalyser();

const voidNode = Context.createChannelMerger();
const voidGainNode = Context.createGain();
voidGainNode.gain.setValueAtTime(0, 0);

chainNodes([
    masterEntryNode,
    masterGainNode,
    masterAnalyzerNode,
    Context.destination
]);

chainNodes([
    voidNode,
    voidGainNode,
    Context.destination
]);

function setMasterGain(gain) {
    masterGainNode.gain = gain;
}

let previousVolume;

function mute() {
    previousVolume = masterGainNode.gain;
    setMasterGain(0);
}

function unmute() {
    setMasterGain(previousVolume);
}

function contextTime() {
    return Context.currentTime;
}

class ContextTimeout {
    constructor(node, time) {
        this.node = node;
        this.time = time;
    }

    ended() {
        return Context.currentTime < this.time;
    }

    cancel() {
        this.node.onended = (x => null);
        this.node.stop();
    }
}

function setTimeoutAudioCtx(func, time_delta) {
    let timingNode = Context.createOscillator();
    let curr = Context.currentTime;

    timingNode.start(curr + time_delta);
    timingNode.stop(curr + time_delta);
    timingNode.onended = func;

    timingNode.connect(Context.destination);

    return new ContextTimeout(timingNode, curr + time_delta);
}

function setTimeoutAbsoluteAudioCtx(func, audioCtxTime) {
    let timingNode = Context.createOscillator();

    timingNode.start(audioCtxTime);
    timingNode.stop(audioCtxTime);
    timingNode.onended = func;

    timingNode.connect(Context.destination);

    return new ContextTimeout(timingNode, audioCtxTime);
}

export {
    Context,
    masterEntryNode,
    masterGainNode,
    masterAnalyzerNode,
    setMasterGain,
    mute as masterMute,
    unmute as masterUnmute,
    chainNodes,
    contextTime,
    setTimeoutAudioCtx as setTimeout,
    setTimeoutAbsoluteAudioCtx as setTimeoutAbsolute,
    voidNode,
    ContextTimeout
}


