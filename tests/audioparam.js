let param = new TONES.TonesParam();
let osc = new TONES.Osc();
osc.connect(TONES.master);

param.connect(osc.frequency);

console.log(JSON.stringify(param.value.events));
param.value.setValueAtTime(10, TONES.now() + 1);
console.log(JSON.stringify(param.value.events));
param.value.setValueAtTime(50, TONES.now() + 2);
console.log(JSON.stringify(param.value.events));
param.value.exponentialRampToValueAtTime(1000, TONES.now() + 5);
console.log(JSON.stringify(param.value.events));
param.value.setValueAtTime(200, TONES.now() + 3);
console.log(JSON.stringify(param.value.events));
param.value.linearRampToValueAtTime(220, TONES.now() + 3.1);
console.log(JSON.stringify(param.value.events));
param.value.linearRampToValueAtTime(230, TONES.now() + 3.2);
console.log(JSON.stringify(param.value.events));
param.value.linearRampToValueAtTime(170, TONES.now() + 3.3);
console.log(JSON.stringify(param.value.events));

osc.start();

function printC() {

    console.log(param.value.value, param.value.valueAt(TONES.Context.currentTime))

    requestAnimationFrame(printC);
}

printC();