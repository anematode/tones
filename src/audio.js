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
        nodes[i].connect(nodes[i+1]);
    }
}

const masterEntryNode = Context.createChannelMerger();
const masterGainNode = Context.createGain();
const masterAnalyzerNode = Context.createAnalyser();

chainNodes([
    masterEntryNode,
    masterGainNode,
    masterAnalyzerNode,
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

function setTimeoutAudioCtx(func, time_delta) {
    let timingNode = Context.createOscillator();
    let curr = Context.currentTime;

    timingNode.start(curr + time_delta);
    timingNode.stop(curr + time_delta);
    timingNode.onended = func;

    timingNode.connect(Context.destination);
}

function setTimeoutAbsoluteAudioCtx(func, audioCtxTime) {
    let timingNode = Context.createOscillator();
    let curr = Context.currentTime;

    timingNode.start(audioCtxTime);
    timingNode.stop(audioCtxTime);
    timingNode.onended = func;

    timingNode.connect(Context.destination);
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
    setTimeoutAbsoluteAudioCtx as setTimeoutAbsolute
}


