// Tiny Web Audio synth: no sound files to download. Browser-only; every call is safe before unlock.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let ambient: GainNode | null = null;
let engine: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let muted = false;
const MUTE_KEY = "mission-moon-muted";

export function isMuted() {
  try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* ignore */ }
  return muted;
}

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = isMuted() ? 0 : 0.7;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* ignore */ }
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05);
}

/** Call from a user gesture; starts the low space hum. */
export function unlock() {
  const c = ensure();
  if (!c || !master || ambient) return;
  ambient = c.createGain();
  ambient.gain.value = 0;
  ambient.gain.linearRampToValueAtTime(0.06, c.currentTime + 3);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;
  lp.connect(ambient).connect(master);
  [55, 82.4, 110.3].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = i === 2 ? "triangle" : "sine";
    o.frequency.value = f;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.07 + i * 0.03;
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain).connect(o.frequency);
    o.connect(lp);
    o.start();
    lfo.start();
  });
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; delay?: number; to?: number } = {}) {
  const c = ensure();
  if (!c || !master) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t0);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(dur: number, freq: number, vol: number, attack = 0.01, delay = 0) {
  const c = ensure();
  if (!c || !master || !noise) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.1);
}

export const sfx = {
  click: () => tone(660, 0.06, { type: "triangle", vol: 0.08 }),
  tick: () => tone(1000, 0.08, { type: "square", vol: 0.06 }),
  go: () => tone(1500, 0.4, { type: "square", vol: 0.07 }),
  liftoff: () => noiseBurst(13, 220, 0.6, 1.2),
  separation: () => noiseBurst(0.6, 1200, 0.3),
  alarm: () => [0, 0.25, 0.5].forEach((d) => tone(880, 0.16, { type: "square", vol: 0.08, delay: d })),
  good: () => [523, 659, 784].forEach((f, i) => tone(f, 0.25, { type: "triangle", vol: 0.12, delay: i * 0.09 })),
  bad: () => [392, 311].forEach((f, i) => tone(f, 0.3, { type: "sawtooth", vol: 0.06, delay: i * 0.15 })),
  touchdown: () => { noiseBurst(0.5, 300, 0.4); [523, 784, 1047].forEach((f, i) => tone(f, 0.5, { vol: 0.1, delay: 0.3 + i * 0.12 })); },
  crash: () => { noiseBurst(1.6, 900, 0.7); tone(120, 1.2, { type: "sawtooth", vol: 0.15, to: 40 }); },
  engine(on: boolean) {
    const c = ensure();
    if (!c || !master || !noise) return;
    if (on && !engine) {
      const src = c.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 500;
      f.Q.value = 0.7;
      const gain = c.createGain();
      gain.gain.value = 0.0001;
      gain.gain.exponentialRampToValueAtTime(0.35, c.currentTime + 0.08);
      src.connect(f).connect(gain).connect(master);
      src.start();
      engine = { src, gain };
    } else if (!on && engine) {
      const e = engine;
      engine = null;
      e.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
      e.src.stop(c.currentTime + 0.3);
    }
  },
};
