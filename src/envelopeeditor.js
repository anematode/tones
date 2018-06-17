let aQ = new TONES.EnvelopeSegment([0,0], [0.01,1]);
let bQ = new TONES.EnvelopeSegment(aQ.p2, [1, 0.2], 0.4);
let cQ = new TONES.EnvelopeSegment(bQ.p2, [2.1, 0.2]);
let dQ = new TONES.EnvelopeSegment(cQ.p2, [2.3, 0], 0.1);

let default_envelope = new TONES.Envelope([aQ,bQ,cQ,dQ]);

class EnvelopeEditor {
    constructor(parentElem, width = 640, height = 480, envelope = default_envelope) {
        if (!SVG.supported) {
            alert("SVG not supported by this browser!");
            throw new Error("SVG not supported by this browser!");
        }

        this.svg = SVG(parentElem);
        this.envelope = envelope;

    }

    onscroll(evt) {
        console.log(evt);
    }

    startRenderLoop() {
        this.renderLoopEnabled = true;
        requestAnimationFrame(this.renderLoop);
    }

    stopRenderLoop() {
        this.renderLoopEnabled = false;
    }

    renderLoop() {
        if (this.renderLoopEnabled) {
            this.render();
            requestionAnimationFrame(this.renderLoop);
        }
    }

    render() {
    }



}

export { EnvelopeEditor };