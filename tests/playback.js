let udder = new TONES.PitchedInstrument();

let scheduler = udder.schedule(new TONES.KeyboardNote({pitch: "A4", start: 2, duration: 0.05}));
udder.schedule(new TONES.KeyboardNote({pitch: "B4", start: 2.05, duration: 0.05}));
udder.schedule(new TONES.KeyboardNote({pitch: "C5", start: 2.1, duration: 1}));
