let Context;

try {
    Context = new (window.AudioContext || window.webkitAudioContext)(); // Create Web Audio Context

    Context.createStereoPanner(); // we need these
    Context.createConstantSource();
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

/* Remove some nodes after an absolute timeout */
function removeNodesTimeoutAbsolute(nodes, timeout) {
    return setTimeoutAbsoluteAudioCtx(() => {
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

/* Class representing an AudioContext timeout allowing note_timeouts to be scheduled very precisely */
class ContextTimeout {
    constructor(node, time, func) {
        this.node = node;
        this.time = time;

        this.node.onended = () => {
            func();
            node.disconnect();
        };

        this.cancelled = false;
    }

    ended() {
        return Context.currentTime > this.time || this.cancelled;
    }

    cancel() {
        this.node.onended = (x => null);
        this.node.stop();
        this.node.disconnect();
        this.cancelled = true;
    }
}

/* Set an audio context timeout offset from the current time */
function setTimeoutAudioCtx(func, time_delta) {
    let timingNode = Context.createOscillator();
    let curr = Context.currentTime;

    timingNode.start(curr + time_delta);
    timingNode.stop(curr + time_delta);

    timingNode.connect(Context.destination);

    return new ContextTimeout(timingNode, curr + time_delta, func); // Returns a cancelable ContextTimeout object
}

/* Set an audio context timeout offset from AudioContext time 0 */
function setTimeoutAbsoluteAudioCtx(func, audioCtxTime) {
    let timingNode = Context.createOscillator();

    timingNode.start(audioCtxTime);
    timingNode.stop(audioCtxTime);

    timingNode.connect(Context.destination);

    return new ContextTimeout(timingNode, audioCtxTime, func); // Returns a cancelable ContextTimeout object
}

/* Get an audio buffer from a URL */
function getAudioBuffer(url, onerror = console.error) {
    return new Promise((resolve, reject) => fetch(url).then((response) => {
        if (response.status !== 200)
            throw new Error("Status not 200");

        response.arrayBuffer().then((buffer) => {
            resolve(Context.decodeAudioData(buffer));
        });
    }).catch((error) => {
        reject(error);
    }));
}

export {
    Context,
    masterEntryNode as master,
    masterGainNode as masterGain,
    masterAnalyzerNode as masterAnalyzer,
    setMasterGain,
    mute as masterMute,
    unmute as masterUnmute,
    chainNodes,
    contextTime,
    setTimeoutAudioCtx as setTimeout,
    setTimeoutAbsoluteAudioCtx as setTimeoutAbsolute,
    voidNode,
    ContextTimeout,
    removeNodesTimeout,
    getAudioBuffer,
    contextTime as now
}


