class Widget {
    constructor(cx, cy, s, v, c, svg) {
        this.cx = cx;
        this.cy = cy;
        this.s = s;
        this.v = v;
        this.c = c;
        this.svg = svg;
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
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }

    add() {
        let c1 = this.circle(this.cx, this.cy, this.s, '#998');
        this.svg.appendChild(c1);

        
        let angle = Math.PI * (this.v * 2 - 1.5);
        let d = {
            x: this.s * Math.cos(angle),
            y: this.s * Math.sin(angle)
        };
        let arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arc.setAttribute('d', 'M ' + (this.cx + d.x) + ' ' + (this.cy + d.y) + ' A ' + this.s + ' ' + this.s + ' 0 ' + Math.floor(this.v * 2) + ' 0 ' + this.cx + ' ' + (this.cy + this.s) + ' L ' + this.cx + ' ' + this.cy);
        arc.style.fill = this.c;
        this.svg.appendChild(arc);

        let c2 = this.circle(this.cx, this.cy, this.s - 1, '#ccb');
        this.svg.appendChild(c2);
        
        let r1 = this.rect(this.cx - 0.5, this.cy + this.s / 2, 1, this.s / 2, this.c);
        r1.setAttribute('transform', 'rotate(' + (this.v * 360) + ' ' + this.cx + ' ' + this.cy + ')');
        this.svg.appendChild(r1);
    }
}

class Slider extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    add() {
        let r1 = this.rect(this.cx - 0.5, this.cy - this.s / 2, 1, this.s, "#998");
        this.svg.appendChild(r1);
        
        let r2 = this.rect(this.cx - 0.5, this.cy + this.s / 2 - this.v, 1, this.v, this.c);
        this.svg.appendChild(r2);
        
        let r3 = this.rect(this.cx - 10, this.cy + this.s / 2 - this.v - 5, 20, 10, "#ccb");
        r3.style.stroke = this.c;
        r3.style.rx = 2;
        this.svg.appendChild(r3);
    }
}

class Button extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    add() {
        let c1 = this.circle(this.cx, this.cy, this.s, '#998');
        this.svg.appendChild(c1);
        
        let c2 = this.circle(this.cx, this.cy, this.s, this.c);
        this.svg.appendChild(c2);
        
        let c3 = this.circle(this.cx, this.cy, this.s - 1, '#ccb');
        this.svg.appendChild(c3);
    }
}