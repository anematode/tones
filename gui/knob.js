class Widget {
    constructor(cx, cy, s, v, c, svg) {
        this.cx = cx;
        this.cy = cy;
        this.s = s;
        this.v = v;
        this.c = c;
        this.svg = svg;
        this.mod = [];
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
}

class Knob extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    update() {
                
        let angle = Math.PI * (this.v * 2 - 1.5);
        let d = {
            x: this.s * Math.cos(angle) / 2,
            y: this.s * Math.sin(angle) / 2
        };
        this.mod[0].style.opacity = this.v === 1 ? 1 : 0;
        
        this.mod[1].setAttribute('d', 'M ' + (this.cx + d.x) + ' ' + (this.cy + d.y) +
                                 ' A ' + (this.s / 2) + ' ' + (this.s / 2) +
                                 ' 0 ' + (this.v > 0.5 ? 1 : 0) + ' 0 ' +
                                 this.cx + ' ' + (this.cy + this.s / 2) +
                                 ' L ' + this.cx + ' ' + this.cy);
                
        this.mod[2].setAttribute('transform', 'rotate(' + (this.v * 360) + ' ' + this.cx + ' ' + this.cy + ')');
    }

    add() {
        let g1 = this.g();
        
        let c1 = this.circle(this.cx, this.cy, this.s / 2, '#998');
        g1.appendChild(c1);
        
        let c3 = this.circle(this.cx, this.cy, this.s / 2, this.c);
        g1.appendChild(c3);
        this.mod.push(c3);

        let arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arc.style.fill = this.c;
        g1.appendChild(arc);
        this.mod.push(arc);

        let c2 = this.circle(this.cx, this.cy, this.s / 2 - 1, '#ccb');
        g1.appendChild(c2);
        
        let r1 = this.rect(this.cx - 0.5, this.cy + this.s / 4, 1, this.s / 4, this.c);
        g1.appendChild(r1);
        this.mod.push(r1);
        
        let self = this;
        g1.onmousedown = function(event) {
            self.sx = event.clientX;
            self.sy = event.clientY;
            self.old = self.v;
        };
        g1.ondrag = function(event) {
            if (event.clientX > 0 && event.clientY > 0) { 
                let result = (self.sy - event.clientY) / self.s / 4 + self.old;
                
                result = result < 0 ? 0 : result > 1 ? 1 : result;
                self.v = result;
                self.update();
            }
        };
        this.svg.appendChild(g1);
        
        this.update();
    }
}

class Slider extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    update() {
        this.mod[0].style.y = this.cy + this.s / 2 - this.v * this.s;
        this.mod[0].style.height = this.v * this.s;
        this.mod[1].style.y = this.cy + this.s / 2 - this.v * this.s - 5;
    }
    
    add() {
        let g1 = this.g();
        
        let r1 = this.rect(this.cx - 0.5, this.cy - this.s / 2, 1, this.s, '#998');
        g1.appendChild(r1);
        
        let r2 = this.rect(this.cx - 0.5, 0, 1, 0, this.c);
        g1.appendChild(r2);
        this.mod.push(r2);
        
        let r3 = this.rect(this.cx - 10, 0, 20, 10, '#ccb');
        r3.style.stroke = this.c;
        r3.style.rx = 2;
        g1.appendChild(r3);
        this.mod.push(r3);
        
        let self = this;
        g1.onmousedown = function(event) {
            self.sx = event.clientX;
            self.sy = event.clientY;
            self.old = self.v;
        };
        g1.ondrag = function(event) {
            if (event.clientX > 0 && event.clientY > 0) { 
                let result = (self.sy - event.clientY) / self.s + self.old;
                
                result = result < 0 ? 0 : result > 1 ? 1 : result;
                self.v = result;
                self.update();
            }
        };
        this.svg.appendChild(g1);
        
        this.update();
    }
}

class Button extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    update() {
        this.mod[0].style.opacity = this.v ? 1 : 0;
    }
    
    add() {
        let g1 = this.g();
        
        let c1 = this.circle(this.cx, this.cy, this.s / 2, '#998');
        g1.appendChild(c1);
        
        let c2 = this.circle(this.cx, this.cy, this.s / 2, this.c);
        g1.appendChild(c2);
        this.mod.push(c2);
        
        let c3 = this.circle(this.cx, this.cy, this.s / 2 - 1, '#ccb');
        g1.appendChild(c3);
        
        let self = this;
        g1.onmousedown = function() {
            self.v = self.v === 0 ? 1 : 0;
            self.update();
        };
        this.svg.appendChild(g1);
    }
}