import {EndingNode} from "../audio/node.js";
import * as utils from "../utils.js";
import * as audio from "../audio/audio.js";

const AudioLevelVisualizerType = {
    mono: "m",
    stereo: "s"
};

const AudioLevelVisualizerOrientation = {
    left: "left",
    right: "right",
    up: "up",
    down: "down"
};

function fillRect(ctx, x1, y1, x2, y2) {
    if (x1 > x2) {
        let t = x2;
        x2 = x1;
        x1 = t;
    }

    if (y1 > y2) {
        let t = y2;
        y2 = y1;
        y1 = t;
    }

    let width = x2 - x1;
    let height = y2 - y1;

    ctx.fillRect(x1, y1, width, height);
}

//https://stackoverflow.com/questions/1669190/find-the-min-max-element-of-an-array-in-javascript/40026552
function arrayMin(arr) {
    let len = arr.length, min = Infinity;
    while (len--) {
        if (arr[len] < min) {
            min = arr[len];
        }
    }
    return min;
}

function arrayMax(arr) {
    let len = arr.length, max = -Infinity;
    while (len--) {
        if (arr[len] > max) {
            max = arr[len];
        }
    }
    return max;
}

function rectIntersect(rect1, rect2) {
    return ((rect1.x2 > rect2.x1) && (rect1.x1 < rect2.x2) && (rect1.y1 < rect2.y2) && (rect1.y2 > rect2.y1));
}

/*
Quite useful for audio visualization
 */
class AudioLevelVisualizer extends EndingNode {
    static get Type() {
        return AudioLevelVisualizerType;
    }

    static get Orient() {
        return AudioLevelVisualizerOrientation;
    }

    constructor(params) {
        super();

        if (params.canvas)
            this.setCanvas(params.canvas);
        else if (params.context)
            this.setContext(params.context);
        if (params.node)
            this.connectFrom(params.node);

        this.type = utils.select(params.type, "s");
        this.orient = utils.select(params.orient, "up");
        this.blocksize = utils.select(params.blocksize, 1024);
        this.track_max = utils.select(params.track_max, 200); // how many maximum values to keep track of, in frames

        this.line_width = utils.select(params.line_width, 1);
        this.line_color = utils.select(params.line_color, "#9a9");

        this.bar_width = utils.select(params.bar_width, 1.5);
        this.bar_color = utils.select(params.bar_color, "#333");

        this.warning_gain = utils.select(params.warning_gain, 0.5);
        this.peak_gain = utils.select(params.peak_gain, 1);

        this.normal_color = utils.select(params.normal_color, "#096");
        this.warning_color = utils.select(params.warning_color, "#ea4");
        this.peak_color = utils.select(params.peak_color, "#e42");

        this.background_color = utils.select(params.background_color, "#ccc");

        this.text_color = utils.select(params.text_color, "#222");
        this.font = utils.select(params.font, "15px Open Sans");

        this.line_heights = utils.select(params.line_heights, [...Array(11).keys()].map(x => 3*x-27));
        this.split_lines = true; // if true, draw two decibel markers for the graphic in stereo mode, if false, draw one

        this.enabled = false;
        this.idle = false;
    }

    setCanvas(canvas) {
        utils.assert(canvas.tagName === "CANVAS", "setCanvas takes a canvas");

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (!this.ctx)
            throw new Error("Creating 2D Canvas rendering context failed");
    }

    get orient() {
        return this._orient;
    }

    set orient(value) {
        utils.assert(Object.values(AudioLevelVisualizerOrientation).includes(value));

        this._orient = value;
    }

    get type() {
        return this._type;
    }

    get blocksize() {
        if (this.analyzerCount === 1) {
            return this.analyzer.fftSize;
        } else if (this.analyzerCount === 2) {
            return this.l_analyzer.fftSize;
        }
    }

    set blocksize(value) {
        if (this.analyzerCount === 1) {
            this.analyzer.fftSize = value;
        } else if (this.analyzerCount === 2) {
            this.l_analyzer.fftSize = value;
            this.r_analyzer.fftSize = value;
        }
    }

    set type(value) {
        utils.assert(Object.values(AudioLevelVisualizerType).includes(value));

        this._type = value;
        this.idle = false;

        switch (value) {
            case "m":
                if (this.analyzerCount === 1)
                    return;
                else if (this.analyzerCount === 2) {
                    this.splitter.disconnect(this.l_analyzer);
                    this.splitter.disconnect(this.r_analyzer);

                    this.entry.disconnect(this.splitter);

                    this.l_analyzer = undefined;
                    this.r_analyzer = undefined;

                    this.splitter = undefined;
                }

                this.analyzer = audio.Context.createAnalyser();

                this.entry.connect(this.analyzer);

                this.analyzerCount = 1;
                break;
            case "s":
                if (this.analyzerCount === 2)
                    return;
                else if (this.analyzerCount === 1) {
                    this.entry.disconnect(this.analyzer);

                    this.analyzer = undefined;
                }

                this.l_analyzer = audio.Context.createAnalyser();
                this.r_analyzer = audio.Context.createAnalyser();

                this.splitter = audio.Context.createChannelSplitter(2);

                this.entry.connect(this.splitter);

                this.splitter.connect(this.l_analyzer, 0);
                this.splitter.connect(this.r_analyzer, 1);

                this.analyzerCount = 2;
                break;
        }

        this.reset();
    }

    setContext(context) {
        utils.assert(context instanceof CanvasRenderingContext2D, "setContext takes a 2D canvas rendering context");

        this.setCanvas(context.canvas);
    }

    getLLevel() {
        utils.assert(this.l_analyzer, "Incorrect mode for getLLevel call");

        if (!this._l_level || this._l_level.length !== this.l_analyzer.fftSize)
            this._l_level = new Float32Array(this.l_analyzer.fftSize);

        this.l_analyzer.getFloatTimeDomainData(this._l_level);
    }

    getRLevel() {
        utils.assert(this.r_analyzer, "Incorrect mode for getRLevel call");

        if (!this._r_level || this._r_level.length !== this.r_analyzer.fftSize)
            this._r_level = new Float32Array(this.r_analyzer.fftSize);

        this.r_analyzer.getFloatTimeDomainData(this._r_level);
    }

    getLevel() {
        utils.assert(this.analyzer, "Incorrect mode for getLevel call");

        if (!this._level || this._level.length !== this.analyzer.fftSize)
            this._level = new Float32Array(this.analyzer.fftSize);

        this.analyzer.getFloatTimeDomainData(this._level);
    }

    drawBackground() {
        if (!this.enabled)
            return;

        let params = {
            w: this.canvas.width,
            h: this.canvas.height,
            o: this.orient,
            t: this.type,
            sl: this.split_lines,
            lc: this.line_color,
            lh: this.line_heights.slice(),
            tc: this.text_color,
            f: this.font,
            bc: this.background_color
        };

        if (this.background_image && this._last_params && utils.equal(this._last_params, params)) {
            this.ctx.putImageData(this.background_image, 0, 0);
            return;
        }

        this._last_params = params;

        let ctx = this.ctx;
        let canvas = this.canvas;

        let width = canvas.width;
        let height = canvas.height;

        let fr;

        switch (this.orient) {
            case "up":
                fr = (x, y) => [width * x, (1 - y) * height];
                break;
            case "down":
                fr = (x, y) => [width * x, y * height];

                break;
            case "right":
                fr = (x, y) => [width * y, height * x];

                break;
            case "left":
                fr = (x, y) => [width * (1 - y), height * (1 - x)];

                break;
            default:
                throw new Error(`Unknown orientation ${this.orient}`);
        }

        // gain to position
        let tr = (x, y) => fr(x, (Math.log10(y/1.8 + .1) + 1) / (Math.log10(1.1) + 1));

        // decibel to position
        let dr = (x, y) => tr(x, Math.pow(10, y / 20));

        ctx.fillStyle = this.background_color;

        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = this.font;

        ctx.strokeStyle = this.line_color;
        ctx.lineWidth = this.line_width;

        let rectangles = [];

        if (this.split_lines && this._type === "s") {
            this.line_heights.forEach(i => {

                ctx.beginPath();
                ctx.moveTo(...dr(0, i));
                ctx.lineTo(...dr(0.465, i));
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(...dr(0.535, i));
                ctx.lineTo(...dr(1, i));
                ctx.stroke();

                let text = i.toString();
                let font_size = parseInt(this.font, 10) / 2;
                let twidth = ctx.measureText(text).width / 2 + 2;

                let text_1 = dr(0.465 / 2, i);
                let text_2 = dr(1.535 / 2, i);

                let rectangle1 = {x1: text_1[0] - twidth, y1: text_1[1] - font_size, x2: text_1[0] + twidth, y2: text_1[1] + font_size};
                let rectangle2 = {x1: text_2[0] - twidth, y1: text_2[1] - font_size, x2: text_2[0] + twidth, y2: text_2[1] + font_size};

                if (!rectangles.some(rect => rectIntersect(rect, rectangle1))) {
                    ctx.fillStyle = this.background_color;

                    ctx.fillRect(text_1[0] - twidth, text_1[1] - font_size, 2 * twidth, 2 * font_size);

                    ctx.fillStyle = this.text_color;

                    ctx.fillText(i.toString(), ...text_1);

                    rectangles.push(rectangle1);
                }

                if (!rectangles.some(rect => rectIntersect(rect, rectangle2))) {
                    ctx.fillStyle = this.background_color;

                    ctx.fillRect(text_2[0] - twidth, text_2[1] - font_size, 2 * twidth, 2 * font_size);

                    ctx.fillStyle = this.text_color;

                    ctx.fillText(i.toString(), ...text_2);

                    rectangles.push(rectangle2);
                }
            });
        } else {
            this.line_heights.forEach(i => {
                ctx.beginPath();
                ctx.moveTo(...dr(0, i));
                ctx.lineTo(...dr(1, i));
                ctx.stroke();

                let text = i.toString();
                let font_size = parseInt(this.font, 10) / 2;
                let twidth = ctx.measureText(text).width / 2 + 2;

                let text_1 = dr(0.5, i);

                let rectangle = {x1: text_1[0] - twidth, y1: text_1[1] - font_size, x2: text_1[0] + twidth, y2: text_1[1] + font_size};

                if (!rectangles.some(rect => rectIntersect(rect, rectangle))) {
                    ctx.fillStyle = this.background_color;

                    ctx.fillRect(text_1[0] - twidth, text_1[1] - font_size, 2 * twidth, 2 * font_size);

                    ctx.fillStyle = this.text_color;

                    ctx.fillText(i.toString(), ...text_1);

                    rectangles.push(rectangle);
                }
            });
        }

        this.background_image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    drawLoop(nget = true) {
        if (!this.enabled)
            return;

        let ctx = this.ctx;
        let canvas = this.canvas;

        let width = canvas.width;
        let height = canvas.height;

        let fr;

        switch (this.orient) {
            case "up":
                fr = (x, y) => [width * x, (1 - y) * height];
                break;
            case "down":
                fr = (x, y) => [width * x, y * height];

                break;
            case "right":
                fr = (x, y) => [width * y, height * x];

                break;
            case "left":
                fr = (x, y) => [width * (1 - y), height * (1 - x)];

                break;
            default:
                throw new Error(`Unknown orientation ${this.orient}`);
        }

        // gain to position
        let tr = (x, y) => fr(x, (Math.log10(y/1.8 + .1) + 1) / (Math.log10(1.1) + 1));

        // decibel to position
        let dr = (x, y) => tr(x, Math.pow(10, y / 20));

        this.drawBackground();

        switch (this.type) {
            case "s": {
                if (nget) {
                    this.getLLevel();
                    this.getRLevel();
                }

                if (!this.l_bar)
                    this.l_bar = 0;
                if (!this.r_bar)
                    this.r_bar = 0;
                if (!this.bar_mod_last)
                    this.bar_mod_last = 0;

                if (this.bar_mod_last > this.track_max)
                    this.l_bar *= 0.95;
                if (this.bar_mod_last > this.track_max)
                    this.r_bar *= 0.95;

                let max = arrayMax(this._l_level);
                let min = arrayMin(this._l_level);

                let all_max = Math.max(Math.abs(max), Math.abs(min));

                if (this.l_bar <= all_max) {
                    this.l_bar = all_max;
                    this.bar_mod_last = 0;
                }

                ctx.fillStyle = this.normal_color;
                fillRect(ctx, ...tr(0, 0), ...tr(0.465, Math.min(all_max, this.warning_gain)));

                if (all_max > this.warning_gain) {
                    ctx.fillStyle = this.warning_color;
                    fillRect(ctx, ...tr(0, this.warning_gain), ...tr(0.465, Math.min(all_max, this.peak_gain)));
                }

                if (all_max > this.peak_gain) {
                    ctx.fillStyle = this.peak_color;
                    fillRect(ctx, ...tr(0, this.peak_gain), ...tr(0.465, all_max));
                }

                max = arrayMax(this._r_level);
                min = arrayMin(this._r_level);

                all_max = Math.max(Math.abs(max), Math.abs(min));

                if (this.r_bar <= all_max) {
                    this.r_bar = all_max;
                    this.bar_mod_last = 0;
                }

                this.bar_mod_last++;

                ctx.fillStyle = this.normal_color;
                fillRect(ctx, ...tr(.535, 0), ...tr(1, Math.min(all_max, this.warning_gain)));

                if (all_max > this.warning_gain) {
                    ctx.fillStyle = this.warning_color;
                    fillRect(ctx, ...tr(.535, this.warning_gain), ...tr(1, Math.min(all_max, this.peak_gain)));
                }

                if (all_max > this.peak_gain) {
                    ctx.fillStyle = this.peak_color;
                    fillRect(ctx, ...tr(.535, this.peak_gain), ...tr(1, all_max));
                }

                ctx.strokeStyle = this.bar_color;
                ctx.lineWidth = this.bar_width;

                ctx.beginPath();
                ctx.moveTo(...tr(0, this.l_bar));
                ctx.lineTo(...tr(0.465, this.l_bar));
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(...tr(0.535, this.r_bar));
                ctx.lineTo(...tr(1, this.r_bar));
                ctx.stroke();

            }
            break;
            case "m": {
                if (nget)
                    this.getLevel();

                if (!this.bar)
                    this.bar = 0;
                if (!this.bar_mod_last)
                    this.bar_mod_last = 0;

                if (this.bar_mod_last > this.track_max)
                    this.bar *= 0.95;

                let max = arrayMax(this._level);
                let min = arrayMin(this._level);

                let all_max = Math.max(Math.abs(max), Math.abs(min));

                if (this.bar <= all_max) {
                    this.bar = all_max;
                    this.bar_mod_last = 0;
                }

                this.bar_mod_last++;

                ctx.fillStyle = this.normal_color;
                fillRect(ctx, ...tr(0, 0), ...tr(1, Math.min(all_max, this.warning_gain)));

                if (all_max > this.warning_gain) {
                    ctx.fillStyle = this.warning_color;
                    fillRect(ctx, ...tr(0, this.warning_gain), ...tr(1, Math.min(all_max, this.peak_gain)));
                }

                if (all_max > this.peak_gain) {
                    ctx.fillStyle = this.peak_color;
                    fillRect(ctx, ...tr(0, this.peak_gain), ...tr(1, all_max));
                }

                ctx.strokeStyle = this.bar_color;
                ctx.lineWidth = this.bar_width;

                ctx.beginPath();
                ctx.moveTo(...tr(0, this.bar));
                ctx.lineTo(...tr(1, this.bar));
                ctx.stroke();
            }
            break;
            default:
                throw new Error(`Unknown type ${this.type}`);
        }


        requestAnimationFrame(() => this.drawLoop());
    }

    reset() {
        switch (this._type) {
            case "m":
                this.bar = 0;
                if (this._level)
                    this._level.fill(0);
                break;
            case "s":
                this.l_bar = 0;
                this.r_bar = 0;
                if (this._l_level) {
                    this._l_level.fill(0);
                    this._r_level.fill(0);
                }
                break;
        }
    }

    drawBlank() {
        this.enabled = true;

        this.reset();

        this.drawLoop(false);
        this.enabled = false;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    start() {
        this.enabled = true;

        this.drawLoop();
    }

    stop() {
        this.enabled = false;

        this.clear();
    }
}

export {AudioLevelVisualizer};