/**
 * Tower defense SFX — place, shoot, hit, leak.
 */

export class TowerAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.24;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [slide]
   */
  tone(freq, dur, type = "sine", gain = 0.12, when = 0, slide = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
  }

  /**
   * @param {number} dur
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [ff]
   * @param {BiquadFilterType} [type]
   */
  noise(dur, gain = 0.1, when = 0, ff = 1000, type = "bandpass") {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = ff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  click() {
    this.tone(520, 0.03, "triangle", 0.05);
  }

  place() {
    this.tone(280, 0.06, "triangle", 0.08);
    this.tone(420, 0.08, "sine", 0.07, 0.04);
  }

  upgrade() {
    this.tone(500, 0.06, "sine", 0.08);
    this.tone(740, 0.1, "triangle", 0.07, 0.05);
  }

  sell() {
    this.tone(300, 0.08, "triangle", 0.06, 0, -80);
  }

  arrow() {
    this.noise(0.05, 0.1, 0, 2200, "bandpass");
    this.tone(900, 0.04, "triangle", 0.05, 0, -400);
  }

  cannon() {
    this.noise(0.1, 0.2, 0, 600, "lowpass");
    this.tone(90, 0.12, "sine", 0.14, 0, -40);
  }

  frost() {
    this.noise(0.08, 0.1, 0, 3000, "highpass");
    this.tone(720, 0.07, "sine", 0.07);
    this.tone(1100, 0.06, "triangle", 0.05, 0.03);
  }

  hit() {
    this.tone(240, 0.04, "square", 0.04);
  }

  kill() {
    this.tone(360, 0.05, "sine", 0.06);
    this.tone(520, 0.07, "triangle", 0.05, 0.03);
  }

  leak() {
    this.tone(160, 0.12, "sawtooth", 0.08, 0, -50);
  }

  wave() {
    for (let i = 0; i < 3; i++) this.tone(400 + i * 80, 0.07, "triangle", 0.06, i * 0.05);
  }

  win() {
    for (let i = 0; i < 6; i++) this.tone(440 * Math.pow(1.15, i), 0.11, "sine", 0.09, i * 0.07);
  }

  lose() {
    this.tone(280, 0.2, "triangle", 0.1, 0, -100);
    this.tone(160, 0.28, "sine", 0.08, 0.12, -40);
  }
}
