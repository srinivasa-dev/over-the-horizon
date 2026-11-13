// =================================================================
// OVER THE HORIZON: Procedural Web Audio Engine & Adaptive Soundtracks
// =================================================================

// Safe Storage Helpers for Volume Settings
function safeGetAudioSetting(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'NaN' || raw === 'null') {
      return defaultVal;
    }
    const val = parseFloat(raw);
    return Number.isFinite(val) ? Math.max(0.0, Math.min(1.0, val)) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function safeSetAudioSetting(key, val) {
  try {
    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      localStorage.setItem(key, num.toString());
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {}
}

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = safeGetAudioSetting('oth_audio_muted', 0) === 1;
    this.masterVolume = safeGetAudioSetting('oth_master_volume', 0.85); // Boosted from 0.50
    this.musicVolume = safeGetAudioSetting('oth_music_volume', 0.75);   // Boosted from 0.48
    this.sfxVolume = safeGetAudioSetting('oth_sfx_volume', 0.70);       // Boosted from 0.40

    // Guard against any lingering non-finite stored values
    if (!Number.isFinite(this.masterVolume)) this.masterVolume = 0.85;
    if (!Number.isFinite(this.musicVolume)) this.musicVolume = 0.75;
    if (!Number.isFinite(this.sfxVolume)) this.sfxVolume = 0.70;

    // Track active nodes
    this.musicGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.weatherNoiseNode = null;
    this.weatherFilter = null;
    this.weatherGain = null;

    // Music playback state
    this.currentPlanet = "Oakhaven";
    this.musicTimer = null;
    this.stepIndex = 0;
    this.isMusicPlaying = false;
  }

  // ---------------------------------------------------------------
  // 1. INITIALIZATION ON USER INTERACTION
  // ---------------------------------------------------------------
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API not supported in this browser.");
      return;
    }

    try {
      this.ctx = new AudioContext();
    } catch (err) {
      console.warn("Failed to create AudioContext:", err);
      return;
    }

    // Unlock iOS WebKit audio hardware with silent buffer
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
    } catch (e) {}

    // Master bus
    this.masterGain = this.ctx.createGain();
    const safeMaster = (this.isMuted || !Number.isFinite(this.masterVolume)) ? 0.0 : this.masterVolume;
    this.masterGain.gain.setValueAtTime(safeMaster, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Sub-buses
    this.musicGain = this.ctx.createGain();
    const safeMusic = Number.isFinite(this.musicVolume) ? this.musicVolume : 0.75;
    this.musicGain.gain.setValueAtTime(safeMusic, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    const safeSfx = Number.isFinite(this.sfxVolume) ? this.sfxVolume : 0.70;
    this.sfxGain.gain.setValueAtTime(safeSfx, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Off until car moves
    this.engineGain.connect(this.masterGain);

    this._setupEngineSynth();
    this._setupWeatherAmbience();
    this.startPlanetMusic(this.currentPlanet);
  }

  // ---------------------------------------------------------------
  // 2. PROCEDURAL VEHICLE ENGINE SOUND
  // ---------------------------------------------------------------
  _setupEngineSynth() {
    if (!this.ctx) return;

    // Primary low-end rumble oscillator (Triangle)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'triangle';
    this.engineOsc1.frequency.setValueAtTime(42.0, this.ctx.currentTime);

    // Harmonic growl oscillator (Sawtooth with attenuated sub-gain)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.setValueAtTime(21.0, this.ctx.currentTime);

    const sawAttenuator = this.ctx.createGain();
    sawAttenuator.gain.setValueAtTime(0.20, this.ctx.currentTime); // Soften sawtooth bite

    // Warm resonant low-pass filter (Natural acoustic Q=1.15)
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(200, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(1.15, this.ctx.currentTime); // Eliminates resonant screech

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(sawAttenuator);
    sawAttenuator.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Road surface tire rumble & airflow noise generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.025 * white) / 1.025;
      lastOut = output[i];
      output[i] *= 3.0;
    }
    this.roadNoiseSource = this.ctx.createBufferSource();
    this.roadNoiseSource.buffer = noiseBuffer;
    this.roadNoiseSource.loop = true;

    this.roadNoiseFilter = this.ctx.createBiquadFilter();
    this.roadNoiseFilter.type = 'lowpass';
    this.roadNoiseFilter.frequency.setValueAtTime(120, this.ctx.currentTime);

    this.roadNoiseGain = this.ctx.createGain();
    this.roadNoiseGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.roadNoiseSource.connect(this.roadNoiseFilter);
    this.roadNoiseFilter.connect(this.roadNoiseGain);
    this.roadNoiseGain.connect(this.masterGain);
    this.roadNoiseSource.start();

    this.smoothedEngineFreq = 42.0;
    this.smoothedEngineGain = 0.0;
  }

  updateEngine(speedKmh, isAccelerating) {
    if (!this.ctx || !this.engineGain) return;

    const absSpeed = Math.abs(speedKmh);

    // Multi-Gear Realistic RPM Simulation (4 Gears)
    let gearRatio = 0.0;
    let gearBase = 42.0;

    if (absSpeed < 18.0) {
      // 1st Gear (0 - 18 km/h)
      gearRatio = absSpeed / 18.0;
      gearBase = 42.0 + gearRatio * 40.0; // 42 -> 82 Hz
    } else if (absSpeed < 36.0) {
      // 2nd Gear (18 - 36 km/h)
      gearRatio = (absSpeed - 18.0) / 18.0;
      gearBase = 54.0 + gearRatio * 44.0; // 54 -> 98 Hz
    } else if (absSpeed < 52.0) {
      // 3rd Gear (36 - 52 km/h)
      gearRatio = (absSpeed - 36.0) / 16.0;
      gearBase = 68.0 + gearRatio * 46.0; // 68 -> 114 Hz
    } else {
      // 4th Cruise Gear (52 - 68+ km/h)
      gearRatio = Math.min(1.1, (absSpeed - 52.0) / 16.0);
      gearBase = 78.0 + gearRatio * 48.0; // 78 -> 130 Hz
    }

    if (absSpeed < 0.5 && !isAccelerating) {
      // Idle purr (warm, audible baseline)
      this.smoothedEngineFreq += (38.0 - this.smoothedEngineFreq) * 0.10;
      this.smoothedEngineGain += (0.038 - this.smoothedEngineGain) * 0.10; // Boosted from 0.022
      this.engineFilter.frequency.value = 160.0;
      if (this.roadNoiseGain) this.roadNoiseGain.gain.value = 0.0;
    } else {
      // Dynamic combustion micro-jitter & cruising throttle breath (prevents stuck monotone sound)
      const t = this.ctx.currentTime;
      const jitter = Math.sin(t * 32.0) * 1.0 + (Math.sin(t * 7.5) * 1.4);
      const throttleBreath = isAccelerating ? (Math.sin(t * 4.0) * 1.8) : 0.0;

      // Rich vehicle engine levels (boosted from 0.095/0.055)
      const targetGain = isAccelerating ? 0.17 : 0.095;
      const targetFreq = gearBase + (isAccelerating ? 8.0 : 0.0) + jitter + throttleBreath;
      const targetCutoff = 200.0 + (absSpeed / 65.0) * 520.0 + (isAccelerating ? 160.0 : 0.0);

      this.smoothedEngineFreq += (targetFreq - this.smoothedEngineFreq) * 0.14;
      this.smoothedEngineGain += (targetGain - this.smoothedEngineGain) * 0.14;
      this.engineFilter.frequency.value = targetCutoff;

      // Update tire road rumble noise layer (mellow background texture)
      if (this.roadNoiseGain && this.roadNoiseFilter) {
        this.roadNoiseGain.gain.value = Math.min(0.08, (absSpeed / 65.0) * 0.07);
        this.roadNoiseFilter.frequency.value = 120.0 + (absSpeed / 65.0) * 320.0;
      }
    }

    this.engineOsc1.frequency.value = Math.max(25.0, this.smoothedEngineFreq);
    this.engineOsc2.frequency.value = Math.max(12.0, this.smoothedEngineFreq * 0.5);
    this.engineGain.gain.value = this.smoothedEngineGain;
  }

  // Solid Collision Impact Crunch SFX
  playCrashSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95.0, t);
    osc.frequency.exponentialRampToValueAtTime(25.0, t + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.Q.setValueAtTime(2.0, t);

    env.gain.setValueAtTime(0.45, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.34);
  }

  // ---------------------------------------------------------------
  // 3. INTERACTIVE RETRO CAR HORN ('H' KEY)
  // ---------------------------------------------------------------
  playHorn() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Classic two-tone dual trumpet horn (F4 & A4)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(349.23, t); // F4
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(440.00, t); // A4

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(1.8, t);

    hornGain.gain.setValueAtTime(0.0, t);
    hornGain.gain.linearRampToValueAtTime(0.35, t + 0.04);
    hornGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(hornGain);
    hornGain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.46);
    osc2.stop(t + 0.46);
  }

  // ---------------------------------------------------------------
  // 4. WEATHER AMBIENCE NOISE
  // ---------------------------------------------------------------
  _setupWeatherAmbience() {
    if (!this.ctx) return;

    // Generate 2 seconds of pink/brown noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise filter
      lastOut = output[i];
      output[i] *= 3.5;
    }

    this.weatherNoiseNode = this.ctx.createBufferSource();
    this.weatherNoiseNode.buffer = noiseBuffer;
    this.weatherNoiseNode.loop = true;

    this.weatherFilter = this.ctx.createBiquadFilter();
    this.weatherFilter.type = 'lowpass';
    this.weatherFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.weatherGain = this.ctx.createGain();
    this.weatherGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.weatherNoiseNode.connect(this.weatherFilter);
    this.weatherFilter.connect(this.weatherGain);
    this.weatherGain.connect(this.masterGain);

    this.weatherNoiseNode.start();
  }

  setWeatherSound(weatherType) {
    if (!this.ctx || !this.weatherGain || !this.weatherFilter) return;
    const t = this.ctx.currentTime;

    switch (weatherType) {
      case "Rain":
        this.weatherFilter.type = 'lowpass';
        this.weatherGain.gain.setTargetAtTime(0.24, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(1400, t, 0.4);
        break;
      case "Snow":
        this.weatherFilter.type = 'lowpass';
        this.weatherGain.gain.setTargetAtTime(0.12, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(320, t, 0.4);
        break;
      case "Sandstorm":
        this.weatherFilter.type = 'lowpass';
        this.weatherGain.gain.setTargetAtTime(0.30, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(650, t, 0.4);
        break;
      default: // Clear: soothing planetary breeze & ambient air currents according to planet
        this.setPlanetAmbience(this.currentPlanet);
        break;
    }
  }

  setPlanetAmbience(planetType) {
    if (!this.ctx || !this.weatherGain || !this.weatherFilter) return;
    const t = this.ctx.currentTime;

    // Natural, organic low-frequency atmospheric air currents (Zero harsh whistles or electronic noise)
    this.weatherFilter.type = 'lowpass';

    switch (planetType) {
      case "Oakhaven": // Alpine mountain breeze
        this.weatherGain.gain.setTargetAtTime(0.16, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(260, t, 0.4);
        break;
      case "Cinderfell": // Volcanic subterranean thermal convection
        this.weatherGain.gain.setTargetAtTime(0.18, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(210, t, 0.4);
        break;
      case "Aetheria": // Soft twilight atmospheric breeze
        this.weatherGain.gain.setTargetAtTime(0.16, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(280, t, 0.4);
        break;
      case "Rustvale": // Crimson canyon dust wind
        this.weatherGain.gain.setTargetAtTime(0.17, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(290, t, 0.4);
        break;
      case "Stormhaven": // Gas giant low air current
        this.weatherGain.gain.setTargetAtTime(0.22, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(340, t, 0.4);
        break;
      case "Ringhaven": // Solar wind whisper
        this.weatherGain.gain.setTargetAtTime(0.14, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(250, t, 0.4);
        break;
      case "Frostveil": // Quiet sub-zero glacial breeze
        this.weatherGain.gain.setTargetAtTime(0.15, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(220, t, 0.4);
        break;
      case "Thalassa": // Deep ocean current hum
        this.weatherGain.gain.setTargetAtTime(0.20, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(160, t, 0.4);
        break;
      case "Nocturna": // Deep interstellar quiet air current
        this.weatherGain.gain.setTargetAtTime(0.13, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(140, t, 0.4);
        break;
      default:
        this.weatherGain.gain.setTargetAtTime(0.16, t, 0.4);
        this.weatherFilter.frequency.setTargetAtTime(260, t, 0.4);
        break;
    }
  }

  // ---------------------------------------------------------------
  // 5. PROCEDURAL SOUNDTRACK GENERATOR (Organic, Musical, Zero Beeps)
  // ---------------------------------------------------------------
  startPlanetMusic(planetType) {
    this.currentPlanet = planetType;
    if (this.musicTimer) clearInterval(this.musicTimer);

    // Update ambient background air current for this planet
    this.setPlanetAmbience(planetType);

    if (!this.ctx) return;
    this.isMusicPlaying = true;
    this.stepIndex = 0;

    // Distinct BPM per planet matching planetary energy & biome
    let bpm = 88;
    if (planetType === "Oakhaven") {
      bpm = 104; // STRICTLY UNTOUCHED
    } else if (planetType === "Stormhaven") {
      bpm = 112; // Driving cinematic electro-acoustic
    } else if (planetType === "Cinderfell") {
      bpm = 92;  // Warm volcanic marimba & acoustic bass groove
    } else if (planetType === "Ringhaven") {
      bpm = 90;  // Serene celestial harp & singing bowls
    } else if (planetType === "Thalassa") {
      bpm = 82;  // Abyssal rolling ocean & submerged Rhodes
    } else if (planetType === "Rustvale") {
      bpm = 80;  // Cinematic Martian acoustic & warm analog synth
    } else if (planetType === "Aetheria") {
      bpm = 78;  // Lush ambient dream pad
    } else if (planetType === "Frostveil") {
      bpm = 76;  // Warm wooden kalimba & cello
    } else if (planetType === "Nocturna") {
      bpm = 64;  // Deep cosmic ambient minimalism
    }

    const intervalMs = (60 / bpm) * 1000 / 2; // 8th notes

    this.musicTimer = setInterval(() => {
      if (!this.isMusicPlaying || this.isMuted) return;
      this._playNextNote();
      this.stepIndex = (this.stepIndex + 1) % 32;
    }, intervalMs);
  }

  _playNextNote() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    if (this.currentPlanet === "Oakhaven") {
      // Warm acoustic nylon-string guitar progression:
      // Bar 1: Cmaj7 | Bar 2: Am7 | Bar 3: Fmaj7 | Bar 4: G6
      const chordC   = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
      const chordAm  = [220.00, 261.63, 329.63, 392.00]; // A3, C4, E4, G4
      const chordF   = [174.61, 261.63, 329.63, 349.23]; // F3, C4, E4, F4
      const chordG   = [196.00, 246.94, 293.66, 392.00]; // G3, B3, D4, G4

      const chords = [chordC, chordAm, chordF, chordG];
      const chordIndex = Math.floor(this.stepIndex / 8);
      const noteInChord = (this.stepIndex % 4);
      const freq = chords[chordIndex][noteInChord];

      // Soft plucked sine + triangle
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.18, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(env);
      env.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.40);

    } else if (this.currentPlanet === "Cinderfell") {
      // Warm volcanic desert-rock: Acoustic bass guitar & wooden basalt marimba
      // Bar 1: Dm7 | Bar 2: Am7 | Bar 3: Bbmaj7 | Bar 4: C6
      const chordDm = [73.42, 146.83, 220.00, 261.63, 349.23]; // D2, D3, A3, C4, F4
      const chordAm = [55.00, 110.00, 164.81, 220.00, 261.63]; // A1, A2, E3, A3, C4
      const chordBb = [58.27, 116.54, 174.61, 233.08, 293.66]; // Bb1, Bb2, F3, Bb3, D4
      const chordC  = [65.41, 130.81, 196.00, 246.94, 329.63]; // C2, C3, G3, B3, E4

      const chords = [chordDm, chordAm, chordBb, chordC];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Deep acoustic bass pulse on beats 0 and 4 (Warm, rounded, ZERO beeps)
      if (stepInBar === 0 || stepInBar === 4) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(chord[0], t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, t);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.20, t + 0.025);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.50);
      }

      // Warm wooden basalt marimba arpeggio across 8th notes (146Hz - 349Hz, ZERO high beeps)
      const noteIdx = (stepInBar % 4) + 1;
      const freq = chord[noteIdx] || chord[1];

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);

      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.14, t + 0.018);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.44);

    } else if (this.currentPlanet === "Aetheria") {
      // Ethereal ambient dreamscape: Warm lush pads & acoustic Rhodes
      // Bar 1: F#maj9 | Bar 2: Bmaj7 | Bar 3: D#m7 | Bar 4: C#add9
      const chordFsharp = [185.00, 277.18, 329.63, 440.00]; // F#3, C#4, E4, A4
      const chordB      = [123.47, 246.94, 311.13, 369.99]; // B2, B3, D#4, F#4
      const chordDsharp = [155.56, 233.08, 277.18, 369.99]; // D#3, A#3, C#4, F#4
      const chordCsharp = [138.59, 207.65, 277.18, 329.63]; // C#3, G#3, C#4, E4

      const chords = [chordFsharp, chordB, chordDsharp, chordCsharp];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Warm swelling ambient pad on downbeat (Zero harsh whistles)
      if (stepInBar === 0) {
        for (let i = 0; i < 2; i++) {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const env = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(chord[i * 2] * (i === 1 ? 1.002 : 1.0), t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(420, t);

          env.gain.setValueAtTime(0.0, t);
          env.gain.linearRampToValueAtTime(0.09, t + 0.35);
          env.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

          osc.connect(filter);
          filter.connect(env);
          env.connect(this.musicGain);

          osc.start(t);
          osc.stop(t + 2.3);
        }
      }

      // Warm acoustic Rhodes arpeggios on steps 0, 2, 4, 6 (185Hz - 440Hz, ZERO beeps)
      if (stepInBar % 2 === 0) {
        const noteIdx = (stepInBar / 2) % 4;
        const freq = chord[noteIdx];

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, t);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.12, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.50);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.52);
      }

    } else if (this.currentPlanet === "Rustvale") {
      // Cinematic warm analog synth & fingerpicked acoustic guitar in D Dorian
      // Bar 1: Dm9 | Bar 2: Fmaj7 | Bar 3: Gm7 | Bar 4: Asus4
      const chordDm = [146.83, 220.00, 261.63, 329.63]; // D3, A3, C4, E4
      const chordF  = [174.61, 261.63, 329.63, 392.00]; // F3, C4, E4, G4
      const chordGm = [196.00, 246.94, 293.66, 349.23]; // G3, Bb3, D4, F4
      const chordA  = [220.00, 293.66, 329.63, 440.00]; // A3, D4, E4, A4

      const chords = [chordDm, chordF, chordGm, chordA];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Warm analog synth brass pad on downbeats (step 0 and 4)
      if (stepInBar === 0 || stepInBar === 4) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(chord[0] * 0.5, t); // Warm octave lower fundamental
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(chord[0] * 0.503, t); // Warm chorused detune

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, t);
        filter.frequency.exponentialRampToValueAtTime(450, t + 0.25);
        filter.frequency.exponentialRampToValueAtTime(260, t + 1.1);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.09, t + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 1.25);
        osc2.stop(t + 1.25);
      }

      // Fingerpicked acoustic guitar arpeggio (identical natural feel to Oakhaven, ZERO beeps)
      const noteInChord = (stepInBar % 4);
      const freq = chord[noteInChord];

      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.15, t + 0.016);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(env);
      env.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.40);

    } else if (this.currentPlanet === "Stormhaven") {
      // Driving cinematic electro-acoustic power (Daft Punk / Zimmer style)
      // Bar 1: Em7 | Bar 2: Cmaj7 | Bar 3: Am7 | Bar 4: Bm7
      const chordEm = [82.41, 164.81, 246.94, 329.63]; // E2, E3, B3, E4
      const chordC  = [65.41, 130.81, 261.63, 329.63]; // C2, C3, C4, E4
      const chordAm = [55.00, 110.00, 220.00, 261.63]; // A1, A2, A3, C4
      const chordBm = [61.74, 123.47, 246.94, 293.66]; // B1, B2, B3, D4

      const chords = [chordEm, chordC, chordAm, chordBm];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Warm analog Moog bass sequencer (Warm lowpass, ZERO high static beeps)
      const arpBass = [chord[0], chord[1], chord[0], chord[2] * 0.5, chord[1], chord[0], chord[1], chord[2] * 0.5];
      const bassFreq = arpBass[stepInBar];

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(bassFreq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, t);
      filter.Q.setValueAtTime(1.5, t);

      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.15, t + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.24);

      // Warm cinematic cello/string swell on step 0
      if (stepInBar === 0) {
        const padOsc = this.ctx.createOscillator();
        const padFilter = this.ctx.createBiquadFilter();
        const padEnv = this.ctx.createGain();

        padOsc.type = 'triangle';
        padOsc.frequency.setValueAtTime(chord[2], t);

        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(360, t);

        padEnv.gain.setValueAtTime(0.0, t);
        padEnv.gain.linearRampToValueAtTime(0.10, t + 0.2);
        padEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

        padOsc.connect(padFilter);
        padFilter.connect(padEnv);
        padEnv.connect(this.musicGain);

        padOsc.start(t);
        padOsc.stop(t + 1.9);
      }

    } else if (this.currentPlanet === "Ringhaven") {
      // Serene celestial concert harp & singing bowls in E Lydian
      // Bar 1: Emaj7 | Bar 2: G#m7 | Bar 3: Amaj7 | Bar 4: B6
      const chordE  = [164.81, 246.94, 329.63, 493.88]; // E3, B3, E4, B4
      const chordGm = [207.65, 261.63, 329.63, 415.30]; // G#3, C4, E4, G#4
      const chordA  = [174.61, 220.00, 277.18, 369.99]; // F3, A3, C#4, F#4
      const chordB  = [196.00, 246.94, 293.66, 392.00]; // G3, B3, D4, G4

      const chords = [chordE, chordGm, chordA, chordB];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Resonant singing glass bowl on downbeat (Warm acoustic beating at 246Hz, ZERO beeps)
      if (stepInBar === 0) {
        [0, 0.8].forEach(detuneHz => {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const env = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(chord[1] + detuneHz, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(380, t);

          env.gain.setValueAtTime(0.0, t);
          env.gain.linearRampToValueAtTime(0.08, t + 0.4);
          env.gain.exponentialRampToValueAtTime(0.001, t + 2.4);

          osc.connect(filter);
          filter.connect(env);
          env.connect(this.musicGain);

          osc.start(t);
          osc.stop(t + 2.5);
        });
      }

      // Warm concert harp plucks across 8th notes (164Hz - 493Hz, ZERO beeps)
      const noteIdx = (stepInBar % 4);
      const freq = chord[noteIdx];

      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.16, t + 0.016);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.40);

      osc.connect(env);
      env.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.42);

    } else if (this.currentPlanet === "Frostveil") {
      // Warm acoustic wooden kalimba & cello (Minecraft C418 style)
      // Bar 1: F#m7 | Bar 2: Dmaj7 | Bar 3: Bm7 | Bar 4: C#m7
      const chordFsm = [185.00, 277.18, 329.63, 440.00]; // F#3, C#4, E4, A4
      const chordD   = [146.83, 220.00, 293.66, 369.99]; // D3, A3, D4, F#4
      const chordBm  = [123.47, 185.00, 246.94, 329.63]; // B2, F#3, B3, E4
      const chordCsm = [138.59, 207.65, 277.18, 329.63]; // C#3, G#3, C#4, E4

      const chords = [chordFsm, chordD, chordBm, chordCsm];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Warm acoustic wooden kalimba plucks on steps 0, 2, 4, 6 (146Hz - 440Hz, ZERO high beeps)
      if (stepInBar % 2 === 0) {
        const noteIdx = (stepInBar / 2) % 4;
        const freq = chord[noteIdx];

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(520, t);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.14, t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.44);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.46);
      }

      // Warm cello drone fundamental on downbeat (F#2, D2, B1, C#2)
      if (stepInBar === 0) {
        const celloOsc = this.ctx.createOscillator();
        const celloFilter = this.ctx.createBiquadFilter();
        const celloEnv = this.ctx.createGain();

        celloOsc.type = 'triangle';
        celloOsc.frequency.setValueAtTime(chord[0] * 0.5, t); // Deep warm cello

        celloFilter.type = 'lowpass';
        celloFilter.frequency.setValueAtTime(180, t);

        celloEnv.gain.setValueAtTime(0.0, t);
        celloEnv.gain.linearRampToValueAtTime(0.10, t + 0.15);
        celloEnv.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

        celloOsc.connect(celloFilter);
        celloFilter.connect(celloEnv);
        celloEnv.connect(this.musicGain);

        celloOsc.start(t);
        celloOsc.stop(t + 1.9);
      }

    } else if (this.currentPlanet === "Thalassa") {
      // Abyssal ambient ocean: Warm Rhodes electric piano & deep sub-swell
      // Bar 1: Abmaj7 | Bar 2: Fm7 | Bar 3: Dbmaj7 | Bar 4: Eb7
      const chordAb = [103.83, 207.65, 261.63, 311.13]; // Ab2, Ab3, C4, Eb4
      const chordFm = [87.31, 174.61, 261.63, 349.23];  // F2, F3, C4, F4
      const chordDb = [69.30, 138.59, 207.65, 277.18];  // Db2, Db3, Ab3, Db4
      const chordEb = [77.78, 155.56, 233.08, 311.13];  // Eb2, Eb3, Bb3, Eb4

      const chords = [chordAb, chordFm, chordDb, chordEb];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Deep oceanic tidal swell on step 0 and 4 (Warm 51Hz - 77Hz, ZERO beeps)
      if (stepInBar === 0 || stepInBar === 4) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(chord[0] * 0.5, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, t);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.18, t + 0.12);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.70);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.75);
      }

      // Warm Rhodes electric piano arpeggios across 8th notes (103Hz - 349Hz, ZERO beeps)
      const noteIdx = (stepInBar % 4);
      const freq = chord[noteIdx];

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const env = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, t);

      env.gain.setValueAtTime(0.0, t);
      env.gain.linearRampToValueAtTime(0.14, t + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(filter);
      filter.connect(env);
      env.connect(this.musicGain);

      osc.start(t);
      osc.stop(t + 0.48);

    } else if (this.currentPlanet === "Nocturna") {
      // Cosmic warm ambient minimalism (Brian Eno Apollo style)
      // Bar 1: C#m9 | Bar 2: Badd9 | Bar 3: Amaj7 | Bar 4: F#m7
      const chordCsm = [69.30, 138.59, 207.65, 277.18]; // C#2, C#3, G#3, C#4
      const chordBm  = [61.74, 123.47, 185.00, 246.94]; // B1, B2, F#3, B3
      const chordA   = [55.00, 110.00, 164.81, 220.00]; // A1, A2, E3, A3
      const chordFsm = [46.25, 92.50, 146.83, 174.61];  // F#1, F#2, D3, F3

      const chords = [chordCsm, chordBm, chordA, chordFsm];
      const barIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[barIndex];
      const stepInBar = this.stepIndex % 8;

      // Deep warm cosmic drone on downbeat (55Hz - 69Hz, ZERO beeps)
      if (stepInBar === 0) {
        for (let i = 0; i < 2; i++) {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const env = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(chord[0] * (i === 1 ? 1.003 : 1.0), t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(140, t);

          env.gain.setValueAtTime(0.0, t);
          env.gain.linearRampToValueAtTime(0.12, t + 0.4);
          env.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

          osc.connect(filter);
          filter.connect(env);
          env.connect(this.musicGain);

          osc.start(t);
          osc.stop(t + 2.9);
        }
      }

      // Warm floating space chords on steps 0, 3, 5 (110Hz - 277Hz, ZERO beeps)
      if (stepInBar === 0 || stepInBar === 3 || stepInBar === 5) {
        const noteIdx = stepInBar === 0 ? 1 : (stepInBar === 3 ? 2 : 3);
        const freq = chord[noteIdx];

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, t);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.11, t + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.90);
      }

    } else {
      // Solaria Fallback: Atmospheric Moebius Cosmic Synth Pad
      const chordD  = [146.83, 220.00, 293.66, 369.99]; // D3, A3, D4, F#4
      const chordBm = [123.47, 185.00, 246.94, 293.66]; // B2, F#3, B3, D4
      const chordG  = [98.00, 196.00, 246.94, 293.66];  // G2, G3, B3, D4
      const chordA  = [110.00, 220.00, 277.18, 329.63]; // A2, A3, C#4, E4

      const chords = [chordD, chordBm, chordG, chordA];
      const chordIndex = Math.floor(this.stepIndex / 8);
      const chord = chords[chordIndex];

      if (this.stepIndex % 8 === 0) {
        for (let i = 0; i < 2; i++) {
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const env = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(chord[i * 2], t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, t);

          env.gain.setValueAtTime(0.0, t);
          env.gain.linearRampToValueAtTime(0.08, t + 0.3);
          env.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

          osc.connect(filter);
          filter.connect(env);
          env.connect(this.musicGain);

          osc.start(t);
          osc.stop(t + 2.1);
        }
      }

      if (this.stepIndex % 4 === 2) {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(chord[2], t);

        env.gain.setValueAtTime(0.0, t);
        env.gain.linearRampToValueAtTime(0.09, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(env);
        env.connect(this.musicGain);
        osc.start(t);
        osc.stop(t + 0.55);
      }
    }
  }

  // ---------------------------------------------------------------
  // 6. TRUE CELESTIAL AUDIO SUITE (Glissando Chimes & Astral Novas)
  // ---------------------------------------------------------------
  playCelestialGlissando() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Resonant Crystalline Glass Harmonica / Astral Glissando
    const freqs = [2093.0, 1760.0, 1396.9, 1046.5]; // C7, A6, F6, C6
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], t + i * 0.05);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.85, t + i * 0.05 + 0.35);

      gain.gain.setValueAtTime(0.0, t + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.08, t + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.05 + 0.38);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.40);
    }
  }

  playMeteorWarningSound() {
    this.playCelestialGlissando();
  }

  playCelestialNovaChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Resonant Deep Astral Gong / Bell
    const bellPitches = [261.63, 523.25, 783.99, 1318.5]; // C4, C5, G5, E6
    for (const pitch of bellPitches) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, t);

      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.95);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(t);
      osc.stop(t + 1.0);
    }

    // 2. Soft Celestial Impact Nova Shimmer
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110.0, t);
    osc.frequency.exponentialRampToValueAtTime(36.0, t + 0.45);

    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.50);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain || this.masterGain);
    osc.start(t);
    osc.stop(t + 0.52);
  }

  playImpactBlastSound() {
    this.playCelestialNovaChime();
  }

  playNearMissChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Fast whoosh sweep
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(600, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(3200, t + 0.18);
    noiseFilter.Q.setValueAtTime(2.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.16, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.20);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain || this.masterGain);
    noise.start(t);

    // High sparkling dual-tone (C6 + E6)
    [1046.5, 1318.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.04);
      osc.frequency.linearRampToValueAtTime(freq * 1.05, t + 0.35);

      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(t + 0.04);
      osc.stop(t + 0.44);
    });
  }

  playShardPickupSound(combo = 1) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const safeCombo = Math.max(1, Math.min(5, combo));
    const baseFreq = 659.25; // E5
    const pitch = baseFreq * Math.pow(1.12, safeCombo - 1);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(pitch, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(pitch * 2.0, t); // Octave overtone shimmer

    gain.gain.setValueAtTime(0.20, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.36);
    osc2.stop(t + 0.36);
  }

  playHeartLostSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Metallic harsh impact crunch
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110.0, t);
    osc1.frequency.exponentialRampToValueAtTime(45.0, t + 0.32);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(117.5, t); // Dissonant beating
    osc2.frequency.exponentialRampToValueAtTime(42.0, t + 0.32);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.38);
    osc2.stop(t + 0.38);
  }

  playHeartRestoredSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.30);
    });
  }

  playBoulderRumbleSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55.0, t);
    osc.frequency.linearRampToValueAtTime(48.0, t + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(95.0, t);
    filter.Q.setValueAtTime(3.0, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(t);
    osc.stop(t + 0.40);
  }

  playCleanCrossChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    [880.0, 1174.66].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.16, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.24);
    });
  }

  playComboEscalationSound(multiplier = 2) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Fanfare chord based on multiplier
    const chordMap = {
      2: [523.25, 659.25, 783.99],       // C Major
      3: [587.33, 739.99, 880.00],       // D Major
      4: [659.25, 830.61, 987.77],       // E Major
      5: [783.99, 987.77, 1174.66, 1567.98] // G Major Super
    };
    const notes = chordMap[multiplier] || chordMap[2];
    notes.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  playGameOverSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [440.0, 392.0, 349.23, 293.66]; // A4 -> G4 -> F4 -> D4
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.16;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, noteTime);

      gain.gain.setValueAtTime(0.16, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.40);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.42);
    });
  }

  playNitroSound() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Supercharged high-frequency turbo hiss
    const bufferSize = this.ctx.sampleRate * 0.4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2400, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  playStationaryLockonAlert() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Rapid double-pulse warning beeps (880Hz -> 1760Hz)
    [0.0, 0.12].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880.0, t + delay);
      osc.frequency.exponentialRampToValueAtTime(1760.0, t + delay + 0.08);

      gain.gain.setValueAtTime(0.0, t + delay);
      gain.gain.linearRampToValueAtTime(0.22, t + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.10);
    });
  }

  playCountdownTick(isFinal = false) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    if (!isFinal) {
      // Crisp 587Hz tick blip
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(t);
      osc.stop(t + 0.20);
    } else {
      // Energetic double launch chime (880Hz and 1318.5Hz)
      [880.0, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.32, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.50);
      });
    }
  }

  playTornadoRoar(intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;
    if (this._lastTornadoRoar && (this.ctx.currentTime - this._lastTornadoRoar < 0.2)) return;
    this._lastTornadoRoar = this.ctx.currentTime;

    const t = this.ctx.currentTime;
    const dur = 0.35;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(140 + intensity * 260, t);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    const targetGain = Math.min(0.35, 0.10 + intensity * 0.25);
    gain.gain.setValueAtTime(targetGain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    noise.start(t);
  }

  playTornadoSuckIn() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // 1. Violent ascending swirl whistle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 1.0);

    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);
    osc.start(t);
    osc.stop(t + 1.6);

    // 2. High-speed rushing vortex noise
    const dur = 1.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(1800, t + 1.2);
    noiseFilter.Q.setValueAtTime(2.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain || this.masterGain);
    noise.start(t);
  }

  playTrafficHorn() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Dual-tone classic automotive horn (370Hz F#4 + 440Hz A4)
    [370.0, 440.0].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.03);
      gain.gain.setValueAtTime(0.14, t + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  playLaneClearedChime() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const notes = [783.99, 987.77, 1174.66]; // G5, B5, D6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.30);
    });
  }

  // ---------------------------------------------------------------
  // 7. TOGGLE MUTE & VOLUME CONTROLS
  // ---------------------------------------------------------------
  setMasterVolume(val) {
    const num = parseFloat(val);
    this.masterVolume = Number.isFinite(num) ? Math.max(0.0, Math.min(1.0, num)) : 0.85;
    safeSetAudioSetting('oth_master_volume', this.masterVolume);
    if (this.masterGain && this.ctx && !this.isMuted) {
      try {
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  setMusicVolume(val) {
    const num = parseFloat(val);
    this.musicVolume = Number.isFinite(num) ? Math.max(0.0, Math.min(1.0, num)) : 0.75;
    safeSetAudioSetting('oth_music_volume', this.musicVolume);
    if (this.musicGain && this.ctx) {
      try {
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  setSfxVolume(val) {
    const num = parseFloat(val);
    this.sfxVolume = Number.isFinite(num) ? Math.max(0.0, Math.min(1.0, num)) : 0.70;
    safeSetAudioSetting('oth_sfx_volume', this.sfxVolume);
    if (this.sfxGain && this.ctx) {
      try {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      } catch (e) {}
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    safeSetAudioSetting('oth_audio_muted', this.isMuted ? 1 : 0);
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0 : this.masterVolume, this.ctx.currentTime);
      } catch (e) {}
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  playCalibrationBlip(type = 'sfx') {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = type === 'music' ? 659.25 : (type === 'master' ? 523.25 : 880.0);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }
}
