let lowpass_filter = TONES.Context.createBiquadFilter();

lowpass_filter.type = "lowpass";
lowpass_filter.frequency.setValueAtTime(2048, 0);

lowpass_filter.connect(TONES.masterEntryNode);

let instrument = new TONES.SimpleInstrument({
    unison: 8,
    detune: 20,
    blend: 0.5,
    waveform: "square"
});

instrument.connect(lowpass_filter);
instrument.enableKeyboardPlay();

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
    instrument.detune = tParams.detune;
    instrument.blend = tParams.blend;
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

baseFrequencyInput.onblur = baseNoteInput.onblur = unisonInput.onblur = function() {
    instrument.enableKeyboardPlay();
};

baseFrequencyInput.onfocus = baseNoteInput.onfocus = unisonInput.onfocus = function () {
    instrument.disableKeyboardPlay();
};

document.getElementById("lowpass_input").oninput = function() {
    let value = Math.pow(2, this.value / 100);

    lowpass_filter.frequency.value = value;
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

let reader = new TONES.ScalaReader(function(scalaFile) {
    scale = TONES.sclFileToScale(scalaFile);
    tParams.scale = scale;
    refreshInst();
}, {domElement: document.getElementById("scala_file_input")});