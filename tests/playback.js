let osc = TONES.Context.createOscillator();
let mod_osc = TONES.Context.createOscillator();

let parameter = new TONES.ParameterMultiply(mod_osc, 20);
parameter.connect(osc.detune);

osc.connect(TONES.masterEntryNode);

let downsampler = new TONES.Downsampler({
    rate: 1,
    size: 512
});

parameter.connect(downsampler);

let canvas = document.getElementById('waveform');
let grapher = new TONES.ArrayGrapher({domElement: canvas});

grapher.transformation = TONES.stretchToCanvas(canvas, 0, 1000, -5, 5);

function drawGraph() {
    grapher.drawRange(downsampler.getData(), 0, 1000);
    requestAnimationFrame(drawGraph);
}

osc.start();
mod_osc.frequency.value = 2;
mod_osc.start();

drawGraph();