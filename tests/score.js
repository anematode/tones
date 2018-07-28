let score = new TONES.Score("svg_test", {
    staffs: 2,
    systems: 3
});

score.system(0).leftMargin = 20;
score.system(0).addMeasures(3);

score.system(0).measure(0).staff(0).addElements({class: "clef", type: "treble"});
score.system(0).measure(0).staff(1).addElements({class: "clef", type: "bass"});
let key1 = score.system(0).measure(0).staff(0).addElements({class: "key", accidentals: [{type: "s", line: 0}, {type: "b", line: 3}]});
let key2 = score.system(0).measure(0).staff(1).addElements({class: "key", accidentals: [{type: "s", line: 1}, {type: "b", line: 3}]});
score.system(0).measure(0).staff(0).addElements({class: "time", num: "2+3+2", den: 8});
score.system(0).measure(0).staff(1).addElements({class: "time", num: "2+3+2", den: 8});

score.system(0).measure(0).staff(1).addElement({class: "chord", notes: [{line: 0}, {line: 2}, {line: 3}], stem: "down"});
score.system(0).measure(0).staff(1).addElement({class: "space", width: 20});
let chord = score.system(0).measure(0).staff(1).addElement({class: "chord", notes: [{line: 7, type: "half"}, {line: 3}, {line: 3.5}, {line: -1.5}, {line: 6}, {line: 5.5}, {line: 0}], dot_count: 3, flag: 4, stem: "up"});

score.optimize();

//let staff = score.staff(0);
//staff.addMeasure()