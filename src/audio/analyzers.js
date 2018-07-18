import * as audio from "./audio.js";
import * as utils from "../utils.js";
import { EndingNode } from "./node.js";

class SimpleFFT extends EndingNode {
    constructor(params = {}) {
        super();

        this.analyzer = audio.Context.createAnalyser();

        this.entry.connect(this.analyzer);

        this.analyzer.fftSize = params.fftSize || 16384;
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

// This is a tiny radix-2 FFT implementation in JavaScript.
// The function takes a complex valued input signal, and performs an in-place
// Fast Fourier Transform (i.e. the result is returned in x_re, x_im). The
// function arguments can be any Array type (including typed arrays).
// Code size: <300 bytes after Closure Compiler.
function FFT(x_re, x_im) {
    var m = x_re.length / 2, k, X_re = [], X_im = [], Y_re = [], Y_im = [],
        a, b, tw_re, tw_im;

    for (k = 0; k < m; ++k) {
        X_re[k] = x_re[2 * k];
        X_im[k] = x_im[2 * k];
        Y_re[k] = x_re[2 * k + 1];
        Y_im[k] = x_im[2 * k + 1];
    }

    if (m > 1) {
        FFT(X_re, X_im);
        FFT(Y_re, Y_im);
    }

    for (k = 0; k < m; ++k) {
        a = -Math.PI * k / m, tw_re = Math.cos(a), tw_im = Math.sin(a);
        a = tw_re * Y_re[k] - tw_im * Y_im[k];
        b = tw_re * Y_im[k] + tw_im * Y_re[k];
        x_re[k] = X_re[k] + a;
        x_im[k] = X_im[k] + b;
        x_re[k + m] = X_re[k] - a;
        x_im[k + m] = X_im[k] - b;
    }
}

class Downsampler extends EndingNode {
    constructor(params = {}) {
        super();

        this.sample_delta = Math.max(1, Math.round((params.sdelta !== undefined) ? params.sdelta : 5));
        this.tracked_length = Math.max(256, (params.tracked_length) ? params.tracked_length : 1024);
        this.processor = audio.Context.createScriptProcessor(256, 1, 1); // Create a script processor with one input and one output
        this.index = 0;

        this.data = new Float32Array(this.tracked_length);
        this.dataWriteIndex = 0;

        this.entry.connect(this.processor);

        this.processor.onaudioprocess = (event) => {

            let input = event.inputBuffer.getChannelData(0);

            let prev_index = -2;
            let index = -1;

            while (index > prev_index) {
                prev_index = index;
                index = this.getNextIndex();

                this.writeData(input[index]);
            }
        };

        this.processor.connect(TONES.voidNode);
    }

    getNextIndex() {
        this.index += this.sample_delta;
        this.index %= 256;

        return this.index;
    }

    writeData(d) {
        let index = this.dataWriteIndex++;
        this.dataWriteIndex %= this.tracked_length;

        this.data[index] = d;
    }
}

export { SimpleFFT, Downsampler };
