import {EndingNode} from "../audio/node.js";
import {SVGElement, SVGGroup, Rectangle, Translation, Path, Text, Line} from "./svgmanip.js";
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

function setRect(rect, x1, y1, x2, y2) {
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

    rect.x = x1;
    rect.y = y1;

    rect.width = width;
    rect.height = height;
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
class CanvasLevelVisualizer extends EndingNode {
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

const SVGNS = "http://www.w3.org/2000/svg";

class SVGLevelVisualizer extends EndingNode {
    static get Type() {
        return AudioLevelVisualizerType;
    }

    static get Orient() {
        return AudioLevelVisualizerOrientation;
    }

    constructor(parent, params = {}) {
        super();

        ["width", "height", "line_width", "line_color", "background_color", "text_color", "font", "split_lines",
            "font_size", "show_decibels", "show_lines", "text_alignment", "text_line_distance", "show_negatives"].forEach(x => this.addBGParam(x));
        ["warning_gain", "peak_gain", "normal_color", "warning_color", "peak_color", "trans_thickness"].forEach(x => this.addGradientParam(x));

        this.translation = new Translation();

        this.x = utils.select(params.x, 0); // x position of top left corner
        this.y = utils.select(params.y, 0); // y position of top left corner

        this.width = utils.select(params.width, 100); // width of visualizer
        this.height = utils.select(params.height, 600); // height of visualizer

        this.element = new SVGGroup(parent); // visualizer element
        this.background = new SVGGroup(this.element); // visualizer background element
        this.levels = new SVGGroup(this.element); // visualizer foreground element (levels, bars)

        this.element.addTransform(this.translation);

        if (params.node)
            this.connectFrom(params.node); // audio node to connect to

        this.type = utils.select(params.type, "s"); // type of visualization, "s" for stereo and "m" for mono
        this.orient = utils.select(params.orient, "up"); // orientation of visualization, out of "up", "down", "left", "right"
        this.blocksize = utils.select(params.blocksize, 1024); // size of each processed audio block, power of two required, 1024 recommended
        this.track_max = utils.select(params.track_max, 200); // time in frames until the bars start to drop

        this.line_width = utils.select(params.line_width, 1); // width of the decibel marking lines
        this.line_color = utils.select(params.line_color, "#9a9"); // color of the decibel marking lines

        this.show_lines = utils.select(params.show_lines, true); // should the decibel marking lines be shown
        this.show_decibels = utils.select(params.show_decibels, true); // should the decibal marking lines text be shown

        this.bar_width = utils.select(params.bar_width, 3); // width of the level bar
        this.bar_descent_rate = utils.select(params.bar_descent, params.bar_descent_rate, 0.04); // how fast does the bar "fall"

        this.warning_gain = utils.select(params.warning_gain, 0.5); // gain value where yellow should appear
        this.peak_gain = utils.select(params.peak_gain, 1); // gain value where red should appear

        this.normal_color = utils.select(params.normal_color, "#096"); // color of normal audio values (in green range)
        this.warning_color = utils.select(params.warning_color, "#ea4"); // color of loud/warning audio values
        this.peak_color = utils.select(params.peak_color, "#e42"); // color of peak audio values

        this.trans_thickness = utils.select(params.trans_thickness, 0); // thickness of the gradient between colors

        this.background_color = utils.select(params.background_color, "#ccc"); // background color of visualization

        this.text_color = utils.select(params.text_color, "#222"); // color of decibel marking text
        this.font = utils.select(params.font, "Open Sans"); // font of decibel marking text
        this.font_size = utils.select(params.font_size, "15px"); // size of decibel marking text font

        this.text_alignment = utils.select(params.text_alignment, "guess"); // alignment of text, values top, bottom, right, left, middle
        this.text_line_distance = utils.select(params.text_line_distance, 5); // distance in pixels between decibel text and decibel lines

        this.show_negatives = utils.select(params.show_negatives, true); // show - sign in decibel text

        /*
        Heights (or x values, if the orientation is "right" or "left") at which to draw the decibel marking lines
        The corresponding text for each height may not be drawn if it detects the text will get too cramped
         */
        this.line_heights = utils.select(params.line_heights, [...Array(11).keys()].map(x => 3 * x - 27));

        this.split_lines = true; // if true, draw two decibel markers for the graphic in stereo mode, if false, draw one

        // Internal parameters
        this.enabled = false; // is the draw loop enabled
        this.needs_bg_redraw = true; // does the background need to be redrawn
        this.needs_gr_recalc = true; // does the gradient element created in <defs> need to be recalculated
        this.destroyed = false; // is the object destroyed
    }

    addBGParam(name) {
        this.checkDestroyed();

        let privatev;
        let that = this;

        Object.defineProperty(this, name, {
            set(v) {
                if (!utils.equal(privatev, v))
                    that.needs_bg_redraw = true;
                privatev = v;
            },
            get() {
                return privatev;
            }
        });
    }

    addGradientParam(name) {
        this.checkDestroyed();

        let privatev;
        let that = this;

        Object.defineProperty(this, name, {
            set(v) {
                if (!utils.equal(privatev, v))
                    that.needs_gr_recalc = true;
                privatev = v;
            },
            get() {
                return privatev;
            }
        });
    }

    get x() {
        this.checkDestroyed();
        return this.translation.x;
    }

    set x(value) {
        this.checkDestroyed();
        this.translation.x = value;
    }

    get y() {
        this.checkDestroyed();
        return this.translation.y;
    }

    set y(value) {
        this.checkDestroyed();
        this.translation.y = value;
    }

    checkDestroyed() {
        if (this.destroyed)
            throw new Error("The visualizer is destroyed and can no longer be used");
    }

    destroy() {
        this.checkDestroyed();

        this.stop();
        this.element.destroy();

        this.destroyed = true;
    }

    get orient() {
        this.checkDestroyed();
        return this._orient;
    }

    set orient(value) {
        this.checkDestroyed();
        utils.assert(Object.values(AudioLevelVisualizerOrientation).includes(value));

        if (value !== this._orient) {
            this._orient = value;

            this.needs_gr_recalc = true;
            this.needs_bg_redraw = true;
        }
    }

    get type() {
        this.checkDestroyed();
        return this._type;
    }

    get blocksize() {
        this.checkDestroyed();
        if (this.analyzerCount === 1) {
            return this.analyzer.fftSize;
        } else if (this.analyzerCount === 2) {
            return this.l_analyzer.fftSize;
        }
    }

    set blocksize(value) {
        this.checkDestroyed();
        if (this.analyzerCount === 1) {
            this.analyzer.fftSize = value;
        } else if (this.analyzerCount === 2) {
            this.l_analyzer.fftSize = value;
            this.r_analyzer.fftSize = value;
        }
    }

    getTransforms() {
        this.checkDestroyed();
        let width = this.width;
        let height = this.height;

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

        let gr = y => (Math.log10(y / 1.75 + .1) + 1) / (Math.log10(1.1) + 1);

        // gain to position
        let tr = (x, y) => fr(x, gr(y));

        // decibel to position
        let dr = (x, y) => tr(x, Math.pow(10, y / 20));

        return {fr, tr, dr, gr};
    }

    drawBackground(transforms) {
        this.checkDestroyed();

        if (!this.enabled)
            return;

        let oparams = this.line_heights;

        if (!this.needs_bg_redraw && utils.equal(oparams, this._last_oparams))
            return;

        this._last_oparams = oparams.slice();

        this.drawBackgroundRect(transforms);
        this.drawBackgroundLines(transforms);

        this.needs_bg_redraw = false;
    }

    drawBackgroundRect() {
        this.checkDestroyed();

        if (!this.background.background_rect)
            this.background.background_rect = new Rectangle(this.background);

        let rect = this.background.background_rect;

        rect.fill = this.background_color;
        rect.width = this.width;
        rect.height = this.height;
    }

    drawBackgroundLines(transforms) {
        this.checkDestroyed();
        if (this.background.background_lines === undefined)
            this.background.background_lines = new SVGGroup(this.background);
        if (this.background.background_texts === undefined)
            this.background.background_texts = new SVGGroup(this.background);

        let dr = transforms.dr;

        let index = 0;
        let line_index = 0;
        let lines = this.background.background_lines.children;

        let texts = this.background.background_texts.children;
        let rectangles = [];

        let drawMarker = (y, start_x, end_x) => {
            if (this.show_lines) {
                let path;


                if (line_index >= lines.length) {
                    path = new Path(this.background.background_lines);
                } else {
                    path = lines[line_index];
                }

                let p1 = dr(start_x, y);
                let p2 = dr(end_x, y);

                path.d = `M ${p1.join(' ')} L ${p2.join(' ')}`;
                path.stroke = this.line_color;

                line_index++;
            }


            let alignment = this.text_alignment;
            let anchor, baseline, go_around = false;

            let x_m = 0, y_m = 0;
            let text_line_distance = this.text_line_distance;

            do {
                go_around = false;
                switch (alignment) {
                    case "guess":
                        alignment = this.orient;
                        go_around = true;

                        break;
                    case "up":
                        anchor = "middle";
                        baseline = "bottom";
                        y_m = -text_line_distance;

                        break;
                    case "down":
                        anchor = "middle";
                        baseline = "top";
                        y_m = text_line_distance;

                        break;
                    case "right":
                        anchor = "left";
                        baseline = "middle";
                        x_m = text_line_distance;

                        break;
                    case "left":
                        anchor = "right";
                        baseline = "middle";
                        x_m = -text_line_distance;

                        break;
                    case "middle":
                        anchor = "middle";
                        baseline = "middle";

                        break;
                    default:
                        throw new Error(`Unknown alignment value`);
                }
            } while (go_around);

            if (this.show_decibels) {
                let text_obj;

                if (index >= texts.length) {
                    text_obj = new SVGGroup(this.background.background_texts);
                } else {
                    text_obj = texts[index];
                }

                if (!text_obj.obscure)
                    text_obj.obscure = new Rectangle(text_obj);
                if (!text_obj.text)
                    text_obj.text = new Text(text_obj);

                let text = text_obj.text;

                let m1 = dr((start_x + end_x) / 2, y);

                text.text = (this.show_negatives ? y : Math.abs(y)).toString();

                text.x = m1[0] + x_m;
                text.y = m1[1] + y_m;

                text.textAnchor = anchor;
                text.alignmentBaseline = baseline;
                text.fontFamily = this.font;
                text.fontSize = this.font_size;

                let bbox = text.getBBox();

                let text_rect = {x1: bbox.x - 1.5, x2: bbox.x + bbox.width + 1.5, y1: bbox.y, y2: bbox.y + bbox.height}; // bounding rect of text
                let obscure = text_obj.obscure;

                if (rectangles.some(rect => rectIntersect(rect, text_rect))) {
                    text.text = "";
                    obscure.width = 0;
                    obscure.height = 0;

                } else {
                    rectangles.push(text_rect);

                    obscure.x = bbox.x - 1;
                    obscure.y = bbox.y;
                    obscure.width = bbox.width + 2;
                    obscure.height = bbox.height;

                    obscure.fill = this.background_color;
                }

                index++;
            }
        };

        if (this.split_lines && this._type === "s") {
            this.line_heights.forEach(i => [0, 0.535].forEach(x => {
                drawMarker(i, x, x + 0.465);
            }));
        } else {
            this.line_heights.forEach(i => {
                drawMarker(i, 0, 1);
            });
        }

        lines.slice(line_index).forEach(x => x.destroy());
        lines.length = line_index;

        texts.slice(index).forEach(x => x.destroy());
        texts.length = index;
    }

    calculateGradient(transforms) {
        this.checkDestroyed();

        if (!this.needs_gr_recalc) {
            return;
        }

        if (!this.gradient) {
            this.gradient = this.element.addChildDef("linearGradient", {id: this.element._id + "grad"});

            let g = this.gradient;

            g.normal_s = this.gradient.addElement("stop");
            g.normal_e = this.gradient.addElement("stop");

            g.warn_s = this.gradient.addElement("stop");
            g.warn_e = this.gradient.addElement("stop");

            g.peak_s = this.gradient.addElement("stop");
            g.peak_e = this.gradient.addElement("stop");

            this.gradient.set("gradientUnits", "userSpaceOnUse");
        }

        let g = this.gradient;

        [g.normal_s, g.normal_e].forEach(x => x.set("stop-color", this.normal_color));
        [g.warn_s, g.warn_e].forEach(x => x.set("stop-color", this.warning_color));
        [g.peak_s, g.peak_e].forEach(x => x.set("stop-color", this.peak_color));

        let w_thresh = transforms.gr(this.warning_gain);
        let p_thresh = transforms.gr(this.peak_gain);

        g.normal_s.set("offset", "0");
        g.normal_e.set("offset", (w_thresh - this.trans_thickness) + "");
        g.warn_s.set("offset", (w_thresh + this.trans_thickness) + "");
        g.warn_e.set("offset", (p_thresh - this.trans_thickness) + "");
        g.peak_s.set("offset", (p_thresh + this.trans_thickness) + "");
        g.peak_e.set("offset", "1");

        let gradient_t_index = {left: 0, right: 1, down: 3, up: 2}[this.orient];

        ["x1", "x2", "y1", "y2"].forEach((x, i) => {
            let v;
            if (i === gradient_t_index) {
                v = (i < 2) ? this.width : this.height;
            } else {
                v = 0;
            }
            this.gradient.set(x, v);
        });

        this.needs_gr_recalc = false;
    }

    drawFront(transforms) {
        this.checkDestroyed();
        this.calculateGradient(transforms);

        let gradient_id = this.gradient.get("id");
        let g = this.gradient;

        let tr = transforms.tr;

        switch (this._type) {
            case "m": {
                this.getLevel();

                let levels = this.levels;

                if (!levels.level) {
                    levels.level = new Rectangle(levels);
                    levels.level.fill = `url(#${gradient_id})`;
                }

                if (this.bar_mod_last > this.track_max) {
                    let reduce = Math.pow(1 - this.bar_descent_rate, (this.bar_mod_last - this.track_max) / 60);
                    this.bar *= reduce;
                }

                let max = arrayMax(this._level);
                let min = arrayMin(this._level);

                let all_max = Math.max(Math.abs(max), Math.abs(min));

                if (this.bar <= all_max) {
                    this.bar = all_max;
                    this.bar_mod_last = 0;
                }

                this.bar_mod_last++;


                setRect(levels.level, ...tr(0, 0), ...tr(1, all_max));

                if (!levels.bar) {
                    levels.bar = new Line(levels);
                    levels.bar.stroke = `url(#${gradient_id})`;
                }

                let rs = tr(0, this.bar);
                let re = tr(1, this.bar);

                if (rs[0] === this._last_bar_x1 && re[0] === this._last_bar_x2) {
                    levels.bar.y1 = rs[1];
                    levels.bar.y2 = re[1];
                } else {
                    [levels.bar.x1, levels.bar.y1] = rs;
                    [levels.bar.x2, levels.bar.y2] = re;
                }

                this._last_bar_x1 = rs[0];
                this._last_bar_x2 = re[0];

                if (this._last_bar_width !== this.bar_width)
                    levels.bar.strokeWidth = `${this.bar_width}px`;

                this._last_bar_width = this.bar_width;
            }
                break;
            case "s":
                this.getLLevel();
                this.getRLevel();

                if (!this.l_bar)
                    this.l_bar = 0;
                if (!this.r_bar)
                    this.r_bar = 0;
                if (!this.bar_mod_last)
                    this.bar_mod_last = 0;

                if (this.bar_mod_last > this.track_max) {
                    let reduce = Math.pow(1 - this.bar_descent_rate, (this.bar_mod_last - this.track_max) / 60);
                    this.l_bar *= reduce;
                    this.r_bar *= reduce;
                }

                let max = arrayMax(this._l_level);
                let min = arrayMin(this._l_level);

                let all_max = Math.max(Math.abs(max), Math.abs(min));

                if (this.l_bar <= all_max) {
                    this.l_bar = all_max;
                    this.bar_mod_last = 0;
                }

                let levels = this.levels;

                if (!levels.l_level) {
                    levels.l_level = new Rectangle(levels);
                    levels.l_level.fill = `url(#${gradient_id})`;
                }

                if (!levels.l_bar) {
                    levels.l_bar = new Line(levels);
                    levels.l_bar.stroke = `url(#${gradient_id})`;
                }

                setRect(levels.l_level, ...tr(0, 0), ...tr(0.465, all_max));

                let ls = tr(0, this.l_bar);
                let le = tr(0.465, this.l_bar);

                if (ls[0] === this._last_l_bar_x1 && le[0] === this._last_l_bar_x2) {
                    levels.l_bar.y1 = ls[1];
                    levels.l_bar.y2 = le[1];
                } else {
                    [levels.l_bar.x1, levels.l_bar.y1] = ls;
                    [levels.l_bar.x2, levels.l_bar.y2] = le;
                }

                this._last_l_bar_x1 = ls[0];
                this._last_l_bar_x2 = le[0];

                max = arrayMax(this._r_level);
                min = arrayMin(this._r_level);

                all_max = Math.max(Math.abs(max), Math.abs(min));

                if (this.r_bar <= all_max) {
                    this.r_bar = all_max;
                    this.bar_mod_last = 0;
                }

                this.bar_mod_last++;

                if (!levels.r_level) {
                    levels.r_level = new Rectangle(levels);
                    levels.r_level.fill = `url(#${gradient_id})`;
                }

                if (!levels.r_bar) {
                    levels.r_bar = new Line(levels);
                    levels.r_bar.stroke = `url(#${gradient_id})`;
                }

                setRect(levels.r_level, ...tr(.535, 0), ...tr(1, all_max));

                let rs = tr(.535, this.r_bar);
                let re = tr(1, this.r_bar);

                if (rs[0] === this._last_r_bar_x1 && re[0] === this._last_r_bar_x2) {
                    levels.r_bar.y1 = rs[1];
                    levels.r_bar.y2 = re[1];
                } else {
                    [levels.r_bar.x1, levels.r_bar.y1] = rs;
                    [levels.r_bar.x2, levels.r_bar.y2] = re;
                }

                this._last_r_bar_x1 = ls[0];
                this._last_r_bar_x2 = le[0];

                if (this._last_bar_width !== this.bar_width) {
                    levels.r_bar.strokeWidth = `${this.bar_width}px`;
                    levels.l_bar.strokeWidth = `${this.bar_width}px`;
                }

                this._last_bar_width = this.bar_width;

                break;
        }
    }

    getLLevel() {
        this.checkDestroyed();
        utils.assert(this.l_analyzer, "Incorrect mode for getLLevel call");

        if (!this._l_level || this._l_level.length !== this.l_analyzer.fftSize)
            this._l_level = new Float32Array(this.l_analyzer.fftSize);

        this.l_analyzer.getFloatTimeDomainData(this._l_level);
    }

    getRLevel() {
        this.checkDestroyed();
        utils.assert(this.r_analyzer, "Incorrect mode for getRLevel call");

        if (!this._r_level || this._r_level.length !== this.r_analyzer.fftSize)
            this._r_level = new Float32Array(this.r_analyzer.fftSize);

        this.r_analyzer.getFloatTimeDomainData(this._r_level);
    }

    getLevel() {
        this.checkDestroyed();
        utils.assert(this.analyzer, "Incorrect mode for getLevel call");

        if (!this._level || this._level.length !== this.analyzer.fftSize)
            this._level = new Float32Array(this.analyzer.fftSize);

        this.analyzer.getFloatTimeDomainData(this._level);
    }

    drawLoop() {
        this.checkDestroyed();
        if (!this.enabled)
            return;

        let transforms = this.getTransforms();

        this.drawBackground(transforms);
        this.drawFront(transforms);

        requestAnimationFrame(() => this.drawLoop());
    }

    set type(value) {
        this.checkDestroyed();
        utils.assert(Object.values(AudioLevelVisualizerType).includes(value));

        this._type = value;

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

    reset() {
        this.checkDestroyed();
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

        this.levels.remove();
        this.background.remove();

        this.background = new SVGGroup(this.element);
        this.levels = new SVGGroup(this.element);

        this.needs_gr_recalc = true;
        this.needs_bg_redraw = true;
    }

    drawBlank() {
        this.checkDestroyed();
        this.enabled = true;

        this.reset();

        this.drawLoop();
        this.enabled = false;
    }

    start() {
        this.checkDestroyed();
        this.enabled = true;

        this.drawLoop();
    }

    stop() {
        this.checkDestroyed();
        this.enabled = false;

        this.reset();
        this.drawBackground(this.getTransforms());
    }
}

export {CanvasLevelVisualizer, SVGLevelVisualizer};