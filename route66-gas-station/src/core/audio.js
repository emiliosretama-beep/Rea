// Sonido sintetizado con Web Audio: sin archivos. Efectos, sonidos continuos y música de fondo estilo años 50.
// Safari solo deja sonar el audio después de un toque: unlock() se llama en el primer gesto del jugador.
const KEY = 'route66:audio';

export function createAudio() {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  const prefs = { sfx: true, music: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* sin almacenamiento */ }
  const listener = { x: 0, z: 0 };

  function savePrefs() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
  }

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch { return; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 1 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.music ? 0.32 : 0; musicBus.connect(master);
    // Ruido blanco reutilizable (2 s)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loops.engine = makeEngine();
    loops.wind = makeNoiseLoop('lowpass', 420, 0.05, true);
    startMusic();
  }

  // ---------- Piezas básicas ----------
  const now = () => ctx.currentTime;
  function env(gainNode, t0, a, peak, dec) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  }
  function tone(freq, { type = 'sine', t = 0, a = 0.005, dec = 0.25, vol = 0.3, glide = 0, bus = sfxBus } = {}) {
    const t0 = now() + t;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t0 + a + dec);
    const g = ctx.createGain(); env(g, t0, a, vol, dec);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + a + dec + 0.05);
  }
  function noise({ t = 0, a = 0.003, dec = 0.15, vol = 0.3, filter = 'bandpass', freq = 1200, q = 1, bus = sfxBus } = {}) {
    const t0 = now() + t;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t0, a, vol, dec);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0, Math.random()); src.stop(t0 + a + dec + 0.05);
  }

  // ---------- Efectos ----------
  const SFX = {
    // Caja registradora: campanita + cajón que se abre
    kaching() { noise({ freq: 2500, dec: 0.06, vol: 0.2 }); tone(2093, { t: 0.04, dec: 0.5, vol: 0.18, type: 'triangle' }); tone(2637, { t: 0.04, dec: 0.45, vol: 0.12 }); noise({ t: 0.08, filter: 'lowpass', freq: 600, dec: 0.18, vol: 0.25 }); },
    coin() { tone(1318, { dec: 0.08, vol: 0.16, type: 'square' }); tone(1975, { t: 0.07, dec: 0.25, vol: 0.14, type: 'square' }); },
    pop() { tone(500, { dec: 0.12, vol: 0.25, glide: 2.4 }); noise({ freq: 3000, dec: 0.04, vol: 0.08 }); },
    wood() { noise({ filter: 'lowpass', freq: 900, dec: 0.12, vol: 0.5 }); tone(160, { dec: 0.15, vol: 0.3, type: 'triangle', glide: 0.6 }); noise({ t: 0.35, filter: 'lowpass', freq: 500, dec: 0.2, vol: 0.4 }); },
    clunk() { tone(90, { dec: 0.25, vol: 0.5, type: 'square', glide: 0.5 }); noise({ filter: 'lowpass', freq: 400, dec: 0.2, vol: 0.4 }); tone(120, { t: 0.15, a: 0.3, dec: 0.8, vol: 0.12, type: 'sawtooth' }); },
    bell() { [1568, 1976, 2349].forEach((f, i) => tone(f, { t: i * 0.09, dec: 0.6, vol: 0.12, type: 'triangle' })); },
    build() { for (let i = 0; i < 3; i++) { noise({ t: i * 0.16, filter: 'bandpass', freq: 1800, q: 3, dec: 0.06, vol: 0.4 }); tone(320, { t: i * 0.16, dec: 0.08, vol: 0.2, type: 'square' }); } SFX.coin(); },
    jingle() { [523, 659, 784, 1046].forEach((f, i) => tone(f, { t: i * 0.11, dec: 0.3, vol: 0.16, type: 'triangle' })); },
    horn() { tone(392, { a: 0.02, dec: 0.35, vol: 0.18, type: 'sawtooth' }); tone(466, { a: 0.02, dec: 0.35, vol: 0.14, type: 'sawtooth' }); },
    beep() { tone(523, { a: 0.01, dec: 0.12, vol: 0.12, type: 'square' }); tone(523, { t: 0.18, a: 0.01, dec: 0.12, vol: 0.12, type: 'square' }); },
    door() { tone(1760, { dec: 0.4, vol: 0.1, type: 'triangle' }); tone(2217, { t: 0.06, dec: 0.4, vol: 0.08, type: 'triangle' }); },
    click() { noise({ freq: 3000, q: 2, dec: 0.025, vol: 0.18 }); },
    ratchet() { for (let i = 0; i < 4; i++) noise({ t: i * 0.05, freq: 2600, q: 6, dec: 0.02, vol: 0.25 }); },
    splash() { noise({ filter: 'lowpass', freq: 1500, a: 0.02, dec: 0.4, vol: 0.25 }); },
    angry() { tone(300, { dec: 0.25, vol: 0.18, type: 'sawtooth', glide: 0.6 }); },
    step() { noise({ filter: 'lowpass', freq: 260, dec: 0.06, vol: 0.12 }); },
    clunkSoft() { noise({ filter: 'lowpass', freq: 700, dec: 0.08, vol: 0.2 }); },
  };

  // Volumen según la distancia al jugador (pos = {x, z}; sin pos = sonido de interfaz)
  function play(name, pos) {
    if (!ctx || !prefs.sfx || !SFX[name]) return;
    if (pos) {
      const d = Math.hypot(pos.x - listener.x, pos.z - listener.z);
      const k = Math.max(0, 1 - d / 45);
      if (k <= 0.03) return;
      const g = ctx.createGain(); g.gain.value = k * k;
      const prev = sfxBus;
      g.connect(prev);
      sfxBus = g;
      try { SFX[name](); } finally { sfxBus = prev; }
      return;
    }
    SFX[name]();
  }

  // ---------- Sonidos continuos ----------
  const loops = {};
  function makeNoiseLoop(type, freq, vol, startOn = false) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = startOn ? vol : 0;
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    return { g, f, vol };
  }
  function makeEngine() {
    // Motor: diente de sierra grave filtrado + ruido; su volumen y tono dependen del auto más cercano
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = ctx.createGain(); g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(sfxBus); o.start();
    return { o, f, g };
  }
  const named = {
    pump: () => makeNoiseLoop('bandpass', 900, 0.09),
    wash: () => makeNoiseLoop('lowpass', 2000, 0.16),
    brew: () => makeNoiseLoop('bandpass', 500, 0.12),
  };
  // Enciende o apaga un sonido continuo (con fundido)
  function loop(name, on, level = 1) {
    if (!ctx) return;
    if (!loops[name]) { if (!on) return; loops[name] = named[name](); }
    const L = loops[name];
    L.g.gain.setTargetAtTime(on ? L.vol * level : 0, now(), 0.08);
    if (name === 'pump' && on) L.f.frequency.setTargetAtTime(900 + Math.random() * 60, now(), 0.1);
  }
  // Motor: distancia al auto más cercano y su velocidad
  function engine(dist, speed) {
    if (!ctx) return;
    const k = Math.max(0, 1 - dist / 40);
    loops.engine.g.gain.setTargetAtTime(k * k * 0.16, now(), 0.15);
    loops.engine.o.frequency.setTargetAtTime(42 + speed * 2.4, now(), 0.2);
    loops.engine.f.frequency.setTargetAtTime(250 + speed * 18, now(), 0.2);
  }

  // ---------- Música: progresión I–vi–IV–V (años 50) con bajo caminante, acordes y escobillas ----------
  const BPM = 96, BEAT = 60 / BPM;
  const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]; // C, Am, F, G
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let musicNext = 0, musicStep = 0, musicTimer = 0;
  function startMusic() {
    musicNext = now() + 0.3;
    musicTimer = setInterval(scheduleMusic, 120);
  }
  function scheduleMusic() {
    if (!ctx || ctx.state !== 'running') return;
    while (musicNext < now() + 0.4) {
      const bar = Math.floor(musicStep / 4) % 4, beat = musicStep % 4;
      const ch = CHORDS[bar];
      const t = musicNext - now();
      // Bajo caminante: raíz, tercera, quinta, sexta
      const walk = [0, 4, 7, 9][beat];
      tone(hz(ch[0] - 24 + walk), { t, a: 0.01, dec: BEAT * 0.85, vol: 0.5, type: 'triangle', bus: musicBus });
      // Acordes en los tiempos 2 y 4 (estilo shuffle)
      if (beat % 2 === 1) for (const n of ch) tone(hz(n), { t, a: 0.01, dec: BEAT * 0.5, vol: 0.09, type: 'square', bus: musicBus });
      // Escobillas
      noise({ t, filter: 'highpass', freq: 5000, dec: 0.06, vol: beat % 2 ? 0.16 : 0.07, bus: musicBus });
      // Melodía suave cada dos compases
      if (beat === 0 && bar % 2 === 0) tone(hz(ch[2] + 12), { t, a: 0.03, dec: BEAT * 1.6, vol: 0.06, type: 'sine', bus: musicBus });
      musicNext += BEAT;
      musicStep++;
    }
  }

  function setPref(kind, on) {
    prefs[kind] = on;
    savePrefs();
    if (!ctx) return;
    if (kind === 'sfx') sfxBus.gain.setTargetAtTime(on ? 1 : 0, now(), 0.05);
    if (kind === 'music') musicBus.gain.setTargetAtTime(on ? 0.32 : 0, now(), 0.1);
  }

  return {
    unlock,
    play,
    loop,
    engine,
    prefs,
    setPref,
    setListener(x, z) { listener.x = x; listener.z = z; },
    // Pausa todo cuando la pestaña se oculta
    suspend(on) { if (!ctx) return; if (on) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {}); },
    stopMusic() { clearInterval(musicTimer); },
  };
}
