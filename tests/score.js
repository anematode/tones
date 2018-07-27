let score = new TONES.Score("svg_test", {
    staffs: 2,
    systems: 3
});

score.system(0).leftMargin = 20;
score.system(0).addMeasures(3);

score.system(0).measure(0).staff(0).addElements({class: "clef", type: "treble"});
score.system(0).measure(0).staff(1).addElements({class: "clef", type: "bass"});
let key1 = score.system(0).measure(0).staff(0).addElements({class: "key", accidentals: [{type: "s", line: 0}]});
let key2 = score.system(0).measure(0).staff(1).addElements({class: "key", accidentals: [{type: "s", line: 1}]});
score.system(0).measure(0).staff(0).addElements({class: "time", num: "2+3+2", den: 8});
score.system(0).measure(0).staff(1).addElements({class: "time", num: "2+3+2", den: 8});

score.optimize();

//let staff = score.staff(0);
//staff.addMeasure()