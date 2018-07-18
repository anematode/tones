## parseGroup

parseGroup allows the input of precise note sequences to be transformed into instances of the NoteGroup class. This comes in the form of a function called parseGroup, which takes in a string and returns a NoteGroup containing the specified notes. Note that a NoteGroup deals entirely in beats, not seconds. If this behavior is desired, a simple solution is to set the TimeContext's bpm value to 60.

### General Behavior

Lines ending in comments, which start with a "#", are ignored starting at the # character. All whitespace, including newlines and tabs, is ignored.

### General Format

```
[(A4{v:0.5}C4E4){d:q}] # quarter note long, A minor chord with a lighter bass note
(B4){d:e} # eighth note long, coming after previous chord
(C4)(D4){v:0.5}(C4) # All are eighth note long because that was previous length
(B4){d:s,s:ps+1/16} # Sixteenth note, starting 1/16 note after start of previous note
```

Any expression can be enclosed in brackets (only one level deep), in which any references to the previous note will be the last note outside of that pair of brackets.

### Expression

An expression is evaluated by parseGroup and used to construct the notes. For security, they are not evaluated using *eval* and/or Function objects. All expressions return numbers.

First, expressions can contain any of the following mathematical operations:

* addition (+)
* subtraction (-)
* multiplication (\*)
* division (/)
* exponentiation (\*\*)
* parentheses

These are evaluated as per the order of operations. For example, if we'd like to construct a note A4 with a duration of 1/2 + 1/3 beat, and a velocity of 0.5 squared, we could write:

`(A4){ d:1/2+1/3, v:0.5**2 }`

There exists constants and special expressions that can be used as numbers in these expressions. These include the following:

* *d1, whole, w*: 1
* *d2, half, h*: 0.5
* *d4, quarter, q*: 0.25
* *d8, eighth, e*: 0.125
* *d16, sixteenth, s*: 1 / 16
* *d32, thirtysecond, ts*: 1 / 32
* *d64, sixtyfourth, sf*: 1 / 64
* *d128*: 1 / 128
* *d256*: 1 / 256
* *d512*: 1 / 512
* *prevd, pd*: duration of previous defined note
* *prevv, pv*: value of previous defined velocity
* *prevp, pp*: value of previous defined pan
* *prevs, ps*: value of previous defined start
* *preve, pe*: value of previous defined end

### Note Properties

After a valid note or list of notes, the notes are given properties. The properties and their default values are as follows:

* *duration, d*: length of note; length of previous note or q if that doesn't exist
* *end, e*: end of note (interchangeable with previous); no default value
* *start, s*: start of note; end of previous note
* *velocity, v*: velocity of note; velocity of previous note
* *pan, p*: pan of note; pan of previous note

### Note

A note is specified like so:

*letter-name* *(accidental)* *octave*

The accidental is optional and can be any of *b*, *s*, *bb*, *ss*. The notes should be between C0 and G9. A list of notes is a concatenation, with no separation, of notes, to which properties are applied collectively and all function as one note in the property calculation.
