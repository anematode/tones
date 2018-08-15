let eq = new TONES.ParametricEQ();

let instrument = new TONES.SimpleInstrument({
    unison: 8,
    detune: 20,
    blend: 0.5,
    waveform: "square"
});

instrument.connect(eq);
instrument.enableKeyboardPlay();

let reverb = new TONES.Reverb({decay: 4});
let delay = new TONES.Delay({delay: 60/140 * 2/2, loss: 0.3});

eq.connect(delay.entry);
delay.connect(reverb);
reverb.connect(TONES.master);

let tParams = {
    scale: TONES.Scales.ET12,
    baseNote: TONES.KeyboardPitches.A4,
    baseFrequency: 440,
    unison: 8,
    detune: 20,
    blend: 0.5,
    waveform: "square",
    attack: 0.01,
    decay: 1,
    sustain: 0.2,
    release: 0.1
};

function refreshInst() {
    let keyboardPlay = instrument.keyboardPlayEnabled;

    instrument.params.unison = tParams.unison;
    instrument.params.detune.value = tParams.detune;
    instrument.params.blend.value = tParams.blend;
    instrument.waveform = tParams.waveform;

    instrument.pitch_mapping = TONES.pitchMappingFromScale(tParams.scale, tParams.baseNote, tParams.baseFrequency);

    let a = new TONES.LinearEnvelopeSegment([0,0], [tParams.attack,1]);
    let b = new TONES.LinearEnvelopeSegment(a.p2, [tParams.decay + tParams.attack, tParams.sustain]);
    let attack_env = new TONES.Envelope([a,b]);

    instrument.params.attack_envelope = attack_env;
    instrument.params.release_length = tParams.release;
}

let baseNoteInput = document.getElementById("base_note_input");
let baseFrequencyInput = document.getElementById("base_frequency_input");
let unisonInput = document.getElementById("unison_input");
let detuneInput = document.getElementById("detune_input");
let blendInput = document.getElementById("blend_input");
let harmonicInput = document.getElementById("harmonic_input");

harmonicInput.oninput = function (evt) {
    tParams.waveform = "custom";
    let value = this.value;

    ["sine", "square", "sawtooth", "triangle"].forEach(x => document.getElementById(x).disabled = !!value);

    if (!value)
        document.querySelector("input[name=\"waveform\"]:checked").onclick();

    let nums = [0, ...value.split(',').map(x => (parseFloat(x.trim())))];

    let invalidate = () => {
        this.style.backgroundColor = "#FA8072";
    };

    if (nums.length < 2 && value)
        return invalidate();

    for (let i = 0; i < nums.length; i++)
        if (isNaN(nums[i]))
            return invalidate();

    this.style.backgroundColor = "#FFF";

    instrument.setWave(nums.map(() => 0), nums);
};

document.getElementById("sine").onclick = function() {
    tParams.waveform = "sine";
    refreshInst();
};

document.getElementById("square").onclick = function() {
    tParams.waveform = "square";
    refreshInst();
};

document.getElementById("sawtooth").onclick = function() {
    tParams.waveform = "sawtooth";
    refreshInst();
};

document.getElementById("triangle").onclick = function() {
    tParams.waveform = "triangle";
    refreshInst();
};

baseNoteInput.oninput = function(evt) {
    let value = this.value;

    try {
        tParams.baseNote = TONES.makeKeyboardPitch(value);

        baseFrequencyInput.value = tParams.baseNote.twelveTETFrequency().toFixed(5);
        tParams.baseFrequency = tParams.baseNote.twelveTETFrequency();

        refreshInst();
        this.style.backgroundColor = "#FFFFFF";

    } catch (e) {
        this.style.backgroundColor = "#FA8072";
    }
};

baseFrequencyInput.oninput = function(evt) {
    let value = this.value;

    if (value > 0) {
        tParams.baseFrequency = value;
        refreshInst();
        this.style.backgroundColor = "#FFFFFF";
    } else {
        this.style.backgroundColor = "#FA8072";
    }
};

unisonInput.oninput = function(evt) {
    tParams.unison = parseFloat(this.value);

    refreshInst();
};

detuneInput.oninput = function(evt) {
    tParams.detune = parseFloat(this.value) / 10;
    refreshInst();
};

blendInput.oninput = function(evt) {
    tParams.blend = parseFloat(this.value) / 1000;
    refreshInst();
};

baseFrequencyInput.onblur = baseNoteInput.onblur = unisonInput.onblur = harmonicInput.onblur = function () {
    instrument.enableKeyboardPlay();
};

baseFrequencyInput.onfocus = baseNoteInput.onfocus = unisonInput.onfocus = harmonicInput.onfocus = function () {
    instrument.disableKeyboardPlay();
};

document.getElementById("lowpass_input").oninput = function() {
    let value = Math.pow(2, this.value / 10);

    eq.F0.frequency.value = value;
};

document.getElementById("lowpass_input_value").oninput = function() {
    let value = 5 * (this.value / 50 - 1);

    eq.F0.gain.value = value;
};

document.getElementById("attack_input").oninput = function() {
    let value = Math.pow(2, this.value / 400) - 1;
    tParams.attack = value;
    refreshInst();
};

document.getElementById("decay_input").oninput = function() {
    let value = Math.pow(2, this.value / 400) - 1;
    tParams.decay = value;
    refreshInst();
};

document.getElementById("sustain_input").oninput = function() {
    let value = this.value / 100;
    tParams.sustain = value;
    refreshInst();
};

document.getElementById("release_input").oninput = function() {
    let value = Math.pow(2, this.value / 400) - 1;
    tParams.release = value;
    refreshInst();
};

document.getElementById("dry_input").oninput = function() {
    let value = this.value / 100;
    reverb.dry.value = value;
};

document.getElementById("wet_input").oninput = function() {
    let value = this.value / 100;
    reverb.wet.value = value;
};

let reader = new TONES.ScalaReader(function(scale) {
    tParams.scale = scale.scale;
    refreshInst();
}, {domElement: document.getElementById("scala_file_input")});

let BASS_1 = "Fs3{d:s,v:1}Cs4{v:0.5}Cs4Cs4Cs4Cs4";

let strn = `
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
${BASS_1}
`;

let note_group = TONES.parseAbbreviatedGroup(strn);

function playDDD() {
    instrument.cancelAll();
    let time_context = new TONES.TimeContext(200, TONES.Context.currentTime + 0.3);
    note_group.schedule(instrument, time_context);
}

let g_canvas = document.getElementById("canv");

let transformation = TONES.stretchToCanvas(g_canvas, 0, 1000, 3, 0);
let grapher = new TONES.ArrayGrapher({
    domElement: g_canvas,
    transformation: transformation
});

let x_before = [...Array(1000).keys()];
let x = x_before.map(x => Math.pow(2, x * 15 / 1000 + 1));

function drawEQ() {
    let resp = eq.getMagnitudeResponse(x);
    grapher.drawLineSegments(x_before, resp);
    requestAnimationFrame(drawEQ);
}

drawEQ();

let svg = new TONES.SVGContext("svg1");

let visualizers = [];

visualizers.push(new TONES.SVGLevelVisualizer(svg, {orient: "up", x: 0, y: 0, width: 100, height: 700}));

for (let i = 0; i < 13; i++) {
    visualizers.push(new TONES.SVGLevelVisualizer(svg, {
        orient: (i % 2 === 0) ? "right" : "left",
        x: 120,
        y: 54 * i,
        width: 200,
        height: 50,
        show_decibels: false
    }));
}

visualizers.forEach(x => TONES.master.connect(x.entry));

setTimeout(() => {
    visualizers.forEach(x => x.start());
}, 1000);
