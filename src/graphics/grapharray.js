import * as utils from "../utils.js";

function stretchToExp(minX, maxX, x) {
    let MIN_FREQ_LOG2 = Math.log2(minX);
    let MAX_FREQ_LOG2 = Math.log2(maxX);
    let FREQ_DIFF = MAX_FREQ_LOG2 - MIN_FREQ_LOG2;

    return Math.pow(2, MIN_FREQ_LOG2 + FREQ_DIFF * x);
}

window.ian = stretchToExp;

class ArrayGrapher {
    constructor(params = {}) {
        if (params.domElement) {
            this.setCanvas(params.domElement);
            this.setContext(params.context || params.domElement.getContext('2d'));
        }

        this.transformation = params.transformation || ((x, y) => [x, y]);
    }

    setCanvas(canvas) {
        this.canvas = canvas;
    }

    setContext(ctx) {
        this.ctx = ctx;
    }

    transform(x, y) {
        return this.transformation(x, y);
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawLineSegments(arg1, arg2) {
        this.clearCanvas();
        if (!arg2) { // arg1 is sequence x,y,x,y
            let ctx = this.ctx;

            ctx.beginPath();

            let drewFirst = false;

            for (let i = 0; i < arg1.length / 2; i++) {
                let x = arg1[2 * i];
                let y = arg1[2 * i + 1];

                let point = this.transform(x, y);
                if (!drewFirst) {
                    drewFirst = true;

                    ctx.moveTo(...point);
                } else {
                    ctx.lineTo(...point);
                }
            }

            ctx.stroke();
        } else { // arg1, arg2 are x, y
            let ctx = this.ctx;

            ctx.beginPath();

            let drewFirst = false;

            for (let i = 0; i < arg1.length; i++) {
                let x = arg1[i];
                let y = arg2[i];

                let point = this.transform(x, y);
                if (!drewFirst) {
                    drewFirst = true;

                    ctx.moveTo(...point);
                } else {
                    ctx.lineTo(...point);
                }
            }

            ctx.stroke();
        }
    }

    drawRange(arg1, minX, maxX) {
        this.clearCanvas();
        let ctx = this.ctx;

        ctx.beginPath();

        let drewFirst = false;

        for (let i = 0; i < arg1.length; i++) {
            let x = i / arg1.length * (maxX - minX) + minX;
            let y = arg1[i];

            let point = this.transform(x, y);

            if (!drewFirst) {
                drewFirst = true;

                ctx.moveTo(...point);
            } else {
                ctx.lineTo(...point);
            }
        }

        ctx.stroke();
    }

    drawExpRange(arg1, minX, maxX) {
        this.clearCanvas();
        let ctx = this.ctx;

        ctx.beginPath();

        let drewFirst = false;

        for (let i = 0; i < arg1.length; i++) {
            let x = stretchToExp(minX, maxX, i / arg1.length);
            let y = arg1[i];

            let point = this.transform(x, y);

            if (!drewFirst) {
                drewFirst = true;

                ctx.moveTo(...point);
            } else {
                ctx.lineTo(...point);
            }
        }

        ctx.stroke();
    }
}

function stretchToCanvas(canvas, minX = 0, maxX = 100, minY = 0, maxY = 100) {
    let width = canvas.width;
    let height = canvas.height;

    return function(x, y) {
        return [
            (x - minX) / (maxX - minX) * width,
            (y - minY) / (maxY - minY) * height
        ]
    }
}

export {ArrayGrapher, stretchToCanvas};