// STILL — motor de audio ambiental.
// Ruido marrón filtrado (room tone abstracto). La intensidad disminuye
// a medida que el jugador avanza en el sombreado (ruido -> concentración -> silencio).

let actx, source, gain, filter, ready = false;

function ensure() {
  if (ready) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const sr = actx.sampleRate;
  const len = 2 * sr;
  const buf = actx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.2;
  }
  source = actx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  filter = actx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  filter.Q.value = 0.7;
  gain = actx.createGain();
  gain.gain.value = 0.0001;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(actx.destination);
  source.start();
  ready = true;
}

export function startAmbient() {
  try {
    ensure();
    if (actx.state === 'suspended') actx.resume();
    gain.gain.cancelScheduledValues(actx.currentTime);
    gain.gain.setTargetAtTime(0.07, actx.currentTime, 0.5);
  } catch (e) { /* audio no disponible */ }
}

// x: 0 (silencio) .. 1 (ruido ambiente completo)
export function setAudioIntensity(x) {
  if (!ready) return;
  const v = 0.07 * Math.max(0.02, Math.min(1, x));
  gain.gain.setTargetAtTime(v, actx.currentTime, 0.35);
}

export function stopAmbient() {
  if (!ready) return;
  gain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.3);
}