/**
 * Procedural ambient music generator using Web Audio API.
 * Soft, robotic, evolving — 1970s sci-fi computer soundtrack.
 */

let audioCtx = null;
let masterGain = null;
let isPlaying = false;
let nodes = [];

// Pentatonic scale frequencies for ambient arpeggios
const SCALE = [65.41, 73.42, 87.31, 98.00, 110.00, 130.81, 146.83, 174.61, 196.00, 220.00];

function createDrone(ctx, freq, gain) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sawtooth';
  osc.frequency.value = freq;

  filter.type = 'lowpass';
  filter.frequency.value = 200;
  filter.Q.value = 2;

  g.gain.value = gain;

  osc.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  osc.start();

  nodes.push(osc, g, filter);

  // Slowly modulate filter
  const modulate = () => {
    if (!isPlaying) return;
    filter.frequency.setTargetAtTime(
      150 + Math.random() * 200,
      ctx.currentTime,
      2 + Math.random() * 4
    );
    setTimeout(modulate, 3000 + Math.random() * 5000);
  };
  modulate();

  return { osc, gain: g, filter };
}

function createArpeggiator(ctx) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const delay = ctx.createDelay(1.0);
  const delayGain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = SCALE[0];

  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 1;

  g.gain.value = 0;

  delay.delayTime.value = 0.3;
  delayGain.gain.value = 0.3;

  osc.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  g.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(masterGain);
  delayGain.connect(delay); // feedback

  osc.start();
  nodes.push(osc, g, filter, delay, delayGain);

  // Random arpeggio pattern
  const playNote = () => {
    if (!isPlaying) return;
    const note = SCALE[Math.floor(Math.random() * SCALE.length)];
    const t = ctx.currentTime;

    osc.frequency.setTargetAtTime(note, t, 0.05);

    // Envelope: quick attack, slow release
    g.gain.setTargetAtTime(0.06, t, 0.02);
    g.gain.setTargetAtTime(0, t + 0.1, 0.3);

    // Random timing for organic feel
    const nextTime = 800 + Math.random() * 2500;
    setTimeout(playNote, nextTime);
  };

  setTimeout(playNote, 2000);

  return { osc, gain: g };
}

function createNoise(ctx) {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 300;
  filter.Q.value = 0.5;

  const g = ctx.createGain();
  g.gain.value = 0.015;

  source.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  source.start();

  nodes.push(source, filter, g);

  // Slowly shift noise character
  const modulate = () => {
    if (!isPlaying) return;
    filter.frequency.setTargetAtTime(
      200 + Math.random() * 600,
      ctx.currentTime,
      3 + Math.random() * 5
    );
    g.gain.setTargetAtTime(
      0.01 + Math.random() * 0.02,
      ctx.currentTime,
      2
    );
    setTimeout(modulate, 4000 + Math.random() * 6000);
  };
  modulate();

  return { source, gain: g, filter };
}

export function startMusic() {
  if (isPlaying) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);

  isPlaying = true;

  // Fade in
  masterGain.gain.setTargetAtTime(0.35, audioCtx.currentTime, 2);

  // Create layers
  createDrone(audioCtx, 55, 0.04);      // Low A drone
  createDrone(audioCtx, 82.41, 0.025);  // Low E drone
  createDrone(audioCtx, 110, 0.015);    // A drone octave up
  createArpeggiator(audioCtx);
  createNoise(audioCtx);
}

export function stopMusic() {
  if (!isPlaying || !audioCtx) return;
  isPlaying = false;

  // Fade out
  masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 1);

  setTimeout(() => {
    nodes.forEach(n => {
      try { n.stop?.(); } catch (e) {}
      try { n.disconnect?.(); } catch (e) {}
    });
    nodes = [];
    audioCtx.close().catch(() => {});
    audioCtx = null;
    masterGain = null;
  }, 2000);
}

export function setMusicVolume(vol) {
  if (masterGain) {
    masterGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.5);
  }
}

export function isMusicPlaying() {
  return isPlaying;
}
