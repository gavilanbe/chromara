// CHROMARA — materia original muestreada a 32 kHz + firmas musicales del mismo
// banco CT que la BSO. La síntesis de abajo queda como respaldo sin muestras.
'use strict';
const SFX = {
  ctx: null, out: null, rev: null, wet: null, noiseBuf: {}, amb: null, last: {},
  init(ctx, master) {
    if (this.ctx) return; this.ctx = ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0.64; this.out.connect(master);
    // reverb corta generada: ruido estéreo con caída exponencial
    const ir = ctx.createBuffer(2, ctx.sampleRate * 1.4 | 0, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2) * (i < 400 ? i / 400 : 1); }
    this.rev = ctx.createConvolver(); this.rev.buffer = ir; this.wet = ctx.createGain(); this.wet.gain.value = 0.48; this.rev.connect(this.wet); this.wet.connect(this.out);
    this.samples = {}; this.effects = {}; this.effectCounters = {};
    if (typeof SFX_SAMPLES !== 'undefined') for (const [name, sample] of Object.entries(SFX_SAMPLES)) {
      // Generated PCM WAVs have one mono 16-bit data chunk. Decode synchronously
      // so the first button press gets the same timbre as subsequent presses.
      const raw = atob(sample.data), bytes = Uint8Array.from(raw, ch => ch.charCodeAt(0));
      const view = new DataView(bytes.buffer), frames = view.getUint32(40, true) / 2;
      const buffer = ctx.createBuffer(1, frames, view.getUint32(24, true)), channel = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) channel[i] = view.getInt16(44 + i * 2, true) / 32768;
      if (sample.kind === 'effect') {
        (this.effects[sample.event] ||= []).push({ buffer, gain: sample.gain, variant: sample.variant });
      } else this.samples[name] = buffer;
    }
    Object.values(this.effects).forEach(variants => variants.sort((a, b) => a.variant - b.variant));
    for (const k of ['white', 'pink', 'brown']) this.noiseBuf[k] = this.makeNoise(k);
  },
  makeNoise(kind) {
    const n = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; if (kind === 'white') d[i] = w; else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } }
    return b;
  },
  // One recognizable instrument per pigment; scheduled chords keep every note.
  sample(name, semi = 0, vol = .15, when = 0, pan = 0, attack = 0) {
    const buffer = this.samples?.[name];
    if (!buffer) { this.bell(587.33 * this.semi(semi), .35, vol * .45, when, .2); return; }
    const c = this.ctx, t = c.currentTime + when, source = c.createBufferSource(), gain = c.createGain();
    source.buffer = buffer; source.playbackRate.value = this.semi(semi);
    gain.gain.value = vol;
    if (attack) { gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(vol, t + attack); }
    source.connect(gain); const routed = this.route(gain, 1, .16, pan);
    source.start(t); source.onended = () => { source.disconnect(); gain.disconnect(); routed.dispose(); };
  },
  effect(name, o = {}) {
    const variants = this.effects?.[name]; if (!variants?.length) return false;
    const count = this.effectCounters[name] || 0; this.effectCounters[name] = count + 1;
    const sample = variants[count % variants.length], c = this.ctx, source = c.createBufferSource();
    source.buffer = sample.buffer;
    // Physical microvariation never transposes the musical identity of a colour.
    const stretch = name === 'brush_sweep' || name === 'scratch' ? Math.max(.6, Math.min(1.6, o.len || 1)) : 1;
    source.playbackRate.value = (count % 2 ? .989 : 1.011) / stretch;
    const gain = c.createGain(); gain.gain.value = sample.gain * (o.vol ?? 1);
    source.connect(gain);
    const wet = /^(ink|dissolve|splash_clean|glass|shimmer)/.test(name) ? .09 : .025;
    const routed = this.route(gain, 1, wet, o.pan || 0);
    source.start(c.currentTime + (o.when || 0));
    source.onended = () => { source.disconnect(); gain.disconnect(); routed.dispose(); };
    return true;
  },
  // --- bloques
  route(node, vol, wet, pan, t0, dur) {
    const g = this.ctx.createGain(); g.gain.value = vol; let tail = node; const nodes = [g];
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); nodes.push(p); p.pan.value = Math.max(-1, Math.min(1, pan)); tail.connect(p); tail = p; }
    tail.connect(g); g.connect(this.out); if (wet) { const w = this.ctx.createGain(); nodes.push(w); w.gain.value = wet; g.connect(w); w.connect(this.rev); }
    g.dispose = () => nodes.forEach(n => n.disconnect());
    return g;
  },
  env(param, t0, a, d, peak, sus = 0, hold = 0, rel = 0) {
    param.setValueAtTime(0.0001, t0); param.linearRampToValueAtTime(peak, t0 + a); param.exponentialRampToValueAtTime(Math.max(0.0001, peak * (sus || 0.0001)), t0 + a + d);
    if (sus) { param.setValueAtTime(peak * sus, t0 + a + d + hold); param.exponentialRampToValueAtTime(0.0001, t0 + a + d + hold + rel); }
  },
  noise(o) { // { kind, dur, type, f0, f1, q, a, d, vol, wet, pan, when, sus, hold, rel, am }
    const c = this.ctx, t0 = c.currentTime + (o.when || 0), src = c.createBufferSource(); src.buffer = this.noiseBuf[o.kind || 'white']; src.loop = true; src.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1; f.frequency.setValueAtTime(o.f0 || 1000, t0); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0 + (o.dur || .2));
    const g = c.createGain(); this.env(g.gain, t0, o.a ?? .005, o.d ?? (o.dur || .2), o.vol ?? .3, o.sus, o.hold, o.rel);
    src.connect(f); f.connect(g); let tail = g;
    if (o.am) { const lfo = c.createOscillator(), lg = c.createGain(), base = c.createGain(); lfo.type = 'square'; lfo.frequency.value = o.am; lg.gain.value = .5; base.gain.value = .5; lfo.connect(lg); lg.connect(base.gain); g.connect(base); tail = base; lfo.start(t0); lfo.stop(t0 + (o.dur || .2) + .5); }
    this.route(tail, 1, o.wet || 0, o.pan || 0); src.start(t0); src.stop(t0 + (o.dur || .2) + (o.rel || 0) + (o.hold || 0) + .6);
  },
  tone(o) { // { f0, f1, dur, wave, a, d, vol, wet, pan, when, curve:'exp'|'lin', sus, hold, rel, detune }
    const c = this.ctx, t0 = c.currentTime + (o.when || 0), osc = c.createOscillator(); osc.type = o.wave || 'sine'; const jitter = this.jit(o), f0 = (o.f0 || 440) * jitter, f1 = o.f1 ? o.f1 * jitter : 0;
    osc.frequency.setValueAtTime(f0, t0); if (f1) { if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(f1, t0 + (o.dur || .2)); else osc.frequency.exponentialRampToValueAtTime(f1, t0 + (o.dur || .2)); }
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain(); this.env(g.gain, t0, o.a ?? .003, o.d ?? (o.dur || .2), o.vol ?? .2, o.sus, o.hold, o.rel);
    osc.connect(g); this.route(g, 1, o.wet || 0, o.pan || 0); osc.start(t0); osc.stop(t0 + (o.dur || .2) + (o.rel || 0) + (o.hold || 0) + .3);
  },
  jit(o) { return (o && o.nojit) ? 1 : 1 + (Math.random() - .5) * .018; },
  semi(n) { return Math.pow(2, (n || 0) / 12); },
  bell(f, dur, vol, when = 0, wet = .35, partials = [[1, 1], [2.0, .5], [2.76, .35], [5.4, .18], [8.93, .08]]) {
    partials.filter(([r]) => f * r < this.ctx.sampleRate * .43).forEach(([r, a], i) => this.tone({ f0: f * r, dur: dur * (1 - i * .12), wave: 'sine', a: .002, d: dur * (1 - i * .12), vol: vol * a, wet: i ? 0 : wet, when, nojit: true }));
  },
  drip(f, vol = .25, when = 0, wet = .3, pan = 0) { // "plip": subida rápida de tono y caída
    const c = this.ctx, t0 = c.currentTime + when, osc = c.createOscillator(), g = c.createGain(); osc.type = 'sine'; const ff = f * this.jit();
    osc.frequency.setValueAtTime(ff * .6, t0); osc.frequency.exponentialRampToValueAtTime(ff * 1.6, t0 + .03); osc.frequency.exponentialRampToValueAtTime(ff, t0 + .12);
    this.env(g.gain, t0, .002, .16, vol); osc.connect(g); this.route(g, 1, wet, pan); osc.start(t0); osc.stop(t0 + .4);
  },
  bubble(f, vol = .2, when = 0) { const c = this.ctx, t0 = c.currentTime + when, osc = c.createOscillator(), g = c.createGain(); osc.type = 'sine'; const ff = f * this.jit(); osc.frequency.setValueAtTime(ff, t0); osc.frequency.exponentialRampToValueAtTime(ff * 2.6, t0 + .09); this.env(g.gain, t0, .004, .1, vol); osc.connect(g); this.route(g, 1, .15, 0); osc.start(t0); osc.stop(t0 + .3); },
  splat(size = 1, vol = .35, when = 0, pan = 0) { // pegote húmedo: golpe grave + chapoteo + gotitas
    this.noise({ kind: 'brown', type: 'lowpass', f0: 900 * size, f1: 200, q: .7, dur: .12 * size, a: .002, d: .12 * size, vol: vol, wet: .25, when, pan });
    this.noise({ kind: 'white', type: 'bandpass', f0: 2500, f1: 900, q: .8, dur: .08, a: .001, d: .08, vol: vol * .5, when, pan });
    for (let i = 0; i < 2 + size * 2; i++) this.drip(900 + Math.random() * 1400, vol * .35, when + .04 + Math.random() * .12 * size, .3, pan + (Math.random() - .5) * .6);
  },
  duck(db = -4, ms = 180, hold = 120) {
    if (typeof Audio !== 'undefined') Audio.duck(db, ms / 2000, hold / 1000, ms / 1000 + .12);
  },
  // --- catálogo
  play(name, o = {}) {
    if (!this.ctx) return; const s = this.semi(o.semi), v = o.vol ?? 1, w = o.when || 0, pan = o.pan || 0;
    const now = performance.now(), key = name + ':' + (o.semi || 0); if (!w && this.last[key] && now - this.last[key] < 30) return; if (!w) this.last[key] = now; // antirepetición
    if (this.effect(name, o)) {
      if (name === 'splat_big') this.duck(-3, 160, 80);
      if (name === 'impact_sub') this.duck(-5, 120, 200);
      if (name === 'splash' || name === 'ink_tide') this.duck(-6, 200, 400);
      return;
    }
    switch (name) {
      // ---- UI: cuaderno
      case 'cursor': this.sample('pizz', 12 + (o.semi || 0), .15 * v, w, pan); break;
      case 'confirm': this.noise({ kind: 'white', f0: 1800, f1: 4000, q: 1.2, dur: .09, a: .004, vol: .16 * v, when: w }); this.sample('marimba', o.semi || 0, .16 * v, w + .025, pan); break;
      case 'cancel': this.noise({ kind: 'pink', type: 'highpass', f0: 1500, dur: .12, a: .01, d: .11, vol: .14 * v, when: w, am: 28 }); break;
      case 'book_open': this.noise({ kind: 'pink', type: 'highpass', f0: 900, dur: .22, a: .02, d: .2, vol: .2 * v, when: w }); this.noise({ kind: 'brown', type: 'lowpass', f0: 300, dur: .08, a: .002, vol: .3 * v, when: w + .12 }); break;
      case 'book_close': this.noise({ kind: 'pink', type: 'highpass', f0: 900, dur: .16, a: .01, vol: .18 * v, when: w }); this.noise({ kind: 'brown', type: 'lowpass', f0: 220, dur: .12, a: .002, vol: .45 * v, when: w + .09 }); break;
      case 'page': this.noise({ kind: 'pink', type: 'highpass', f0: 1200, f1: 3000, dur: .14, a: .02, vol: .16 * v, when: w }); break;
      case 'equip': this.noise({ kind: 'white', type: 'bandpass', f0: 2400, q: 2, dur: .035, vol: .13 * v, when: w }); this.sample('marimba', o.semi || 0, .3 * v, w + .025, pan); this.sample('harp', 12 + (o.semi || 0), .12 * v, w + .075, pan); break;
      case 'nope': this.noise({ kind: 'white', type: 'bandpass', f0: 2200, f1: 1500, q: 2, dur: .16, a: .005, vol: .16 * v, when: w, am: 60 }); break;
      case 'banner': this.noise({ kind: 'white', type: 'bandpass', f0: 600, f1: 3500, q: 1, dur: .18, a: .02, d: .16, vol: .14 * v, when: w }); break;
      case 'text': this.sample('pizz', (o.semi || 0), .07 * v, w, pan); break;
      // ---- ATB
      case 'ready': this.sample('marimba', o.semi || 0, .24 * v, w, pan); this.drip(587.33 * s, .06 * v, w, .2, pan); break;
      case 'combo_ready': [0,4,7].forEach((n,i) => this.sample('harp', n, .18 * v, w + i * .085, [-.35,0,.35][i])); break;
      case 'enemy_soon': this.bubble(120, .22 * v, w); this.bubble(90, .18 * v, w + .12); break;
      // ---- herramientas
      case 'brush_sweep': this.noise({ kind: 'pink', type: 'bandpass', f0: 700, f1: 2600, q: .9, dur: .28 * (o.len || 1), a: .05, d: .26 * (o.len || 1), vol: .28 * v, when: w, wet: .12, pan }); break;
      case 'brush_big': this.noise({ kind: 'pink', type: 'bandpass', f0: 400, f1: 2200, q: .8, dur: .5, a: .08, d: .48, vol: .4 * v, when: w, wet: .2, pan }); this.noise({ kind: 'brown', type: 'lowpass', f0: 500, dur: .3, a: .05, vol: .3 * v, when: w + .05 }); break;
      case 'splat': this.splat(1, .38 * v, w, pan); break;
      case 'splat_small': this.splat(.6, .28 * v, w, pan); break;
      case 'splat_big': this.splat(1.6, .5 * v, w, pan); this.duck(-3, 160, 80); break;
      case 'scratch': this.noise({ kind: 'white', type: 'bandpass', f0: 1800, f1: 3800, q: 1.6, dur: .22 * (o.len || 1), a: .01, d: .2 * (o.len || 1), vol: .22 * v, when: w, am: 90 + Math.random() * 40, pan }); break;
      case 'scratch_long': this.noise({ kind: 'white', type: 'bandpass', f0: 1400, f1: 3200, q: 1.4, dur: .4, a: .01, d: .38, vol: .26 * v, when: w, am: 70, pan }); break;
      case 'whip': this.noise({ kind: 'white', type: 'bandpass', f0: 300, f1: 5000, q: 1.5, dur: .16, a: .01, d: .14, vol: .3 * v, when: w, pan }); break;
      case 'dash': this.noise({ kind: 'pink', type: 'bandpass', f0: 400, f1: 2400, q: 1, dur: .2, a: .03, d: .17, vol: .2 * v, when: w, pan }); break;
      case 'brush_hiss': this.noise({ kind: 'white', type: 'highpass', f0: 3000, dur: .3, a: .04, d: .26, vol: .12 * v, when: w, am: 14, pan }); break;
      case 'fwip': this.noise({ kind: 'white', type: 'bandpass', f0: 800, f1: 4500, q: 2, dur: .14, a: .005, d: .12, vol: .22 * v, when: w, pan }); this.tone({ f0: 500, f1: 1400, dur: .14, wave: 'sine', vol: .08 * v, when: w }); break;
      case 'rub': this.noise({ kind: 'brown', type: 'lowpass', f0: 700, dur: .09, a: .01, d: .08, vol: .3 * v, when: w, pan }); break;
      case 'crumbs': for (let i = 0; i < 4; i++) this.noise({ kind: 'white', type: 'bandpass', f0: 3500 + Math.random() * 2000, q: 6, dur: .02, vol: .07 * v, when: w + i * .03 }); break;
      case 'squeeze': this.tone({ f0: 900, f1: 1500, dur: .25, wave: 'sawtooth', a: .02, d: .23, vol: .05 * v, when: w }); this.noise({ kind: 'white', type: 'bandpass', f0: 2000, f1: 3500, q: 4, dur: .25, a: .02, vol: .08 * v, when: w, am: 30 }); break;
      case 'plop': this.tone({ f0: 293.6648 * s, f1: 73.4162 * s, dur: .14, wave: 'sine', vol: .35 * v, when: w, wet: .2 }); this.noise({ kind: 'brown', type: 'lowpass', f0: 500, dur: .08, vol: .25 * v, when: w }); break;
      case 'drop_fall': this.tone({ f0: 1800, f1: 350, dur: .32, wave: 'sine', a: .02, d: .3, vol: .12 * v, when: w }); break;
      case 'splash_clean': this.noise({ kind: 'white', type: 'bandpass', f0: 2400, f1: 1200, q: .7, dur: .18, a: .002, vol: .3 * v, when: w, wet: .35 }); for (let i = 0; i < 5; i++) this.drip(1200 + Math.random() * 1600, .12 * v, w + .05 + Math.random() * .2, .4, (Math.random() - .5)); break;
      case 'bubbles': for (let i = 0; i < 6; i++) this.bubble(250 + Math.random() * 500, .1 * v, w + i * .07 + Math.random() * .03); break;
      // ---- mezclas
      case 'charge': {
        const n = o.semi || 0, voice = n === 0 ? 'pizz' : n === 4 ? 'marimba' : 'harp';
        this.sample(voice, n, .19 * v, w, pan);
        this.sample('choir', n + 12, .11 * v, w + .025, pan, .12);
        this.effect('brush_hiss', { ...o, vol: .12 * v }); break;
      }
      case 'mix_bell': {
        const colours = o.colours || [0,4,7];
        colours.forEach((n,i) => this.sample(n === 0 ? 'pizz' : n === 4 ? 'marimba' : 'harp', n, .25 * v, w + i * .045, (i - (colours.length - 1) / 2) * .35));
        // Their separate notes meet in the leap E–A of the shared Prism phrase.
        this.sample('harp', 2, .22 * v, w + .16, pan);
        this.sample('harp', 7, .26 * v, w + .29, pan);
        this.sample('choir', 12, .10 * v, w + .25, 0, .08);
        this.effect('shimmer', { ...o, vol: .18 * v }); this.duck(-4, 100, 220); break;
      }
      case 'pigment_return':
        [0,4,2,7].forEach((n,i) => this.sample(i === 1 ? 'marimba' : 'harp', n, .16 * v, w + [0,.15,.23,.38][i], pan));
        break;
      case 'fwoom': this.noise({ kind: 'brown', type: 'lowpass', f0: 200, f1: 1600, q: .8, dur: .5, a: .12, d: .4, vol: .5 * v, when: w, wet: .2 }); this.noise({ kind: 'pink', type: 'bandpass', f0: 800, f1: 2500, dur: .45, a: .1, vol: .2 * v, when: w + .05 }); break;
      case 'crackle': for (let i = 0; i < 14; i++) this.noise({ kind: 'white', type: 'bandpass', f0: 1500 + Math.random() * 3000, q: 5, dur: .015, vol: .1 * v * Math.random(), when: w + Math.random() * .8 }); break;
      case 'grow': for (let i = 0; i < 7; i++) this.noise({ kind: 'white', type: 'bandpass', f0: 700 + i * 260, q: 8, dur: .03, vol: .14 * v, when: w + i * .06 }); this.tone({ f0: 180, f1: 420, dur: .5, wave: 'triangle', a: .05, vol: .06 * v, when: w }); break;
      case 'leaves': this.noise({ kind: 'pink', type: 'highpass', f0: 2500, dur: .4, a: .05, d: .35, vol: .1 * v, when: w, am: 9 }); break;
      case 'heal_bells': [0,4,7,12].forEach((n,i) => this.sample('harp', n, .19 * v, w + i * .1, (i - 1.5) * .15)); break;
      case 'hum_down': this.tone({ f0: 160, f1: 45, dur: .9, wave: 'sawtooth', a: .1, d: .8, vol: .12 * v, when: w, wet: .3 }); this.tone({ f0: 161.5, f1: 44.5, dur: .9, wave: 'sawtooth', a: .1, d: .8, vol: .1 * v, when: w, nojit: true }); break;
      case 'impact_sub': this.tone({ f0: 90, f1: 30, dur: .5, wave: 'sine', a: .002, d: .5, vol: .7 * v, when: w, wet: .3 }); this.noise({ kind: 'brown', type: 'lowpass', f0: 300, dur: .3, vol: .4 * v, when: w, wet: .4 }); this.duck(-5, 120, 200); break;
      case 'glass': for (let i = 0; i < 8; i++) this.bell(2000 + Math.random() * 2500, .35, .05 * v, w + Math.random() * .25, .4, [[1, 1], [2.32, .4], [4.1, .2]]); break;
      case 'arpeggio7': [0,2,4,6,7,9,11,12].forEach((n,i) => this.sample('harp', n, .18 * v, w + i * .075, (i - 3.5) * .15)); break;
      case 'shimmer': this.noise({ kind: 'white', type: 'highpass', f0: 6000, dur: 1.0, a: .2, d: .8, vol: .08 * v, when: w, wet: .6, am: 11 }); break;
      // ---- daño y estados
      case 'hit': this.splat(1, .35 * v, w, pan); break;
      case 'hitweak': this.splat(1.3, .4 * v, w, pan); this.noise({ kind: 'white', type: 'highpass', f0: 3000, dur: .05, vol: .3 * v, when: w }); this.bell(1568 * s, .5, .12 * v, w + .02, .35); break;
      case 'resist': this.noise({ kind: 'brown', type: 'lowpass', f0: 250, dur: .12, a: .003, vol: .35 * v, when: w }); this.tone({ f0: 140, f1: 90, dur: .1, wave: 'triangle', vol: .12 * v, when: w }); break;
      case 'ink_jet': this.noise({ kind: 'brown', type: 'lowpass', f0: 1200, f1: 400, q: 1, dur: .35, a: .03, d: .32, vol: .3 * v, when: w, am: 18 }); this.bubble(100, .2 * v, w + .3); break;
      case 'ink_hit': this.splat(.7, .3 * v, w, pan); break;
      case 'ink_tide': this.play('splash', o); break;
      case 'slow_drip': this.drip(220, .22 * v, w, .5); this.drip(180, .2 * v, w + .35, .5); break;
      case 'dissolve': this.tone({ f0: 320, f1: 70, dur: .55, wave: 'sine', a: .01, d: .5, vol: .18 * v, when: w, wet: .3 }); for (let i = 0; i < 7; i++) this.bubble(120 + Math.random() * 300, .12 * v, w + .05 + i * .06); this.drip(500, .2 * v, w + .55, .5); break;
      case 'flat_drop': this.noise({ kind: 'brown', type: 'lowpass', f0: 600, f1: 150, dur: .25, a: .002, vol: .35 * v, when: w, wet: .3 }); this.tone({ f0: 240, f1: 60, dur: .3, wave: 'sine', vol: .2 * v, when: w }); break;
      case 'die': this.play('dissolve', o); break;
      case 'ko': this.play('flat_drop', o); break;
      case 'heal': this.play('bubbles', o); this.sample('harp', 12 + (o.semi || 0), .22 * v, w + .1, pan); break;
      // ---- mapa
      case 'step_grass': this.noise({ kind: 'pink', type: 'lowpass', f0: 900, dur: .05, a: .003, vol: .12 * v, when: w, pan }); this.drip(500 + Math.random() * 150, .04 * v, w, .05); break;
      case 'step_path': this.noise({ kind: 'white', type: 'bandpass', f0: 1800, q: 1, dur: .035, a: .002, vol: .1 * v, when: w, pan }); break;
      case 'step_wood': this.tone({ f0: 180, f1: 120, dur: .07, wave: 'triangle', vol: .12 * v, when: w }); this.noise({ kind: 'pink', type: 'lowpass', f0: 700, dur: .04, vol: .08 * v, when: w }); break;
      case 'detect': this.bubble(110, .25 * v, w); this.tone({ f0: 60, dur: .12, wave: 'sine', a: .005, vol: .35 * v, when: w + .15 }); this.tone({ f0: 60, dur: .12, wave: 'sine', a: .005, vol: .3 * v, when: w + .33 }); break;
      case 'encounter': this.tone({ f0: 110, f1: 170, dur: .6, wave: 'sawtooth', a: .05, d: .55, vol: .12 * v, when: w, wet: .3 }); this.bubble(80, .3 * v, w); break;
      case 'lunge': this.tone({ f0: 95, f1: 36, dur: .38, wave: 'sawtooth', a: .01, d: .34, vol: .2 * v, when: w, wet: .25 }); this.bubble(70, .18 * v, w + .05); break; // gruñido grave: el enemigo que ya te vio embiste

      case 'fall': this.tone({ f0: 1400, f1: 180, dur: .5, wave: 'sine', a: .02, d: .48, vol: .16 * v, when: w }); break;
      case 'splash': this.splat(2.2, .6 * v, w); this.noise({ kind: 'brown', type: 'lowpass', f0: 400, f1: 80, dur: .6, a: .005, d: .55, vol: .5 * v, when: w, wet: .6 }); this.duck(-6, 200, 400); break;
      case 'tinkle': [0,4,7,14].forEach((n,i) => this.sample('harp', n + (o.semi || 0), .12 * v, w + i * .065, pan)); break;
      case 'saturate':
        [0,4,7].forEach((n,i) => this.sample('choir', n, .16 * v, w + i * .1, (i-1)*.3, .15));
        [0,4,2,7,12].forEach((n,i) => this.sample('harp', n, .2 * v, w + [0,.2,.3,.5,.85][i], pan));
        this.effect('shimmer', { ...o, vol: .35 * v }); break;
      case 'victory': [0,4,2,7,12].forEach((n,i) => this.sample('marimba', n, .25 * v, w + [0,.14,.28,.42,.7][i], pan)); break;
      case 'discovery':
        this.duck(-7, 80, 1500);
        [0, 4, 2, 7, 14, 12].forEach((n, i) => this.sample('harp', n, .3 * v, w + [0,.18,.36,.6,.9,1.2][i], (i % 3 - 1) * .3));
        [0,4,7].forEach(n => this.sample('choir', n, .12 * v, w + 1.2));
        break;
      // ---- compatibilidad con nombres antiguos
      case 'move': this.play('cursor', o); break; case 'ok': this.play('confirm', o); break; case 'back': this.play('cancel', o); break;
      case 'tech': this.play('fwip', o); break; case 'mix': this.play('mix_bell', o); break; case 'rainbow': this.play('arpeggio7', o); this.play('shimmer', o); break;
    }
  },
  // ---- ambiente del mapa: viento + gotas lejanas (gris) o viento + pájaros (vivo)
  ambient(mode) {
    if (!this.ctx) { this.ambPending = mode; return; }
    if (this.amb && this.amb.mode === mode) return; this.ambientStop();
    if (!mode) return; const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noiseBuf.brown; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(mode === 'vivo' ? .05 : .08, c.currentTime + 2);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .08; lg.gain.value = 220; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(g); g.connect(this.out); src.start();
    const timer = setInterval(() => { if (c.state !== 'running' || document.hidden) return; if (Math.random() < .5) { if (mode === 'vivo') { const f0 = 2200 + Math.random() * 1800; this.tone({ f0, f1: f0 * (1.2 + Math.random() * .4), dur: .08, wave: 'sine', a: .01, vol: .05, when: 0, pan: Math.random() * 1.6 - .8 }); if (Math.random() < .5) this.tone({ f0: f0 * 1.1, f1: f0 * .9, dur: .07, wave: 'sine', a: .01, vol: .04, when: .11, pan: Math.random() * 1.6 - .8 }); } else this.drip(400 + Math.random() * 500, .05, 0, .8, Math.random() * 1.6 - .8); } }, 1400);
    this.amb = { mode, src, g, lfo, timer };
  },
  ambientStop() { if (!this.amb) return; const a = this.amb, t = this.ctx.currentTime; a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.linearRampToValueAtTime(0, t + .6); setTimeout(() => { try { a.src.stop(); a.lfo.stop(); } catch (e) {} }, 700); clearInterval(a.timer); this.amb = null; },
};
