let instrument = new TONES.SimpleInstrument({
    unison: 10,
    detune: 60,
    blend: 0.3,
    waveform: "square"
});

instrument.connect(TONES.masterEntryNode);

instrument.enableKeyboardPlay();

let tParams = {
    scale: TONES.Scales.ET12,
    baseNote: TONES.KeyboardPitches.A4,
    baseFrequency: 440,
    unison: 10,
    detune: 60,
    blend: 0.3,
    waveform: "square",
    attack: 0.09,
    decay: 0,
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

            
unik.change = function() {
    let val = Math.floor(unik.v * 15) + 1;
    unii.set(val);
    tParams.unison = val;
    refreshInst();
}

detk.change = function() {
    let val = detk.v * 200;
    deti.set(Math.round(val));
    tParams.detune = val;
    refreshInst();
};

blek.change = function() {
    let val = blek.v;
    blei.set(Math.round(val * 100));
    tParams.blend = val;
    refreshInst();
};

atts.change = function() {
    let val = Math.pow(2, 5 * atts.v / 4) - 1;
    atti.set(Math.round(val * 100));
    tParams.attack = val;
    refreshInst();
};

decs.change = function() {
    let val = Math.pow(2, 7 * decs.v / 4) - 0.99;
    deci.set(Math.round(val * 100));
    tParams.decay = val;
    refreshInst();
};

suss.change = function() {
    let val = suss.v;
    susi.set(Math.round(val * 100));
    tParams.sustain = val;
    refreshInst();
};

rels.change = function() {
    let val = Math.pow(2, 7 * rels.v / 4) - 0.99;
    reli.set(Math.round(val * 100));
    tParams.release = val;
    refreshInst();
};

let BASS_1 = "(G2{d:e,v:0.5}D3G3){d:1.3*e}R{d:-0.3*e}";
let BASS_2 = "(F2{d:e,v:0.5}C3F3){d:1.3*e}R{d:-0.3*e}";
let BASS_3 = "(Eb2{d:e,v:0.5}Bb2Eb3){d:1.3*e}R{d:-0.3*e}";
let MIDDLE_TUNE = "(A3{d:q,v:0.7}B3D4){d:e}G4R{d:-e}";
let MIDDLE_TUNE_2 = "(A3{d:q,v:0.7}Bb3D4){d:e}G4R{d:-e}";
let MIDDLE_TUNE_3 = "(A3{d:q,v:0.7}C4D4){d:e}G4R{d:-e}";
let HIGH_FOURTH = "[D6G6]{d:e,v:1}R{d:-h}";

let strn = `
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
`;

let note_group = TONES.parseAbbreviatedGroup(strn);

function playDDD() {
    instrument.cancelAll();
    let time_context = new TONES.TimeContext(140, TONES.Context.currentTime + 0.3);
    note_group.schedule(instrument, time_context);
}

let downsampler = new TONES.Downsampler();

downsampler.connectFrom(TONES.masterEntryNode);