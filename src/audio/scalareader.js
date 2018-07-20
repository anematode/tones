import { KeyboardPitches } from "./keyboardpitch.js";
import { Pitch, Interval } from "./pitch.js";
import { pitchMappingFromScale } from "./pitchmapping.js";

/*
parse scala expression to value
*/
function parseSclExpression(line) {
    line = line.trim().replace(/\s/g, ''); // remove whitespace

    let ret = null;

    for (let i = line.length; i > 0; i--) { // tries parsing starting at end
        let cut_line = line.slice(0, i);

        if (cut_line.includes(".")) { // period means value is in cents
            let value = parseFloat(cut_line);

            if (!isNaN(value)) {
                return new Interval({cents: value});
            }
        } else if (cut_line.includes("/")) { // vinculum means value is a ratio
            let fraction = cut_line.split("/");

            if (fraction.length === 2) {
                // make sure there's a numerator and denominator (when slicing right to left it might temporarily not be the case)
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
    
    // if it gets here it's invalid

    throw new Error(`parseSclExpression: Invalid expression ${line}`);
}

// get scale from scl file content
function sclFileToScale(file_content) {
    return parseSclFile(file_content).scale;
}

// parse an scl file to a description and intervals
function parseSclFile(file_content) {
    let file_lines = file_content.split('\n');
    let description = null;
    let note_count = null;
    let notes_in = 0;

    let notes = [];

    for (let i = 0; i < file_lines.length; i++) {
        if (file_lines[i][0] === "!") { // comment
            continue;
        }

        if (description === null) {
            description = file_lines[i];
        } else if (note_count === null) {
            try {
                note_count = parseInt(file_lines[i]); // second line is scale length
            } catch (e) {
                throw new Error("sclFileToScale: second non-comment line of file should be number of notes in scale");
            }
        } else {
            if (note_count !== null) { // if note count is read, the expression parsing can begin
                notes.push(parseSclExpression(file_lines[i]));
                notes_in += 1;

                if (notes_in >= note_count) { // parse until note count (though this shouldnt happen)
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

// convert scl file, base keyboardnote, and base keyboard frequency
function sclFileToPitchMapping(file_content, baseNote = KeyboardPitches.C4, baseFrequency) {
    baseFrequency = baseFrequency || new Pitch(baseNote.twelveTETFrequency());

    return pitchMappingFromScale(sclFileToScale(file_content), baseNote, baseFrequency);
}

// convert scale to scl file
function exportScaleAsScl(scale, description = "") {
    let out_string = "";

    out_string += description + '\n' + scale.length + '\n';
    for (let i = 0; i < scale.length; i++) {
        out_string += scale[i].cents().toFixed(9) + '\n';
    }

    return out_string;
}

/*
Class combining scl reading logic and an actual file reader

domElement -> input element in DOM
allowMultiple -> let multiple scl files
requireExtension -> require scl extension
onerror -> function if file reading fails
*/
class ScalaReader { // TODO include scala parsing in reader
    constructor(giveScalaFile, params = {}) {
        let that = this;

        params.domElement = params.domElement || null;
        params.allowMultiple = (params.allowMultiple === undefined) ? true : params.allowMultiple;
        params.requireExtension = (params.requireExtension === undefined) ? true : params.requireExtension;
        params.onerror = params.onerror || console.error;

        this.params = params;

        this.giveScalaFile = giveScalaFile; // arguments of function: arg1 -> content, arg2 -> name of file

        this.onchange = function() { // function when reading in file
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
            this.addTo(params.domElement); // add listener to given domElement
        }
    }

    addTo(domElement) {
        if (!this.domElement) {
            domElement.addEventListener("change", this.onchange);
            this.domElement = domElement;
        }
    }

    remove() { // remove from domElement
        this.domElement.removeEventListener("change", this.onchange);
    }
}

export {sclFileToScale, parseSclExpression, sclFileToPitchMapping, ScalaReader, parseSclFile }
