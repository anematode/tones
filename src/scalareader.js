import { KeyboardInterval, KeyboardPitches } from "./keyboardpitch.js";
import { Pitch, Interval } from "./pitch.js";
import { PitchMapping, pitchMappingFromScale } from "./pitchmapping.js";

function parseSclExpression(line) {
    line = line.trim().replace(/\s/g, '');

    let ret = null;

    for (let i = line.length; i > 0; i--) {
        let cut_line = line.slice(0, i);

        if (cut_line.includes(".")) { // value is in cents
            let value = parseFloat(cut_line);

            if (!isNaN(value)) {
                return new Interval({cents: value});
            }
        } else if (cut_line.includes("/")) { // value is a ratio
            let fraction = cut_line.split("/");

            if (fraction.length === 2) {
                let num = parseInt(fraction[0]), din = parseInt(fraction[1]);

                if (!isNaN(num) && !isNaN(din) && num > 0 && din > 0) {
                    return new Interval(num / din);
                }
            }
        } else { // Value is an integer
            let value = parseInt(cut_line);

            if (!isNaN(value)) {
                return new Interval(value);
            }
        }
    }

    console.log(line);

    throw new Error(`parseSclExpression: Invalid expression ${line}`);
}

function sclFileToScale(file_content) {
    return parseSclFile(file_content).scale;
}

function parseSclFile(file_content) {
    let file_lines = file_content.split('\n');
    let description = null;
    let note_count = null;
    let notes_in = 0;

    let notes = [];

    for (let i = 0; i < file_lines.length; i++) {
        if (file_lines[i][0] === "!") {
            continue;
        }


        if (description === null) {
            description = file_lines[i];
        } else if (note_count === null) {
            try {
                note_count = parseInt(file_lines[i]);
            } catch (e) {
                throw new Error("sclFileToScale: second non-comment line of file should be number of notes in scale");
            }
        } else {
            if (note_count !== null) {
                notes.push(parseSclExpression(file_lines[i]));
                notes_in += 1;

                if (notes_in >= note_count) {
                    break;
                }
            }
        }
    }


    if (notes.length !== note_count) {
        throw new Error("sclFileToScale: scale size and given scale do not match in size");
    }

    return {desc: description, scale: notes};
}

function sclFileToPitchMapping(file_content, baseNote = KeyboardPitches.C4, baseFrequency) {
    baseFrequency = baseFrequency || new Pitch(baseNote.twelveTETFrequency());

    return pitchMappingFromScale(sclFileToScale(file_content), baseNote, baseFrequency);
}

function exportScaleAsScl(scale, description = "") {
    let out_string = "";

    out_string += description + '\n' + scale.length + '\n';
    for (let i = 0; i < scale.length; i++) {
        out_string += scale[i].cents().toFixed(9) + '\n';
    }

    return out_string;
}

class ScalaReader {
    constructor(giveScalaFile, params = {}) {
        let that = this;

        params.domElement = params.domElement || null;
        params.allowMultiple = (params.allowMultiple === undefined) ? true : params.allowMultiple;
        params.requireExtension = (params.requireExtension === undefined) ? true : params.requireExtension;
        params.onerror = params.onerror || (() => null);

        this.params = params;

        this.giveScalaFile = giveScalaFile; // arg1 -> content, arg2 -> name of file

        this.onchange = function() {
            let files = this.files;

            if (!that.params.allowMultiple && files.length > 1) {
                that.params.onerror(new Error("Only one file allowed."));
            }

            for (let i = 0; i < files.length; i++) {
                let file = files[i];

                if (!file) {
                    that.params.onerror(new Error("No file selected."));
                }

                if (that.params.requireExtension && !file.name.endsWith(".scl")) {
                    that.params.onerror(new Error("Invalid file extension."));
                }

                let reader = new FileReader();
                reader.addEventListener("loadend", function () {
                    that.giveScalaFile(reader.result, file.name);
                });
                reader.readAsText(file);
            }
        };

        if (params.domElement) {
            this.addTo(params.domElement);
        }
    }

    addTo(domElement) {
        if (!this.domElement) {
            domElement.addEventListener("change", this.onchange);
            this.domElement = domElement;
        }
    }

    remove() {
        this.domElement.removeEventListener("change", this.onchange);
    }
}

export {sclFileToScale, parseSclExpression, sclFileToPitchMapping, ScalaReader, parseSclFile }