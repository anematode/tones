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

    add() {
        let c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c1.style.cx = this.cx;
        c1.style.cy = this.cy;
        c1.style.r = this.r;
        c1.style.fill = '#999';
        this.svg.appendChild(c1);

        this.addArc(this.cx, this.cy, this.r, this.t * Math.PI * 2, this.c);

        let c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c2.style.cx = this.cx;
        c2.style.cy = this.cy;
        c2.style.r = this.r - 1;
        c2.style.fill = '#666';
        this.svg.appendChild(c2);

        let r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r1.style.x = this.cx - 0.5;
        r1.style.y = this.cy + this.r - this.r / 2;
        r1.style.width = 1;
        r1.style.height = this.r / 2;
        r1.style.fill = this.c;
        r1.setAttribute('transform', 'rotate(' + this.t * 360 + ' ' + this.cx + ' ' + this.cy + ')');
        this.svg.appendChild(r1);
    }
}