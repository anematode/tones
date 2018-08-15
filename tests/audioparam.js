let param = new TONES.TonesParam();
let osc = new TONES.Osc();
osc.connect(TONES.master);

let real = new Float32Array([0, 1, 0.5, 0, 0.4, 0.7]);
let imag = new Float32Array([0, 0, 0, 0, 0, 0]);

param.connect(osc.frequency);
osc.setWave(TONES.Context.createPeriodicWave(real, imag));

let now = TONES.now();

param.value.linearRampToValueAtTime(-50, now + 20);


osc.start();

function printC() {

    console.log(param.value.value, param.value.valueAt(TONES.Context.currentTime))

    requestAnimationFrame(printC);
}

printC();