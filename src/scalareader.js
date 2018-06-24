import { KeyboardInterval, KeyboardPitches } from "./keyboardnote.js";
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

    throw new Error(`parseSclExpression: Invalid expression ${line}`)
}

function sclFileToScale(file_content) {
    let file_lines = file_content.split('\n');
    let description = null;
    let note_count = null;

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
            }
        }
    }


    if (notes.length !== note_count) {
        throw new Error("sclFileToScale: scale size and given scale do not match in size");
    }

    return notes;
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
    constructor(giveScalaFile, domElement = null) {
        let that = this;
        this.giveScalaFile = giveScalaFile;

        this.onchange = function() {
            let files = this.files;
            let file = files[0];

            if (!file) {
                throw new Error("No file selected.");
            }

            if (!file.name.endsWith(".scl")) {
                throw new Error("Invalid file extension.");
            }

            let reader = new FileReader();
            reader.addEventListener("loadend", function() {
                that.giveScalaFile(reader.result);
            });
            reader.readAsText(file);
        };

        if (domElement) {
            this.addTo(domElement);
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

export {sclFileToScale, parseSclExpression, sclFileToPitchMapping, ScalaReader }