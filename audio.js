// CHROMARA — música muestreada, mezcla y fallback sin red.
'use strict';
const Audio = {
  ctx: null, master: null, seq: null, cur: null, pending: null,
  musicLevel: .82, positions: {}, token: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = .55;
    const limiter = c.createDynamicsCompressor(); limiter.threshold.value = -5;
    limiter.knee.value = 3; limiter.ratio.value = 12; limiter.attack.value = .003; limiter.release.value = .18;
    this.master.connect(limiter); limiter.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicLevel; this.musicBus.connect(this.master);
    if (typeof SFX !== 'undefined') { SFX.init(c, this.master); if (SFX.ambPending !== undefined) SFX.ambient(SFX.ambPending); }
    if (this.pending) this.play(this.pending);
  },
  // A gain's instantaneous value is not its settled level. Always recover to the
  // fixed bus level, even when several splashes/techs duck the score together.
  duck(db = -4, attack = .035, hold = .16, release = .3) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, g = this.musicBus.gain, level = this.musicLevel;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
    else { const v = g.value; g.cancelScheduledValues(t); g.setValueAtTime(v, t); }
    g.linearRampToValueAtTime(level * Math.pow(10, db / 20), t + attack);
    g.setValueAtTime(level * Math.pow(10, db / 20), t + attack + hold);
    g.linearRampToValueAtTime(level, t + attack + hold + release);
  },
  tone(f, t0, dur, type = 'square', vol = 0.25, slide = 0) {
    if (!this.ctx) return; const o = this.ctx.createOscillator(), gn = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t0 + dur);
    gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn); gn.connect(this.synthBus || this.musicBus); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  noise(t0, dur, vol = 0.2, hp = 800) {
    if (!this.ctx) return; const n = this.ctx.sampleRate * dur | 0, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(); s.buffer = b; const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const gn = this.ctx.createGain(); gn.gain.value = vol; s.connect(f); f.connect(gn); gn.connect(this.synthBus || this.musicBus); s.start(t0);
  },
  sfx(name, o) {
    if (!this.ctx) return; if (typeof SFX !== 'undefined' && SFX.ctx) { SFX.play(name, o); return; } const t = this.ctx.currentTime;
    switch (name) {
      case 'move': this.tone(880, t, .04, 'square', .08); break;
      case 'ok': this.tone(660, t, .05, 'square', .12); this.tone(990, t + .05, .08, 'square', .12); break;
      case 'back': this.tone(440, t, .08, 'square', .1, -200); break;
      case 'nope': this.tone(180, t, .12, 'square', .12); break;
      case 'hit': this.noise(t, .08, .25, 1500); this.tone(160, t, .1, 'square', .2, -100); break;
      case 'hitweak': this.noise(t, .1, .3, 900); this.tone(220, t, .18, 'sawtooth', .22, -180); this.tone(880, t + .04, .12, 'square', .12, 400); break;
      case 'heal': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * .07, .18, 'triangle', .16)); break;
      case 'tech': this.tone(300, t, .3, 'sawtooth', .16, 900); this.noise(t + .1, .15, .12, 3000); break;
      case 'mix': [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, t + i * .04, .22, 'square', .12)); this.noise(t + .18, .2, .2, 2000); break;
      case 'rainbow': [262, 330, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, t + i * .05, .3, 'triangle', .16)); break;
      case 'ready': this.tone(1320, t, .05, 'square', .07); break;
      case 'die': this.noise(t, .3, .2, 400); this.tone(200, t, .35, 'sawtooth', .15, -150); break;
      case 'fall': this.tone(1200, t, .45, 'sine', .15, -1000); break;
      case 'splash': this.noise(t, .35, .4, 300); this.tone(90, t, .3, 'sine', .3, -60); break;
      case 'victory': [523, 523, 523, 659, 784, 659, 784].forEach((f, i) => this.tone(f, t + [0, .12, .24, .36, .6, .84, .96][i], i > 3 ? .3 : .12, 'square', .14)); break;
      case 'ko': this.tone(300, t, .5, 'square', .15, -250); break;
      case 'encounter': this.tone(110, t, .6, 'sawtooth', .18, 60); break;
      case 'equip': this.tone(740, t, .06, 'triangle', .12); this.tone(1100, t + .06, .1, 'triangle', .12); break;
    }
  },
  // ---- Sintetizador de música (esquema MUSIC de music.js): pulsos con duty, ADSR, vibrato, eco, batería
  waves: {},
  wave(osc, name) {
    if (name === 'tri') osc.type = 'triangle'; else if (name === 'saw') osc.type = 'sawtooth'; else if (name === 'sine') osc.type = 'sine';
    else { const d = { pulse50: .5, pulse25: .25, pulse12: .125, square: .5 }[name] ?? .5; let w = this.waves[d]; if (!w) { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d); w = this.waves[d] = this.ctx.createPeriodicWave(re, im, { disableNormalization: false }); } osc.setPeriodicWave(w); }
  },
  bus() { // eco compartido (retardo sincronizado al tempo por canción)
    if (this.echo) return this.echo; const d = this.ctx.createDelay(1); d.delayTime.value = .28; const fb = this.ctx.createGain(); fb.gain.value = .32; const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    d.connect(lp); lp.connect(fb); fb.connect(d); const out = this.ctx.createGain(); out.gain.value = .5; lp.connect(out); out.connect(this.synthBus || this.musicBus); this.echo = d; return d;
  },
  note(tr, t0, midi, dur, vel = 1) {
    const ctx = this.ctx, f = 440 * Math.pow(2, (midi - 69) / 12), [a, dc, su, rl] = tr.env || [0.005, 0.06, 0.75, 0.06], peak = (tr.vol ?? .2) * vel * 1.5; // la música iba ~6 dB por debajo de los SFX
    const o = ctx.createOscillator(); this.wave(o, tr.wave || 'pulse50'); o.frequency.value = f;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(peak, t0 + a); gn.gain.linearRampToValueAtTime(peak * su, t0 + a + dc);
    const end = t0 + Math.max(a + dc, dur - rl * .5); gn.gain.setValueAtTime(peak * su, end); gn.gain.linearRampToValueAtTime(0.0001, end + rl);
    o.connect(gn); gn.connect(this.synthBus || this.musicBus); if (tr.echo) { const s = ctx.createGain(); s.gain.value = tr.echo; gn.connect(s); s.connect(this.bus()); }
    if (tr.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.6; lg.gain.value = tr.vib * 14; l.connect(lg); lg.connect(o.detune); l.start(t0 + .08); l.stop(end + rl + .05); }
    o.start(t0); o.stop(end + rl + .05);
  },
  drum(kind, t0, vol = 1) {
    const ctx = this.ctx; vol *= 1.3;
    if (kind === 'k') { const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(160, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + .1); gn.gain.setValueAtTime(.5 * vol, t0); gn.gain.exponentialRampToValueAtTime(.001, t0 + .16); o.connect(gn); gn.connect(this.synthBus || this.musicBus); o.start(t0); o.stop(t0 + .2); this.noise(t0, .02, .12 * vol, 2000); }
    else if (kind === 's') { this.noise(t0, .12, .22 * vol, 1200); const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(120, t0 + .06); gn.gain.setValueAtTime(.25 * vol, t0); gn.gain.exponentialRampToValueAtTime(.001, t0 + .08); o.connect(gn); gn.connect(this.synthBus || this.musicBus); o.start(t0); o.stop(t0 + .1); }
    else if (kind === 'h') this.noise(t0, .03, .07 * vol, 7000);
    else if (kind === 'o') this.noise(t0, .14, .06 * vol, 6000);
  },
  // HTTP loads only the requested compressed cue. file:// uses the embedded
  // edition, with the same exact loop metadata and no fetch/CORS requirement.
  buffers: {}, decoding: {},
  cue(name) {
    if (typeof MUSIC_CUES !== 'undefined' && MUSIC_CUES[name]) return MUSIC_CUES[name];
    return typeof MUSIC_SAMPLES !== 'undefined' ? MUSIC_SAMPLES[name] : null;
  },
  async decode(name) {
    if (this.buffers[name]) return this.buffers[name];
    if (this.decoding[name]) return this.decoding[name];
    this.decoding[name] = (async () => {
      let bytes;
      const embedded = typeof MUSIC_SAMPLES !== 'undefined' && MUSIC_SAMPLES[name];
      if (embedded) {
        const bin = atob(embedded.data), arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        bytes = arr.buffer;
      } else {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
        try {
          const revision = this.cue(name)?.revision;
          const response = await fetch('music/' + name + '.opus.ogg' + (revision ? '?v=' + encodeURIComponent(revision) : ''), { signal: controller.signal });
          if (!response.ok) throw new Error('Audio HTTP ' + response.status);
          bytes = await response.arrayBuffer();
        } finally { clearTimeout(timer); }
      }
      const buffer = await this.ctx.decodeAudioData(bytes);
      // Decoded PCM is much larger than Opus: keep at most four cues in memory.
      for (const key of Object.keys(this.buffers)) {
        if (Object.keys(this.buffers).length < 4) break;
        if (key !== this.cur) delete this.buffers[key];
      }
      this.buffers[name] = buffer;
      return buffer;
    })();
    try { return await this.decoding[name]; } finally { delete this.decoding[name]; }
  },
  prepare(name) {
    if (this.ctx && this.cue(name)) return this.decode(name).catch(() => null);
    return Promise.resolve(null);
  },
  playSample(name, options, token) {
    const S = this.cue(name);
    this.decode(name).then(buf => {
      if (this.token !== token || this.cur !== name) return;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = !!S.loop;
      if (S.loop) { src.loopStart = S.loopStart; src.loopEnd = Math.min(S.loopEnd, buf.duration); }
      let offset = options.resume ? (this.positions[name] || 0) : 0;
      if (S.loop && offset >= src.loopEnd) offset = src.loopStart + (offset - src.loopStart) % (src.loopEnd - src.loopStart);
      if (offset >= buf.duration) offset = 0;
      const t = this.ctx.currentTime, gn = this.ctx.createGain();
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(1, t + (options.fade ?? .35));
      src.connect(gn); gn.connect(this.musicBus); src.start(t, offset);
      this.src = { src, gn, name, offset, started: t, rate: 1 };
      src.onended = () => { src.disconnect(); gn.disconnect(); if (this.src?.src === src) this.src = null; };
      // Prepare only the immediate next scene, not the whole soundtrack.
      if (name === 'title') this.prepare('map');
      else if (name === 'map' || name === 'atelier') this.prepare('battle');
      else if (name === 'battle' || name === 'boss') this.prepare('victory');
    }).catch(e => {
      if (this.token !== token || this.cur !== name) return;
      console.warn('Música: usando partitura de respaldo para ' + name, e.message);
      this.play(name, { ...options, fallback: true, restart: true });
    });
  },
  remember() {
    const track = this.src; if (!track) return;
    const elapsed = this.ctx.currentTime - track.started, ramp = track.ramp;
    let distance = elapsed * track.rate;
    if (ramp) {
      const dt = Math.min(elapsed, ramp.duration);
      distance = ramp.from * dt + (ramp.to - ramp.from) * dt * dt / (2 * ramp.duration)
        + ramp.to * Math.max(0, elapsed - ramp.duration);
    }
    this.positions[track.name] = track.offset + distance;
  },
  play(name, options = {}) {
    this.pending = name;
    if (!this.ctx) return;
    if (this.cur === name && !options.restart) return; // includes an in-flight decode and a finished one-shot
    this.stop(options.fade ?? .35); this.cur = name; this.pending = name;
    if (!options.fallback && this.cue(name)) { this.playSample(name, options, this.token); return; }
    this.synthBus = this.ctx.createGain(); this.synthBus.connect(this.musicBus);
    // New cues retain their written pitches/rhythms when a codec or network fails.
    const fallbackName = ({ restored: 'title', atelier: 'map', prelude: 'boss' })[name] || name;
    const M = (typeof MUSIC_FALLBACK !== 'undefined' && MUSIC_FALLBACK[name]) || ((typeof MUSIC !== 'undefined' && MUSIC[fallbackName]) ? MUSIC[fallbackName] : null);
    if (!M) { this.playLegacy(fallbackName); return; }
    const sps = 60 / M.bpm / (M.stepsPerBeat || 4), len = M.length, events = [];
    M.tracks.forEach(tr => { for (const n of tr.notes) events.push({ step: n[0], tr, midi: n[1], dur: n[2] * sps, vel: n[3] ?? 1 }); });
    (M.drums || []).forEach(d => events.push({ step: d[0], drum: d[1], vel: d[2] ?? 1 }));
    events.sort((a, b) => a.step - b.step); if (!events.length) return;
    const repeatStep = M.loopStart || 0, repeatIndex = Math.max(0, events.findIndex(e => e.step >= repeatStep));
    if (this.echo) this.echo.delayTime.value = Math.min(.9, sps * 3); // eco a corchea con puntillo
    let loopStart = this.ctx.currentTime + 0.06, idx = 0;
    const tick = () => {
      if (!this.ctx) return;
      for (let guard = 0; guard < 4000; guard++) {
        const ev = events[idx], t = loopStart + ev.step * sps; if (t > this.ctx.currentTime + 0.25) return;
        if (ev.drum) this.drum(ev.drum, t, ev.vel); else this.note(ev.tr, t, ev.midi, ev.dur, ev.vel);
        if (++idx >= events.length) { if (M.loop === false) { clearInterval(this.seq); this.seq = null; return; } idx = repeatIndex; loopStart += (len - repeatStep) * sps; }
      }
    };
    tick(); this.seq = setInterval(tick, 50);
  },
  playLegacy(name) {
    const song = SONGS[name]; if (!song) return;
    const spb = 60 / song.bpm / 4; let step = 0, next = this.ctx.currentTime + 0.05;
    const N = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const freq = n => { const m = N[n[0]] + (n[1] === '#' ? 1 : 0) + 12 * (parseInt(n[n.length - 1]) + 1); return 440 * Math.pow(2, (m - 69) / 12); };
    const len = song.tracks[0].pat.length;
    this.seq = setInterval(() => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.15) {
        for (const tr of song.tracks) {
          const n = tr.pat[step % len]; if (n === '-' || n === '.') continue;
          let d = 1; while (tr.pat[(step + d) % len] === '.' && d < 16) d++;
          this.tone(freq(n), next, spb * d * 0.9, tr.wave, tr.vol);
        }
        if (song.drums) { const dr = song.drums[step % song.drums.length]; if (dr === 'k') this.drum('k', next); if (dr === 's') this.drum('s', next); if (dr === 'h') this.drum('h', next); }
        next += spb; step++;
      }
    }, 40);
  },
  stop(fade = .12) {
    this.remember();
    if (this.seq) clearInterval(this.seq);
    this.seq = null; this.cur = null; this.pending = null; this.token++;
    const t = this.ctx?.currentTime || 0;
    if (this.src) {
      const { src, gn } = this.src;
      if (gn.gain.cancelAndHoldAtTime) gn.gain.cancelAndHoldAtTime(t);
      else { gn.gain.cancelScheduledValues(t); gn.gain.setValueAtTime(gn.gain.value, t); }
      gn.gain.linearRampToValueAtTime(0, t + fade);
      try { src.stop(t + fade + .01); } catch (e) { /* already ended */ }
      this.src = null;
    }
    if (this.synthBus) {
      const bus = this.synthBus; bus.gain.setTargetAtTime(0, t, Math.max(.005, fade / 3));
      setTimeout(() => bus.disconnect(), (fade + .4) * 1000);
      this.synthBus = null; this.echo = null;
    }
  },
  bend(rate, secs = .5) {
    if (!this.ctx || !this.src) return;
    // Store the musical position before the encounter's tape-down gesture.
    this.remember();
    this.src.offset = this.positions[this.src.name]; this.src.started = this.ctx.currentTime;
    const pr = this.src.src.playbackRate, t = this.ctx.currentTime;
    this.src.rate = rate;
    this.src.ramp = secs > 0 ? { from: pr.value, to: rate, duration: secs } : null;
    pr.cancelScheduledValues(t); pr.setValueAtTime(pr.value, t); pr.linearRampToValueAtTime(rate, t + secs);
  },
};
