let lowpass_filter = TONES.Context.createBiquadFilter();

lowpass_filter.type = "lowpass";
lowpass_filter.frequency.setValueAtTime(2000, 0);

lowpass_filter.connect(TONES.masterEntryNode);

let instrument = new TONES.Piano({
    pitch_mapping: TONES.pitchMappingFromScale([
        16/15, 9/8, 6/5, 5/4, 4/3, 7/5, 3/2, 8/5, 5/3, 16/9, 15/8, 2/1
    ], TONES.KeyboardPitches.C3),
    unison: 16,
    detune: 20
});

instrument.enableKeyboardPlay();

let g = new TONES.Pitch(TONES.KeyboardPitches.A4);