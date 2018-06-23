let svg = document.getElementById('svg');

function pc(r, t) {
    return {
        x: r * Math.cos(t),
        y: r * Math.sin(t)
    };
}

function addArc(cx, cy, r, t, c) {
    let d = pc(r, t - 3 * Math.PI / 2);
    let arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arc.setAttribute('d', 'M ' + (cx + d.x) + ' ' + (cy + d.y) + ' A ' + r + ' ' + r + ' 0 ' + Math.floor(t / Math.PI) + ' 0 ' + cx + ' ' + (cy + r) + ' L ' + cx + ' ' + cy);
    arc.style.fill = c;
    svg.appendChild(arc);
}

function addKnob(cx, cy, r, t, c) {
    let a = t * Math.PI * 2;

    let c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c1.style.cx = cx;
    c1.style.cy = cy;
    c1.style.r = r - 1;
    c1.style.fill = '#999';
    svg.appendChild(c1);

    addArc(cx, cy, r, a, c);

    let c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c2.style.cx = cx;
    c2.style.cy = cy;
    c2.style.r = r - 2;
    c2.style.fill = '#666';
    svg.appendChild(c2);

    let c3 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c3.style.cx = cx;
    c3.style.cy = cy + r - 8;
    c3.style.r = 2;
    c3.style.fill = c;
    c3.setAttribute('transform', 'rotate(' + t * 360 + ' ' + cx + ' ' + cy + ')');
    svg.appendChild(c3);
}