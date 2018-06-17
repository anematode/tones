import * as audio from "./audio.js";
import { Instrument } from "./instrument.js"

import { Envelope, EnvelopeSegment } from "./envelope.js"

class SimpleInstrument extends Instrument {
    constructor(destinationNode = audio.masterEntryNode) {
        super(destinationNode);

        
    }
}