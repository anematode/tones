let lowpass_filter = TONES.Context.createBiquadFilter();

lowpass_filter.type = "lowpass";
lowpass_filter.frequency.setValueAtTime(2000, 0);

lowpass_filter.connect(TONES.masterEntryNode);

let instrument = new TONES.SimpleInstrument({
    unison: 16,
    detune: 20
});

instrument.enableKeyboardPlay();

let tParams = {
    scale: TONES.Scales.ET12,
    baseNote: TONES.KeyboardPitches.A4,
    baseFrequency: 440
};

function refreshInst() {
    instrument.pitch_mapping = TONES.pitchMappingFromScale(tParams.scale, tParams.baseNote, tParams.baseFrequency);
}

document.getElementById("base_note_input").oninput = function(evt) {
    let value = this.value;
    try {
        tParams.baseNote = TONES.makeKeyboardPitch(value);
        refreshInst();
        this.style.backgroundColor = "#FFFFFF";
    } catch (e) {
        this.style.backgroundColor = "#FA8072";
    }
};

let reader = new TONES.ScalaReader(function(scalaFile) {

}, document.getElementById("scala_file_input"));
