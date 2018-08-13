let instrument = new TONES.Sampler();
instrument.enableKeyboardPlay();

instrument.connect(TONES.master);

instrument.loadFromURL("/src/music/samples/clap1.wav");