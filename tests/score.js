let score = new TONES.Score("svg_test", {
    staffs: 2,
    systems: 3
});

score.system(0).leftMargin = 20;
score.system(0).addMeasures(3);

score.system(0).measure(0).staff(0).addElements({class: "clef", type: "treble", offset_x: 20});
score.system(0).measure(0).staff(1).addElements({class: "clef", type: "bass", offset_x: 23.5});

//let staff = score.staff(0);
//staff.addMeasure()