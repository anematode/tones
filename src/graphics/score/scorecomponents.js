

class Clef extends Path {
    constructor(parent, d) {
        utils.assert(parent instanceof Staff);

        super(parent, d);
    }
}

let CLEFS = {
    TREBLE: TREBLE_PATH
};

class Accidental extends ScoreGroup {

}

class Note extends ScoreGroup {

}

class Chord extends ScoreGroup {

}