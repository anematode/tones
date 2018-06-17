let a = new TONES.EnvelopeSegment([0,0], [0.01,1]);
let b = new TONES.EnvelopeSegment(a.p2, [1, 0.2], 0.4);
let c = new TONES.EnvelopeSegment(b.p2, [2.1, 0.2]);
let d = new TONES.EnvelopeSegment(c.p2, [2.3, 0], 0.1);

let tone = TONES.Context.createOscillator();
let tone_gain = TONES.Context.createGain();
tone_gain.connect(TONES.masterEntryNode);
tone.connect(tone_gain);
tone.type = 'sine';
tone_gain.gain.setValueAtTime(0, 0);
tone.start();

let e = new TONES.Envelope([a,b,c,d]);

document.getElementById("test_button").onclick = function() {
    e.apply(tone_gain.gain, TONES.EnvelopeHorizontal.offset_current_time, TONES.EnvelopeVertical.vertical_exp);

};

//let editor = new TONES.EnvelopeEditor(document.getElementById("envelope"));