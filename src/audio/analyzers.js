import * as audio from "./audio.js";
import * as utils from "../utils.js";
import { EndingNode } from "./node.js";

/*
This class wraps the Web Audio API's analyzer node
 */
class SimpleFFT extends EndingNode {
    /*
    Parameters:

    fftSize = size of the fft,
    sTC = smoothing time constant of the fft
     */
    constructor(params = {}) {
        super();

        this.analyzer = audio.Context.createAnalyser();

        this.entry.connect(this.analyzer);

        this.analyzer.fftSize = params.fftSize || 16384;
        this.analyzer.smoothingTimeConstant = params.sTC || 0.3;

        this.bufferLength = this.analyzer.frequencyBinCount;
        this.buffer = new Uint8Array(this.bufferLength);
    }

    /*
    Copy the frequency data, as bins from [0, ..., nyquist] in decibels, to Float32Array buffer
     */
    getFloatFrequencyData(buffer) {
        this.analyzer.getFloatFrequencyData(buffer);
    }

    /*
    Copy the frequency data, as bins from [0, ..., nyquist] in decibels scaled to [0, ..., 255], to Uint8Array buffer
     */
    getByteFrequencyData(buffer) {
        this.analyzer.getByteFrequencyData(buffer);
    }

    // Size of returned frequencies
    get frequencyBinCount() {
        return this.bufferLength;
    }

    // Copy to internal buffer
    computeAll() {
        this.analyzer.getByteFrequencyData(this.buffer);
    }

    // Output with more context for easier use
    getFrequencies() {
        this.computeAll();

        return {
            values: this.buffer,  // Frequency values
            min_freq: 0, // Smallest frequency
            max_freq: audio.Context.sampleRate / 2, // Nyquist frequency, max frequency
            bin_size: audio.Context.sampleRate / 2 / this.bufferLength // Size in Hz of each bin
        }
    }

    /*
    The Nyquist frequency, or half the sample rate. This frequency is the maximum frequency outputted by the FFT
     */
    nyquist() {
        return audio.Context.sampleRate / 2;
    }

    /*
    The resolution, in hertz, or the bin size
     */
    resolution() {
        return audio.Context.sampleRate / 2 / this.bufferLength;
    }

    /*
    Frequency at which a semitone becomes indistinguishable (in the sense that two adjacent frequencies near this point
    differing by a semitone would nominally fall into the same bin)
     */
    semitoneBlurred() {
        return this.resolution() / SEMITONE;
    }
}

/*
This class allows live audio to be downsampled and sent to an array
 */
class Downsampler extends EndingNode {
    /*
    Parameters:

    rate = delta between consecutive samples taken,
    size = size of the buffer keeping track of previous samples
     */
    constructor(params = {}) {
        super();

        this.sample_delta = Math.max(1, Math.round((params.rate !== undefined) ? params.rate : 20));

        this.tracked_length = Math.max(256, (params.size) ? params.size : 1024); // Size of the script processor window

        this.processor = audio.Context.createScriptProcessor(this.tracked_length, 2, 1); // Create a script processor with one input and one (void) output
        this.index = 0;

        this.circular_buffer = new Float32Array(this.tracked_length); // This circular buffer will temporally start at dataWriteIndex and wrap around
        this.dataWriteIndex = 0;

        this.entry.connect(this.processor);

        this.processor.onaudioprocess = (event) => {
            let channel_count = event.inputBuffer.numberOfChannels;
            let channels = []; // Use all channels

            for (let i = 0; i < channel_count; i++) {
                channels.push(event.inputBuffer.getChannelData(i));
            }

                let prev_index = -2;
                let index = -1;

                while (index > prev_index) { // If the previous index is larger than the new index, the new index lies outside of the current window
                    prev_index = index;
                    index = this.getNextIndex(); // Index tells us where to get the sample from

                    let sum = 0;

                    for (let i = 0; i < channel_count; i++) { // Add up the channel data
                        sum += channels[i][index];
                    }

                    this.writeData(sum); // Write to the circular buffer
                }

                this.backCycle(); // We went one index too far, so go back by one
        };

        this.processor.connect(TONES.voidNode); // Connect to the void node so the processor actually runs
    }

    backCycle() { // Jump back one step after ending a window
        this.index += this.tracked_length - this.sample_delta;
        this.dataWriteIndex--;

        if (this.dataWriteIndex < 0) { // If the dataWriteIndex should wrap around
            this.dataWriteIndex = this.tracked_length - 1;
        }
    }

    getNextIndex() {
        this.index += this.sample_delta;
        this.index %= this.tracked_length; // Modulo tracked_length so it always stays in the range of the window

        return this.index;
    }

    writeData(d) {
        let index = this.dataWriteIndex++;
        this.dataWriteIndex %= this.tracked_length; // Circulate the dataWriteIndex

        this.circular_buffer[index] = d;
    }

    getData() { // Get the data as a Float32Array, but aligned correctly (not circular)
        let flattened_data = new Float32Array(this.tracked_length);

        this.writeDataTo(flattened_data);

        return flattened_data;
    }

    writeDataTo(array) { // Write the de-circularized data to an array
        let max_index = this.dataWriteIndex;

        if (array instanceof Float32Array) { // If the array is a Float32Array, use built-in methods to copy
            if (max_index < this.tracked_length - 1) // Array
                array.set(this.circular_buffer.subarray(max_index, this.tracked_length), 0);
            if (max_index > 0)
                array.set(this.circular_buffer.subarray(0, max_index), this.tracked_length - max_index);
            return;
        }

        let j = 0;

        for (let i = max_index; i < this.tracked_length; i++, j++) {
            array[j] = this.circular_buffer[i];
        }

        for (let i = 0; i < max_index; i++, j++) {
            array[j] = this.circular_buffer[i];
        }
    }
}

// https://gist.github.com/mbitsnbites/a065127577ff89ff885dd0a932ec2477
function computeFFTInPlace(x_real, x_imag) {
    let middle = x_real.length / 2;
    let X_r = [], X_i = [], Y_r = [], Y_i = [];

    for (let i = 0; i < middle; i++) {
        X_r[i] = x_real[2 * i];
        Y_r[i] = x_real[2 * i + 1];
        X_i[i] = x_imag[2 * i];
        Y_i[i] = x_imag[2 * i + 1];
    }

    if (middle > 1) {
        computeFFTInPlace(X_r, X_i);
        computeFFTInPlace(Y_r, Y_i);
    }

    for (let i = 0; i < middle; ++i) {
        let a = -Math.PI * i / middle,
            tw_re = Math.cos(a),
            tw_im = Math.sin(a),
            b = tw_re * Y_i[i] + tw_im * Y_r[i];

        a = tw_re * Y_r[i] - tw_im * Y_i[i];

        x_real[i] = X_r[i] + a;
        x_imag[i] = X_i[i] + b;
        x_real[i + middle] = X_r[i] - a;
        x_imag[i + middle] = X_i[i] - b;
    }
}

function clampUint8(x) {
    if (x > 255)
        x = 255;
    else if (x < 0)
        x = 0;
    return parseInt(Math.round(x));
}

const SEMITONE = Math.pow(2, 1/12) - 1;

const dbMin = -100;
const dbMax = -30;

class DownsamplerFFT extends Downsampler {
    constructor(params = {}) {
        super(params);

        let fftReal = new Float32Array(this.tracked_length);
        let fftImag = fftReal.slice();

        this.fftReal = fftReal;
        this.fftImag = fftImag;

        this.buffer = new Float32Array(this.tracked_length / 2);
        this.buffer.fill(0);

        this.smoothingTimeConstant = (params.sTC !== undefined) ? params.sTC : 0.5;
    }

    resetImag() {
        this.fftImag.fill(0);
    }

    read() {
        this.writeDataTo(this.fftReal);
        this.resetImag();
    }

    smoothFFT() {
        let N = this.tracked_length;

        let real = this.fftReal;
        let old = this.buffer;

        for (let i = 0; i < N / 2; i++) {
            real[i] *= 1 - this.smoothingTimeConstant;
            real[i] += old[i] * this.smoothingTimeConstant;
        }

        this.buffer.set(real.subarray(0, N / 2));
    }

    computeFFT() {
        let N = this.tracked_length;

        let real = this.fftReal;
        let imag = this.fftImag;

        computeFFTInPlace(real, imag);

        for (let i = 0; i < N / 2; i++) {
            real[i] = Math.sqrt((real[i] * real[i] + imag[i] * imag[i])) / N;
        }

        this.smoothFFT();
    }

    computeWindow() {
        let N = this.tracked_length;

        let a = 0.16;
        let a0 = (1 - a) / 2;
        let a1 = 1 / 2;
        let a2 = a / 2;

        for (let i = 0; i < N; i++) {
            this.fftReal[i] *= a0 - a1 * Math.cos(2 * Math.PI * i / N) + a2 * Math.cos(4 * Math.PI * i / N);
        }
    }

    decibelConvert() {
        let real = this.fftReal;

        for (let i = 0; i < this.tracked_length / 2; i++) {
            real[i] = Math.log10(real[i] + 1e-40) * 20;
        }
    }

    computeAll() {
        this.read();
        this.computeWindow();
        this.computeFFT();
        this.decibelConvert();
    }

    get frequencyBinCount() {
        return this.tracked_length / 2;
    }

    getByteFrequencyData(array) {
        this.computeAll();

        let real = this.fftReal;
        for (let i = 0; i < this.tracked_length / 2; i++) {
            array[i] = clampUint8(Math.floor(255 / (dbMax - dbMin) * (real[i] - dbMin)))
        }
    }

    getFloatFrequencyData(array) {
        this.computeAll();

        let real = this.fftReal;
        for (let i = 0; i < this.tracked_length / 2; i++) {
            array[i] = real[i];
        }
    }

    getFrequencies() {
        let buffer = new Float32Array(this.tracked_length);
        this.getByteFrequencyData(buffer);

        return {
            values: buffer,
            min_freq: 0,
            max_freq: audio.Context.sampleRate / 2 / this.sample_delta, // Nyquist
            bin_size: audio.Context.sampleRate / 2 / this.tracked_length / this.sample_delta
        }
    }

    nyquist() {
        return audio.Context.sampleRate / 2 / this.sample_delta;
    }

    resolution() {
        return audio.Context.sampleRate / 2 / this.tracked_length / this.sample_delta;
    }

    semitoneBlurred() {
        return this.resolution() / SEMITONE;
    }
}

function powerOfTwo(x) {
    return Math.log2(x) % 1 === 0;
}

let g = 0;

class MultilayerFFT extends EndingNode {
    constructor(params = {}) {
        throw new Error("WIP");

        super();

        this.size = params.size || 4096;
        this.layers = params.layers || 4;

        if (this.layers > 8)
            throw new Error("too many layers");

        if (!powerOfTwo(this.size))
            throw new Error("FFT must be power of two in size");

        this.ffts = [];
        this.arrays = [];

        let main_fft = new SimpleFFT({
            fftSize: this.size
        });

        this.entry.connect(main_fft.entry);

        this.ffts.push(main_fft);

        for (let i = 1; i < this.layers; i++) {
            let downsampler_fft = new DownsamplerFFT({
                size: this.size,
                rate: Math.pow(2, i)
            });

            this.entry.connect(downsampler_fft.entry);

            this.ffts.push(downsampler_fft);
        }
    }

    computeAll() {
        for (let i = 0; i < this.ffts.length; i++) {
            if (this.arrays[i])
                this.ffts[i].getByteFrequencyData(this.arrays[i]);
            else
                this.arrays[i] = new Uint8Array(this.ffts[i].frequencyBinCount);
        }
    }

    getValue(frequency) {
        let sum = 0;
        let count = 0;

        for (let i = 0; i < this.layers; i++) {
            let fft = this.ffts[i];
            let buffer = this.arrays[i];

            if ((frequency < fft.nyquist() / 3 || i === 0)) {
                let nearest_i = Math.round(frequency / fft.nyquist() * buffer.length);
                let factor = Math.max((frequency / fft.semitoneBlurred()) - 1, 0.02);

                sum += buffer[nearest_i] * factor;
                count += factor;
            }
        }

        if (count === 0) {
            return 0;
        }

        return sum / count;
    }
}

export { SimpleFFT, Downsampler, computeFFTInPlace as computeFFT, DownsamplerFFT, MultilayerFFT};
