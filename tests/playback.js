let svg = new TONES.SVGContext("svg_test");

let group = svg.addGroup();

let rect = new TONES.Rectangle(group, {width: 400, height: 200, fill: "#eee"});
let circle = new TONES.Circle(group, {r: 10, cx: 30, cy: 30, fill: "#333"});

let point = new TONES.Circle(group, {r: 5, fill: "#f00"});

let rotation = new TONES.Rotation(0, 200, 100);

group.addTransform(rotation);
group.addTransform(new TONES.MatrixTransform(1, 1, 0, 1, 0, 0));

function rotate() {
    rotation.a += 5;
    [point.cx, point.cy] = group.applyInverseTransform(0, 0);

    requestAnimationFrame(rotate);
}

rotate();