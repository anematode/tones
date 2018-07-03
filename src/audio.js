let Context;

try {
    Context = new (window.AudioContext || window.webkitAudioContext)(); // Create Web Audio Context
} catch (e) {
    alert("Your browser doesn't support the Web Audio API; audio functionality will be impaired.");
    console.warn("The browser does not support the Web Audio API; audio functionality will be impaired.");
    // TODO: Add popup?
}

/* Chain an array of nodes together in succession */
function chainNodes(nodes) {
    for (let i = 0; i < nodes.length - 1; i++) {
        nodes[i].connect(nodes[i + 1]);
    }
}

/* Remove some nodes after a timeout */
function removeNodesTimeout(nodes, timeout) {
    return setTimeoutAudioCtx(() => {
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].disconnect();
        }
    }, timeout);
}

const masterEntryNode = Context.createGain();        // Entry node for instruments + effects
const masterGainNode = Context.createGain();         // Master gain node
const masterAnalyzerNode = Context.createAnalyser(); // Analyzer node to look at whole waveform

chainNodes([
    masterEntryNode,
    masterGainNode,
    Context.destination
]);

masterGainNode.connect(masterAnalyzerNode);

const voidNode = Context.createChannelMerger();      // Used to keep nodes alive
const voidGainNode = Context.createGain();
voidGainNode.gain.setValueAtTime(0, 0);

chainNodes([
    voidNode,
    voidGainNode,
    Context.destination
]);

/* Set master gain value */
function setMasterGain(gain) {
    masterGainNode.gain.value = gain;
}

let previousVolume;

function mute() { // mute
    previousVolume = masterGainNode.gain;
    setMasterGain(0);
}

function unmute() { // unmute
    setMasterGain(previousVolume);
}

function contextTime() { // AudioContext time
    return Context.currentTime;
}

/* Class representing an AudioContext timeout allowing timeouts to be scheduled very precisely */
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

/* Set an audio context timeout offset from the current time */
function setTimeoutAudioCtx(func, time_delta) {
    let timingNode = Context.createOscillator();
    let curr = Context.currentTime;

    timingNode.start(curr + time_delta);
    timingNode.stop(curr + time_delta);
    timingNode.onended = func;

    timingNode.connect(Context.destination);

    return new ContextTimeout(timingNode, curr + time_delta); // Returns a cancelable ContextTimeout object
}

/* Set an audio context timeout offset from AudioContext time 0 */
function setTimeoutAbsoluteAudioCtx(func, audioCtxTime) {
    let timingNode = Context.createOscillator();

    timingNode.start(audioCtxTime);
    timingNode.stop(audioCtxTime);
    timingNode.onended = func;

    timingNode.connect(Context.destination);

    return new ContextTimeout(timingNode, audioCtxTime); // Returns a cancelable ContextTimeout object
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
    ContextTimeout,
    removeNodesTimeout
}


