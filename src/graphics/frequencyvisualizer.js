import * as audio from "../audio/audio.js";
import {SimpleFFT} from "../audio/analyzers.js";

const HEX_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

function toHex(num) {
    if (num === 0)
        return "00";
    if (num < 16)
        return HEX_DIGITS[num];
    return HEX_DIGITS[parseInt(num / 16)] + HEX_DIGITS[num % 16];
}

const MIN_FREQ = 40;
const MAX_FREQ = 16000;
const MIN_FREQ_LOG2 = Math.log2(MIN_FREQ);
const MAX_FREQ_LOG2 = Math.log2(MAX_FREQ);
const FREQ_DIFF = MAX_FREQ_LOG2 - MIN_FREQ_LOG2;

function transformUnit(x) {
    return Math.pow(2, MIN_FREQ_LOG2 + FREQ_DIFF * x);
}

const vsSource = `
    attribute vec4 aVertexPosition;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;

const fsSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
	precision highp float;
  #else
    precision mediump float;
  #endif
  

  uniform vec2 resolution;
  uniform sampler2D uSampler;
  uniform vec2 textureSize;
  

vec4 getValueFromTexture(float index) {
   float column = mod(index, textureSize.x);
   float row    = floor(index / textureSize.x);
   vec2 uv = vec2(
      (column + 0.5) / textureSize.x,
      (row    + 0.5) / textureSize.y);
   return texture2D(uSampler, uv);
}
 
  void main() {
	highp vec2 position = ( gl_FragCoord.xy / resolution.xy );
	vec4 color = texture2D(uSampler, position);
	
	gl_FragColor = getValueFromTexture(position.x * textureSize.x * textureSize.x);//vec4(position.x * 2.0, ian, ian, 1.0);
  }
  `;


// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
function loadShader(ctx, type, source) {
    const shader = ctx.createShader(type);

    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);

    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
        setTimeout(() => ctx.deleteShader(shader), 1);
        throw new Error('An error occurred compiling the shaders: ' + ctx.getShaderInfoLog(shader));
    }

    return shader;
}

function initShaderProgram(ctx, vertex_shader, fragment_shader) {
    const vertexShader = loadShader(ctx, ctx.VERTEX_SHADER, vertex_shader);
    const fragmentShader = loadShader(ctx, ctx.FRAGMENT_SHADER, fragment_shader);

    const shaderProgram = ctx.createProgram();
    ctx.attachShader(shaderProgram, vertexShader);
    ctx.attachShader(shaderProgram, fragmentShader);
    ctx.linkProgram(shaderProgram);

    if (!ctx.getProgramParameter(shaderProgram, ctx.LINK_STATUS)) {
        throw new Error('Unable to initialize the shader program: ' + ctx.getProgramInfoLog(shaderProgram));
    }

    return shaderProgram;
}

class FrequencyVisualizer extends SimpleFFT {
    constructor(params = {}) {
        super(params);

        if (params.domElement) {
            this.setCanvas(params.domElement);
        }

        this.color = params.color || {
            r: 250,
            g: 175,
            b: 162
        };

        this.opacity = params.opacity || 255;

        this.draw_loop_enabled = false;
    }

    clearCanvas() {
        let ctx = this.ctx;

        ctx.clearColor(0.0, 0.0, 0.0, 1.0);
        ctx.clear(ctx.COLOR_BUFFER_BIT);

        ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
    }

    updateBuffer() {
        this.analyzer.getByteFrequencyData(this.buffer);
    }

    startDrawLoop() {
        this.draw_loop_enabled = true;
        this.drawLoop();
    }

    drawLoop() {
        this.updateBuffer();
        this.drawScene();

        if (this.draw_loop_enabled) {
            window.requestAnimationFrame(() => {
                this.drawLoop();
            });
        }
    }

    stopDrawLoop() {
        this.draw_loop_enabled = false;
    }

    drawScene() {
        let ctx = this.ctx;

        let program_info = this.program_info;
        let buffers = this.buffers;

        this.clearCanvas();

        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffers.position);
        ctx.vertexAttribPointer(program_info.attribLocations.vertexPosition, 2, ctx.FLOAT, false, 0, 0);
        ctx.enableVertexAttribArray(program_info.attribLocations.vertexPosition);

        let proj_matrix = new Float32Array([
            0.943,  0,      0,      0,
            0,      2.414,  0,      0,
            0,      0,      -1.002, -1,
            0,      0,      -0.200, 0
        ]);

        let model_matrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, -1, 1
        ]);

        if (!this.active_texture) {
            this.active_texture = ctx.createTexture();
        }

        ctx.useProgram(program_info.program);

        ctx.uniformMatrix4fv(
            program_info.uniformLocations.projectionMatrix,
            false,
            proj_matrix);
        ctx.uniformMatrix4fv(
            program_info.uniformLocations.modelViewMatrix,
            false,
            model_matrix);
        ctx.uniform2fv(
            program_info.uniformLocations.resolution,
            [this.canvas.width, this.canvas.height]
        );

        let texture_size = 64;
        let s_size = texture_size * texture_size;

        let nyquist = audio.Context.sampleRate / 2;
        let buffer = this.buffer;

        let color_array = this._image ? this._image.data : new Uint8ClampedArray(4 * s_size);
        let r = this.color.r / 256.;
        let g = this.color.g / 256.;
        let b = this.color.b / 256.;

        for (let i = 0; i < s_size; i++) {
            let x = transformUnit(i / s_size);
            let nearest_i = Math.round(x / nyquist * buffer.length);

            if (nearest_i < 0 || nearest_i > buffer.length)
                continue;

            let value = parseInt(buffer[nearest_i]);
            value *= value / 256;

            color_array[4 * i] = value * r;
            color_array[4 * i + 1] = value * g;
            color_array[4 * i + 2] = value * b;
            color_array[4 * i + 3] = this.opacity;
        }

        let image = this._image ? this._image : new ImageData(color_array, texture_size, texture_size);
        if (!this._image)
            this._image = image;

        ctx.activeTexture(ctx.TEXTURE0);

        ctx.bindTexture(ctx.TEXTURE_2D, this.active_texture);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, image);

        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);

        ctx.uniform1i(program_info.uniformLocations.uSampler, 0);
        ctx.uniform2fv(program_info.uniformLocations.textureSize, [texture_size,texture_size]);

        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);
    }

    makeQuad() {
        let ctx = this.ctx;

        const positionBuffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer);

        const positions = [
            -9.0, 9.0,
            9.0, 9.0,
            -9.0, -9.0,
            9.0, -9.0,
        ];

        ctx.bufferData(ctx.ARRAY_BUFFER,
            new Float32Array(positions),
            ctx.STATIC_DRAW);

        return {
            position: positionBuffer,
        };
    }

    setCanvas(canvas) {
        let ctx = (canvas.getContext("webgl"));

        if (!ctx)
            throw new Error("WebGL not supported");

        this.canvas = canvas;
        this.ctx = ctx;

        let shaderProgram = initShaderProgram(ctx, vsSource, fsSource);
        this.shaderProgram = shaderProgram;

        ctx.enable(ctx.DEPTH_TEST);

        this.program_info = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: ctx.getAttribLocation(shaderProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                projectionMatrix: ctx.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: ctx.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                uSampler: ctx.getUniformLocation(shaderProgram, 'uSampler'),
                resolution: ctx.getUniformLocation(shaderProgram, 'resolution'),
                textureSize: ctx.getUniformLocation(shaderProgram, 'textureSize')
            },
        };

        this.buffers = this.makeQuad();
    }
}

export {FrequencyVisualizer};