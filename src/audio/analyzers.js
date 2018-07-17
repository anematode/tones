import * as audio from "./audio.js";
import * as utils from "../utils.js";
import { EndingNode } from "./node.js";

class SimpleFFT extends EndingNode {
    constructor(params = {}) {
        super();

        this.analyzer = audio.Context.createAnalyser();

        this.entry.connect(this.analyzer);

        this.analyzer.fftSize = params.fftSize || 8192;
        this.analyzer.smoothingTimeConstant = params.sTC || 0.3;

        this.bufferLength = this.analyzer.frequencyBinCount;
        this.buffer = new Uint8Array(this.bufferLength);
    }

    getFrequencies() {
        this.analyzer.getByteFrequencyData(this.buffer);

        return {
            values: this.buffer,
            min_freq: 0,
            max_freq: audio.Context.samplingRate / 2, // Nyquist
            bin_size: audio.Context.samplingRate / 2 / this.buffer.length
        }
    }
}

export { SimpleFFT };
