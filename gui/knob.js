class Widget {
    constructor(cx, cy, s, v, c, svg) {
        this.cx = cx;
        this.cy = cy;
        this.s = s;
        this.v = v;
        this.c = c;
        this.svg = svg;
        this.mod = null;
        this.sx = 0;
        this.sy = 0;
        this.old = 0;
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
    
    g() {
        return document.createElementNS('http://www.w3.org/2000/svg', 'g');
    }
    
    center(event) {
    }
}

class Knob extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }

    add() {
        let g1 = this.g();
        
        let c1 = this.circle(this.cx, this.cy, this.s / 2, '#998');
        g1.appendChild(c1);

        
        let angle = Math.PI * (this.v * 2 - 1.5);
        let d = {
            x: this.s * Math.cos(angle) / 2,
            y: this.s * Math.sin(angle) / 2
        };
        let arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arc.setAttribute('d', 'M ' + (this.cx + d.x) + ' ' + (this.cy + d.y) +
                         ' A ' + (this.s / 2) + ' ' + (this.s / 2) +
                         ' 0 ' + Math.floor(this.v * 2) + ' 0 ' +
                         this.cx + ' ' + (this.cy + this.s / 2) +
                         ' L ' + this.cx + ' ' + this.cy);
        arc.style.fill = this.c;
        g1.appendChild(arc);
        
        this.mod = arc;

        let c2 = this.circle(this.cx, this.cy, this.s / 2 - 1, '#ccb');
        g1.appendChild(c2);
        
        let r1 = this.rect(this.cx - 0.5, this.cy + this.s / 4, 1, this.s / 4, this.c);
        r1.setAttribute('transform', 'rotate(' + (this.v * 360) + ' ' + this.cx + ' ' + this.cy + ')');
        g1.appendChild(r1);
        
        let hi = this;
        g1.onmousedown = function(event) {
            hi.sx = event.clientX;
            hi.sy = event.clientY;
            hi.old = hi.v;
        };
        g1.ondrag = function(event) {
            if (event.clientX > 0 && event.clientY > 0) { 
                let result = (hi.sy - event.clientY) / hi.s / 4 + hi.old;
                
                if (Math.floor(result * 2) < 0 || Math.floor(result * 2) > 1) {
                    return;
                }
                hi.v = result;
                
                let angle = Math.PI * (hi.v * 2 - 1.5);
                let d = {
                    x: hi.s * Math.cos(angle) / 2,
                    y: hi.s * Math.sin(angle) / 2
                };
                arc.setAttribute('d', 'M ' + (hi.cx + d.x) + ' ' + (hi.cy + d.y) +
                                 ' A ' + (hi.s / 2) + ' ' + (hi.s / 2) +
                                 ' 0 ' + Math.floor(hi.v * 2) + ' 0 ' +
                                 hi.cx + ' ' + (hi.cy + hi.s / 2) +
                                 ' L ' + hi.cx + ' ' + hi.cy);
                
                r1.setAttribute('transform', 'rotate(' + (hi.v * 360) + ' ' + hi.cx + ' ' + hi.cy + ')');
            }
        };
        this.svg.appendChild(g1);
    }
}

class Slider extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    add() {
        let r1 = this.rect(this.cx - 0.5, this.cy - this.s / 2, 1, this.s, '#998');
        this.svg.appendChild(r1);
        
        let r2 = this.rect(this.cx - 0.5, this.cy + this.s / 2 - this.v, 1, this.v, this.c);
        this.svg.appendChild(r2);
        
        this.mod = r2;
        
        let r3 = this.rect(this.cx - 10, this.cy + this.s / 2 - this.v - 5, 20, 10, '#ccb');
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
        let c1 = this.circle(this.cx, this.cy, this.s / 2, '#998');
        this.svg.appendChild(c1);
        
        let c2 = this.circle(this.cx, this.cy, this.s / 2, this.c);
        c2.style.opacity = this.v ? 1 : 0;
        this.svg.appendChild(c2);
        
        this.mod = c2;
        
        let c3 = this.circle(this.cx, this.cy, this.s / 2 - 1, '#ccb');
        this.svg.appendChild(c3);
    }
}