const url = 'http://www.w3.org/2000/svg';

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
        this.dark = '#ccc';
        this.light = '#ddd';
        this.add();
    }
    
    circle(cx, cy, r, c) {
        let c1 = document.createElementNS(url, 'circle');
        c1.style.cx = cx;
        c1.style.cy = cy;
        c1.style.r = r;
        c1.style.fill = c;
        return c1;
    }
    
    rect(x, y, w, h, c) {
        let r1 = document.createElementNS(url, 'rect');
        r1.style.x = x;
        r1.style.y = y;
        r1.style.width = w;
        r1.style.height = h;
        r1.style.fill = c;
        return r1;
    }
    
    text(x, y, a, v, c) {
        let t1 = document.createElementNS(url, 'text');
        t1.setAttribute('x', x);
        t1.setAttribute('y', y);
        t1.style.fill = c;
        t1.innerHTML = v;
        t1.setAttribute('text-anchor', a);
        return t1;
    }
    
    g() {
        return document.createElementNS(url, 'g');
    }
    
    set(v) {
        this.v = v;
        this.update();
    }
    add() {}
    change() {}
    update() {}
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
        
        this.change();
    }

    add() {
        let g1 = this.g();
        
        let c1 = this.circle(this.cx, this.cy, this.s / 2, this.dark);
        g1.appendChild(c1);
        
        let c3 = this.circle(this.cx, this.cy, this.s / 2, this.c);
        g1.appendChild(c3);
        this.mod.push(c3);

        let arc = document.createElementNS(url, 'path');
        arc.style.fill = this.c;
        g1.appendChild(arc);
        this.mod.push(arc);

        let c2 = this.circle(this.cx, this.cy, this.s / 2 - 2, this.light);
        g1.appendChild(c2);
        
        let r1 = this.rect(this.cx - 1, this.cy + this.s / 4, 2, this.s / 4, this.c);
        g1.appendChild(r1);
        this.mod.push(r1);
        
        let self = this;
        g1.onmousedown = function(event) {
            self.sx = event.clientX;
            self.sy = event.clientY;
            self.old = self.v;
            
            document.onmousemove = function(event) {
                if (event.clientX > 0 && event.clientY > 0) { 
                    let result = 1000 * (self.sy - event.clientY) / (self.svg.clientWidth * self.s) / 4 + self.old;

                    result = result < 0 ? 0 : result > 1 ? 1 : result;
                    self.v = result;
                    self.update();
                }
            };
            
            document.onmouseup = function() {
                document.onmousemove = null;
                document.onmouseup = null;
            };
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
        this.mod[1].style.cy = this.cy + this.s / 2 - this.v * this.s;
        
        this.change();
    }
    
    add() {
        let g1 = this.g();
        
        let r1 = this.rect(this.cx - 1, this.cy - this.s / 2, 2, this.s, this.dark);
        g1.appendChild(r1);
        
        let r2 = this.rect(this.cx - 1, 0, 2, 0, this.c);
        g1.appendChild(r2);
        this.mod.push(r2);
        
        let c1 = this.circle(this.cx, 0, 5, this.light);
        c1.style.stroke = this.c;
        c1.style.strokeWidth = 2;
        g1.appendChild(c1);
        this.mod.push(c1);
        
        let self = this;
        g1.onmousedown = function(event) {
            self.sx = event.clientX;
            self.sy = event.clientY;
            self.old = self.v;
            
            document.onmousemove = function(event) {
                if (event.clientX > 0 && event.clientY > 0) {
                    let result = 1000 * (self.sy - event.clientY) / (self.svg.clientWidth * self.s) + self.old;

                    result = result < 0 ? 0 : result > 1 ? 1 : result;
                    self.v = result;
                    self.update();
                }
            };
            
            document.onmouseup = function() {
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
        this.svg.appendChild(g1);
        
        this.update();
    }
}

class Button extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
        this.radio = null;
    }
    
    update() {
        this.mod[0].style.stroke = this.v ? this.c : this.dark;
        
        this.change();
        
        if (this.radio !== undefined && this.v) {
            this.radio.update(this);
        }
    }
    
    add() {
        let g1 = this.g();
        
        let c1 = this.circle(this.cx, this.cy, this.s / 2, this.light);
        c1.style.strokeWidth = 2;
        g1.appendChild(c1);
        this.mod.push(c1);
        
        let self = this;
        g1.onmousedown = function() {
            self.v = this.radio !== null ? true : self.v === 0 ? 1 : 0;
            
            self.update();
        };
        this.svg.appendChild(g1);
        
        this.update();
    }
}

class Radio {
    constructor() {
        this.buttons = [];
    }
    
    update(b) {
        for (let i = 0; i < this.buttons.length; i++) {
            if (this.buttons[i] !== b) {
                this.buttons[i].set(false);
            }
        }
    }
    
    add(b) {
        this.buttons.push(b);
        b.radio = this;
    }
}

class Open extends Widget {
    constructor(cx, cy, s, c, svg) {
        super(cx, cy, s, 0, c, svg);
        
        this.dialog = document.createElement('input');
        this.dialog.setAttribute('type', 'file');
        
        let self = this;
        this.dialog.onchange = function() {
            self.v = self.dialog.files.item(0);
            self.change();
        };
    }
    
    add() {
        let g1 = this.g();
        
        let r1 = this.rect(this.cx - this.s / 2, this.cy - this.s / 2, this.s, this.s, this.light);
        r1.style.stroke = this.dark;
        r1.style.strokeWidth = 2;
        r1.style.rx = 4;
        g1.appendChild(r1);
        
        let r2 = this.rect(this.cx - this.s / 2 + 4, this.cy - this.s / 2 + 4, this.s - 8, this.s - 8, this.c);
        r2.style.rx = 2;
        g1.appendChild(r2);
        
        let self = this;
        g1.onmousedown = function() {
            self.dialog.click();
        };
        this.svg.appendChild(g1);
        
        this.update();
    }
}

class Text extends Widget {
    constructor(cx, cy, s, v, c, svg) {
        super(cx, cy, s, v, c, svg);
    }
    
    update() {
        this.mod[0].innerHTML = this.v;
    }
    
    add() {
        let g1 = this.g();
        
        let t1 = this.text(this.cx, this.cy, this.s, this.v, this.c);
        g1.appendChild(t1);
        this.mod.push(t1);
        
        this.svg.appendChild(g1);
    }
}

class Group {
    constructor(x1, y1, x2, y2, t, svg) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.t = t;
        this.svg = svg;
        this.add();
    }
    
    add() {
        let g1 = document.createElementNS(url, 'g');
        
        let r1 = document.createElementNS(url, 'rect');
        r1.style.x = this.x1;
        r1.style.y = this.y1;
        r1.style.width = this.x2 - this.x1;
        r1.style.height = this.y2 - this.y1;
        r1.style.stroke = '#ccc';
        r1.style.fillOpacity = 0;
        g1.appendChild(r1);
        
        let t1 = document.createElementNS(url, 'text');
        t1.setAttribute('x', this.x1 + 5);
        t1.setAttribute('y', this.y1 + 15);
        t1.style.fill = '#666';
        t1.innerHTML = this.t;
        g1.appendChild(t1);
        
        this.svg.appendChild(g1);
    }
}

function stop(event) {
    event.preventDefault();
}