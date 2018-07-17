let lowpass_filter = TONES.Context.createBiquadFilter();

lowpass_filter.type = "lowpass";
lowpass_filter.frequency.setValueAtTime(2048, 0);

let instrument = new TONES.SimpleInstrument({
    unison: 8,
    detune: 20,
    blend: 0.5,
    waveform: "square"
});

instrument.connect(lowpass_filter);
instrument.enableKeyboardPlay();

let reverb = new TONES.Reverb();

lowpass_filter.connect(reverb.entry);
reverb.connect(TONES.masterEntryNode);

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

document.getElementById("dry_input").oninput = function() {
    let value = this.value / 100;
    reverb.dry.value = value;
};

document.getElementById("wet_input").oninput = function() {
    let value = this.value / 100;
    reverb.wet.value = value;
};

let reader = new TONES.ScalaReader(function(scalaFile) {
    scale = TONES.sclFileToScale(scalaFile);
    tParams.scale = scale;
    refreshInst();
}, {domElement: document.getElementById("scala_file_input")});

let BASS_1 = "(G2{d:e,v:0.5}D3G3){d:1.3*e}R{d:-0.3*e}";
let BASS_2 = "(F2{d:e,v:0.5}C3F3){d:1.3*e}R{d:-0.3*e}";
let BASS_3 = "(Eb2{d:e,v:0.5}Bb2Eb3){d:1.3*e}R{d:-0.3*e}";
let MIDDLE_TUNE = "(A3{d:q,v:0.7}B3D4){d:e}G4R{d:-e}";
let MIDDLE_TUNE_2 = "(A3{d:q,v:0.7}Bb3D4){d:e}G4R{d:-e}";
let MIDDLE_TUNE_3 = "(A3{d:q,v:0.7}C4D4){d:e}G4R{d:-e}";
let HIGH_FOURTH = "[D6G6]{d:e,v:1}R{d:-h}";

let note_group = TONES.parseAbbreviatedGroup(`
${BASS_1}
${MIDDLE_TUNE}
${BASS_1}
${HIGH_FOURTH}
R{d:w}
${BASS_2}
${MIDDLE_TUNE}
${BASS_2}
${HIGH_FOURTH}
R{d:h+q}
D3{d:q,v:0.5}
${BASS_1}
${MIDDLE_TUNE}
${BASS_1}
${HIGH_FOURTH}
R{d:w}
${BASS_2}
${MIDDLE_TUNE}
${BASS_2}
${HIGH_FOURTH}
R{d:w}
${BASS_3}
${MIDDLE_TUNE_2}
${BASS_3}
${HIGH_FOURTH}
R{d:w}
${BASS_2}
${MIDDLE_TUNE_3}
${BASS_2}
${HIGH_FOURTH}
`);

function playDDD() {
    instrument.cancelAll();
    let time_context = new TONES.TimeContext(140, TONES.Context.currentTime + 0.3);
    note_group.schedule(instrument, time_context);
}