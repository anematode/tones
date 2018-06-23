class Knob {
    constructor(cx, cy, r, t, c, svg) {
        this.cx = cx;
        this.cy = cy;
        this.r = r;
        this.t = t;
        this.c = c;
        this.svg = svg;
    }

    pc(r, t) {
        return {
            x: r * Math.cos(t),
            y: r * Math.sin(t)
        };
    }

    addArc(cx, cy, r, t, c) {
        let d = this.pc(r, t - 3 * Math.PI / 2);
        let arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arc.setAttribute('d', 'M ' + (cx + d.x) + ' ' + (cy + d.y) + ' A ' + r + ' ' + r + ' 0 ' + Math.floor(t / Math.PI) + ' 0 ' + cx + ' ' + (cy + r) + ' L ' + cx + ' ' + cy);
        arc.style.fill = c;
        this.svg.appendChild(arc);
    }

    addKnob() {
        let c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c1.style.cx = this.cx;
        c1.style.cy = this.cy;
        c1.style.r = this.r - 1;
        c1.style.fill = '#999';
        this.svg.appendChild(c1);

        this.addArc(this.cx, this.cy, this.r, this.t * Math.PI * 2, this.c);

        let c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c2.style.cx = this.cx;
        c2.style.cy = this.cy;
        c2.style.r = this.r - 2;
        c2.style.fill = '#666';
        this.svg.appendChild(c2);

        let c3 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c3.style.cx = this.cx;
        c3.style.cy = this.cy + this.r - 8;
        c3.style.r = 2;
        c3.style.fill = this.c;
        c3.setAttribute('transform', 'rotate(' + this.t * 360 + ' ' + this.cx + ' ' + this.cy + ')');
        this.svg.appendChild(c3);
    }
}