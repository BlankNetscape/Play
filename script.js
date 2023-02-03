// GLOBAL VARIABLES
const isLoop = document.getElementById("isLoop")
const volumeElem = document.getElementById("volume")
const input = document.getElementById("input")

// LISTENERS
document.querySelector("#random").addEventListener("click", async () => { if (!Play.isInited) { await Tone.start(); Play.isInited = true }
    console.log(Play.note(Math.floor(Math.random() * 84), 8, true))

});
document.querySelector("#demo").addEventListener("click", async () => {	if (!Play.isInited) { await Tone.start(); Play.isInited = true }
    Play.playDemoSequence()
});
document.querySelector("#play").addEventListener("click", async () => { if (!Play.isInited) { await Tone.start(); Play.isInited = true }
	// TODO: Parse input and play sequence
    let a = Play.read(input.value.toUpperCase())
    Play.makeSequenceAndPlay(a)
    console.log(a);

});
document.querySelector("#stop").addEventListener("click", async () => { if (!Play.isInited) { await Tone.start(); Play.isInited = true }
    Play.stop()
});
document.querySelector("#volume").addEventListener("change", changeVolume);

// HANDLER
function changeVolume(event) {
    let value = remap(event.target.value, event.target.max, event.target.min, 0, -36)
    if(value > -36) {
        Play.volume(value)
    } else {
        Play.toogleVolume()
    }
}

// FUNC
function remap(oldValue, oldMax, oldMin, newMax, newMin) {
    oldRange = (oldMax - oldMin)  
    newRange = (newMax - newMin)  
    let newValue = (((oldValue - oldMin) * newRange) / oldRange) + newMin
    return newValue
}

// CLASS
class Play {
    static isInited = false // Is Tone.start() -ed
    static #defaultVolume = volumeElem.value // Percent
    static debug = false // Enable some logging
    static #synth
    static #notesRe = /[A-G]/
    static #octavesRe = /[0-6]/

    static #history = [Tone.now()]

    // STATIC INITIALIZER
    static {
        this.#synth = new Tone.Synth({"envelope" : { "sustain": 0.1 }}).toDestination();

        this.volume(remap(this.#defaultVolume, volumeElem.max, volumeElem.min, 0, -36)) // 70%
        this.bpm(180)

        this.userSequence = new Tone.Sequence()
        this.demoSequence = new Tone.Sequence((time, note)=>{
            this.#synth.triggerAttackRelease(note, "64n", time)
        }, ["C4","E4","G4","B4","C5","B4","G4","E4"])
    }

    // CONTROLS
    static volume(db) {
        if(this.#synth.oscillator.mute) { this.#synth.oscillator.mute = false}
        this.#synth.oscillator.volume.value = db
    }
    static toogleVolume() {
        this.#synth.oscillator.mute = !this.#synth.oscillator.mute
    }
    static bpm(bpm) {
        Tone.Transport.bpm.value = bpm
    }
    static bpmRamp(bpm, time = 2) {
        Tone.Transport.bpm.rampTo(bpm, time)
    }

    // PRIVATE METHODS
    static #getNoteId(note, octave, modifier = "") {
        if(note == undefined || note == "") return 0
        if(octave == undefined) return 0
        let id
        switch(note) {
            case "C":
                id = 1
                if(modifier == "#" || modifier == "+") id ++ 
                else if(modifier == "-") id -- 
                id += 12*octave
                break
            case "D":
                id = 3
                if(modifier == "#" || modifier == "+") id ++
                else if(modifier == "-") id --
                id += 12*octave
                break
            case "E":
                id = 5
                id += 12*octave
                break
            case "F":
                id = 6
                if(modifier == "#" || modifier == "+") id ++
                else if(modifier == "-") id --
                id += 12*octave
                break
            case "G":
                id = 8
                if(modifier == "#" || modifier == "+") id ++
                else if(modifier == "-") id --
                id += 12*octave
                break
            case "A":
                id = 10
                if(modifier == "#" || modifier == "+") id ++
                else if(modifier == "-") id --
                id += 12*octave
                break
            case "B":
                id = 12
                id += 12*octave
                break
        }
        return id
    }

    static #getScaleNote(note) {
        if(note==0) return ""
        let a = Math.floor(note%12)
        switch (a) {
            case 1:
            case 2:
                return "C"
            case 3:
            case 4:
                return "D"
            case 5:
                return "E"
            case 6:
            case 7:
                return "F"
            case 8:
            case 9:
                return "G"
            case 10:
            case 11:
                return "A"
            case 0:
                return "B"
            default:
                return ""
        }
        
    }

    // PLAYS DEMO SEQUENCE
    static playDemoSequence() {
        Tone.Transport.stop();
        this.userSequence.stop()
        this.demoSequence.start()
        this.demoSequence.loop = isLoop.checked
        Tone.Transport.start();
        
    }

    // STOPS ANY SEQUENCE
    static stop() {
        Tone.Transport.stop();
        this.demoSequence.stop()
        this.userSequence.stop()
    }

    // READ INPUT
    static read(input) {
        let notes = input.split(' ');
        let result = []
        for (let index = 0; index < notes.length; index++) {
            const item = notes[index];
            if(item[0] == "T") {
                console.log("Here")
                Play.bpmRamp(item.split("T")[1])
                continue
            }
            let splited = item.split("L")
            let a
            if(splited.length == 1) {
                a = Play.note(splited[0], 1)
            } else {
                a = Play.note(splited[0], splited[1])
            }
            if(a==undefined) continue
            result.push(a)
        }
        return result
    }

    // MAKE SEQUENCE AND START
    static makeSequenceAndPlay(notes) {
        Tone.Transport.stop();
        this.demoSequence.stop()
        this.userSequence.stop()
        this.userSequence = new Tone.Sequence((time, value)=>{
            this.#synth.triggerAttackRelease(value.note+value.sufix+value.octave, value.length, time)
        }, notes).start()
        this.userSequence.loop = isLoop.checked
        Tone.Transport.start();
    }

    // TRANSFORM INPUT NOTE TO OBJECT
    static note(note, length = 0.5, playNote = false) {
        let _note
        let _noteId
        let _noteFullRange = 84
        let _octave
        let _sufix
        let _mode
        
        // NOTE: Parse input
        // * Stops on error.
        try {
            if(typeof note === 'number') {
                // MODE 1 CASE [Int]
                if( note >= 0 && note <= _noteFullRange) {
                    _noteId = note
                    _mode = 1
                } else { throw new Error("Note range error!") }
            } 
            else if (typeof note === 'string') {
                // MODE 1 CASE [STR]
                let a = parseInt(note)
                if(!isNaN(a)) { 
                    if(a >= 0 && a <= _noteFullRange) { _noteId = a ; _mode = 1  }
                    else { throw new Error("Note range error!") }
                }
                // MODE 2 CASE [STR]
                else {
                    if(note.length == 0 /*|| note.length > 28*/) { throw new Error("Mode [2] argument length error!") }
                    _note  = note[0].search(this.#notesRe) == 0 ? note[0] : undefined
                    _octave = note[1].search(this.#octavesRe)  == 0 ? parseInt(note[1]) : undefined
                    if (note.length >= 3) { _sufix = note[2].search(/[#\+-]/) == 0 ? note[2] : undefined }
                    if(_note == undefined || _octave == undefined) { throw new Error("Mode [2] argument error!") }
                    _mode = 2
                }
            } else { throw new Error('Ivalid note type!') }
        } catch (error) {
            // TODO: Error handling
            console.error(error)
            return undefined
        }
        
        // NOTE: Calculate lacking data
        switch (_mode) {
            case 1:
                _octave = Math.floor((_noteId > 0 ? _noteId-0.5 : _noteId )/12) // NOTE: FIXES EARLY OCTAVE CHANGE ON 12..24..36
                _note = this.#getScaleNote(_noteId)
                let a = _noteId-this.#getNoteId(_note, _octave)
                if(a > 0 ) { _sufix = "#" }
                // else if (a < 1) { _sufix = "-" } // Invalid case
                break;
            case 2:
                _noteId = this.#getNoteId(_note, _octave, _sufix)
                break;
        }
        if(!_sufix) { _sufix = "" }

        if(this.debug) console.log(`Sfx: ${_sufix}, Note: ${_note}, ID: ${_noteId}, Oct: ${_octave}, Inpt ${_mode}, Play?: ${playNote} `)

        // NOTE: Play Note
        if(playNote) {
            let now = Tone.now()
            now = now != this.#history[this.#history.length-1] ? now : now + 0.01
            this.#synth.triggerAttackRelease(_note+_sufix+_octave, length+"n", now);
            this.#history.length = 0
            this.#history.push(now)
        }
        return {"sufix": _sufix, "note": _note, "noteId": _noteId, "octave": _octave, "length": length+"n"}
    }
}

