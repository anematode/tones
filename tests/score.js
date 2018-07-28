let score = new TONES.Score("svg_test", {
    staffs: 2,
    systems: 3
});

score.system(0).leftMargin = 20;
score.system(0).addMeasures(3);

let clef1 = score.system(0).measure(0).staff(0).addElement({class: "clef", type: "treble"});
let clef2 = score.system(0).measure(0).staff(1).addElement({class: "clef", type: "bass"});
let key1 = score.system(0).measure(0).staff(0).addElement({class: "key", accidentals: [{type: "s", line: 0}, {type: "b", line: 3}]});
let key2 = score.system(0).measure(0).staff(1).addElement({class: "key", accidentals: [{type: "s", line: 1}]});
let time1 = score.system(0).measure(0).staff(0).addElement({class: "time", num: "2+3+2", den: 8});
let time2 = score.system(0).measure(0).staff(1).addElement({class: "time", num: "2+3+2", den: 8});

let chord1 = score.system(0).measure(0).staff(1).addElement({class: "chord", notes: [{line: 0}, {line: 2}, {line: 3}], stem: "down"});
let chord2 = score.system(0).measure(0).staff(0).addElement({class: "chord", notes: [{line: 0}, {line: 2}, {line: 3}], stem: "down"});
let spacer = score.system(0).measure(0).staff(1).addElement({class: "space", width: 20});
let chord = score.system(0).measure(0).staff(1).addElement({class: "chord", notes: [{line: 3, type: "whole", accidental: "s"},{line: 5, type: "whole", accidental: "s"},{line: 4.5, type: "whole", accidental: "s"}, {line: 6.5, type: "whole", accidental: "ss"}, {line: 6, type: "whole", accidental: "n"},{line: 5.5, type: "whole", accidental: "n"}], dot_count: 3, flag: 4, stem: ""});

score.optimize();

//let staff = score.staff(0);
//staff.addMeasure()

function high(rect) {
    new TONES.Rectangle(chord, rect).addClass('highlight')
}