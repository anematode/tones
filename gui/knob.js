class Widget {
    constructor() {
        
    }
    
    circle(cx, cy, r, c) {
        let c1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c1.style.cx = cx;
        c1.style.cy = cy;
        c1.style.r = r;
        c1.style.fill = c;
        return c1;
    }
    
    rect(x, y, w, h, c) {
        let r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r1.style.x = x;
        r1.style.y = y;
        r1.style.width = w;
        r1.style.height = h;
        r1.style.fill = c;
        return r1;
    }
}

class Knob extends Widget {
    constructor(cx, cy, r, t, c, svg) {
        super();
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
        let c1 = this.circle(this.cx, this.cy, this.r, '#998');
        this.svg.appendChild(c1);

        this.addArc(this.cx, this.cy, this.r, this.t * Math.PI * 2, this.c);

        let c2 = this.circle(this.cx, this.cy, this.r - 1, '#ccb');
        this.svg.appendChild(c2);
        
        let r1 = this.rect(this.cx - 0.5, this.cy + this.r - this.r / 2, 1, this.r / 2, this.c);
        r1.setAttribute('transform', 'rotate(' + this.t * 360 + ' ' + this.cx + ' ' + this.cy + ')');
        this.svg.appendChild(r1);
    }
}

class Slider extends Widget {
    constructor(cx, cy, h, v, c, svg) {
        super();
        this.cx = cx;
        this.cy = cy;
        this.h = h;
        this.v = v;
        this.c = c;
        this.svg = svg;
    }
    
    add() {
        let r1 = this.rect(this.cx - 0.5, this.cy - this.h / 2, 1, this.h, "#998");
        this.svg.appendChild(r1);
        
        let r2 = this.rect(this.cx - 0.5, this.cy + this.h / 2 - this.v, 1, this.v, this.c);
        this.svg.appendChild(r2);
        
        let r3 = this.rect(this.cx - 10, this.cy + this.h / 2 - this.v - 5, 20, 10, "#ccb");
        r3.style.stroke = this.c;
        r3.style.rx = 2;
        this.svg.appendChild(r3);
    }
}