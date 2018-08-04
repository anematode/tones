import {ScoreContext, ScoreGroup} from "../basescore.js";
import * as utils from "../../../utils.js";
import DEFAULTS from "../scorevalues.js";

import {Circle, Path, Translation} from "../../svgmanip";

/*
Properties:

barline_type -> type of barline, one of
normal: simple line
none: no line
right_double: two lines, right side
left_double: two lines, left side
dashed: dashed line
right_ending: ending symbol
left_ending: left ending symbol
right_repeat: repeat symbol
left_repeat: left repeat symbol
height -> height of the barline
arg1 -> used for special arguments to the barline_type
Interpretation:
normal: N/A
none: N/A
left_double / right_double: spacing between lines
left_ending / right_ending: spacing between lines
left_repeat / right_repeat: spacing between lines
arg2 -> used for special arguments to the barline_type
normal: N/A
none: N/A
left_double / right_double: N/A
left_ending / right_ending: N/A
left_repeat / right_repeat: array of centered positions to put the dots
arg3 -> used for special arguments to the barline_type
normal: N/A
none: N/A
left_double / right_double: N/A
left_ending / right_ending: N/A
left_repeat / right_repeat: width of each dot pair
 */

class Barline extends ScoreGroup {
    constructor(parent, params) {

        super(parent);

        // Parameters
        this.barline_type = params.barline_type || "normal";
        this.height = params.height || DEFAULTS.MEASURE_HEIGHT;
        this.offset_x = (params.offset_x !== undefined) ? params.offset_x : 0;
        this.arg1 = (params.arg1 !== undefined) ? params.arg1 : 0;
        this.arg2 = params.arg2;
        this.arg3 = params.arg3;

        // Internals
        this.components = [];
        this.translation = new Translation(this.offset_x);
        this.addTransform(this.translation);

        this.recalculate();
    }

    recalculate() {
        // Destroy old components
        this.components.forEach(x => x.destroy());
        this.components = [];

        // Update translation
        this.translation.x = this.offset_x;

        utils.assert(this.height > 0, "Height must be positive");
        let o_x = 0;
        let r_x = 1;

        switch (this.barline_type) {
            case "none":
                return;
            case "normal":
                let path = new Path(this, `M 0 0 L 0 ${this.height}`);
                path.addClass("barline-normal");
                this.components.push(path);
                break;
            case "left_double": // makes o_x = -1
                o_x += -2;
            case "right_double":  // makes o_x = 1
                o_x += 1;
            case "center_double": // o_x = 0
                var width = this.arg1 || 5;
                var f_x = width / 2 * (o_x - 1);
                var s_x = width / 2 * (o_x + 1);

                utils.assert(width > 0, "Width of double barline must be positive");

                let lpath = new Path(this, `M ${s_x} 0 L ${s_x} ${this.height} M ${f_x} 0 L ${f_x} ${this.height}`);
                lpath.addClass("barline-double");
                this.components.push(lpath);

                break;
            case "dashed":
                let dashedpath = new Path(this, `M 0 0 L 0 ${this.height}`);
                dashedpath.addClass("barline-dashed");
                this.components.push(dashedpath);
                break;
            case "left_ending":
                var width = 2 + (this.arg1 || 7);

                utils.assert(width > 0, "Width of ending barline must be positive");

                var thickpath = new Path(this, `M 2.5 0 L 2.5 ${this.height}`);
                thickpath.addClass("barline-ending-thick");
                var thinpath = new Path(this, `M ${width} 0 L ${width} ${this.height}`);
                thinpath.addClass("barline-ending-thin");

                this.components.push(thickpath);
                this.components.push(thinpath);

                break;

            case "right_ending":
                var width = 2 + (this.arg1 || 7);

                utils.assert(width > 0, "Width of ending barline must be positive");

                width *= -1;

                var thickpath = new Path(this, `M -2.5 0 L -2.5 ${this.height}`);
                thickpath.addClass("barline-ending-thick");
                var thinpath = new Path(this, `M ${width} 0 L ${width} ${this.height}`);
                thinpath.addClass("barline-ending-thin");

                this.components.push(thickpath);
                this.components.push(thinpath);

                break;
            case "right_repeat":
                o_x += 2.5;
            case "center_right_repeat":
                r_x = -1;
            case "center_left_repeat":
                o_x -= 2.5;
            case "left_repeat":
                // Lines
                var arg1 = (this.arg1 || 7);
                var width = (2.5 + o_x) + arg1;
                var thick_x = 2.5 + o_x;

                utils.assert(width > 0, "Width of ending barline must be positive");

                width *= r_x;
                thick_x *= r_x;
                arg1 *= r_x;

                var thickpath = new Path(this, `M ${thick_x} 0 L ${thick_x} ${this.height}`);
                thickpath.addClass("barline-ending-thick");
                var thinpath = new Path(this, `M ${width} 0 L ${width} ${this.height}`);
                thinpath.addClass("barline-ending-thin");

                this.components.push(thickpath);
                this.components.push(thinpath);

                // Dots
                var y_pos = (this.arg2 !== undefined) ? this.arg2 : [2 * DEFAULTS.STAFF_LINE_SEPARATION];
                var dot_sep = (this.arg3 !== undefined) ? this.arg3 : DEFAULTS.STAFF_LINE_SEPARATION;
                var x = 2.5 + o_x + 1.8 * arg1;

                for (let i = 0; i < y_pos.length; i++) {
                    let y = y_pos[i];

                    let dot1 = new Circle(this, x, y - dot_sep / 2);
                    dot1.addClass("barline-repeat-circle");
                    let dot2 = new Circle(this, x, y + dot_sep / 2);
                    dot2.addClass("barline-repeat-circle");

                    this.components.push(dot1);
                    this.components.push(dot2);
                }

                break;
        }
    }

    getParams() {
        return {
            barline_type: this.barline_type,
            height: this.height,
            offset_x: this.offset_x,
            arg1: this.arg1,
            arg2: this.arg2,
            arg3: this.arg3
        };
    }

    get minY() {
        return 0;
    }

    get maxY() {
        return this.height;
    }
}

export {Barline};