let lowpass_filter = TONES.Context.createBiquadFilter();

lowpass_filter.type = "lowpass";
lowpass_filter.frequency.setValueAtTime(2000, 0);

lowpass_filter.connect(TONES.masterEntryNode);

let instrument = new TONES.SimpleInstrument(TONES.getDefaultKeyboardDict());//, lowpass_filter);

instrument.enableKeyboardPlay();

//let editor = new TONES.EnvelopeEditor(document.getElementById("envelope"));*/