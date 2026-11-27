import { CONFIG } from './config.js';

/**
 * Sintetizador de efeitos sonoros retro 100% procedural via Web Audio API nativa.
 * Dispensa qualquer arquivo externo (.mp3/.wav) e respeita a política de autoplay do navegador.
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.wakaToggle = false;

    const unlockHandler = () => {
      this._ensureContext();
    };
    window.addEventListener('keydown', unlockHandler, { once: true });
    window.addEventListener('pointerdown', unlockHandler, { once: true });
  }

  _ensureContext() {
    if (CONFIG.AUDIO_MUTED) return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Som curto de coleta de bolinha alternando duas frequências estilo "waka-waka".
   */
  playDotSound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    this.wakaToggle = !this.wakaToggle;
    const startFreq = this.wakaToggle ? 330 : 415;
    const endFreq = this.wakaToggle ? 490 : 310;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.065);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.072);
  }

  /**
   * Arpejo ascendente energético ao coletar uma Moeda de Ovo (Power-Up).
   */
  playPowerCoinSound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    const stepDuration = 0.055;
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * stepDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, startTime + stepDuration);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + stepDuration * 1.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + stepDuration * 1.35);
    });
  }

  /**
   * Som crocante de casca de ovo quebrando + pop ascendente ao derrotar um inimigo em FRIGHTENED.
   */
  playEggCrackSound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.11);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.11);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.18);

    oscGain.gain.setValueAtTime(0.14, now + 0.03);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now + 0.03);
    osc.stop(now + 0.195);
  }

  /**
   * Som descendente de impacto/perda de vida quando o Egg-Man colide com um inimigo ativo.
   */
  playPlayerHitSound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(190, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.42);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  /**
   * Jingle curto de início de rodada ("PRONTO!").
   */
  playReadySound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [
      { freq: 440, delay: 0.0, duration: 0.09 },
      { freq: 587.33, delay: 0.11, duration: 0.16 }
    ];
    const now = ctx.currentTime;

    notes.forEach((n) => {
      const startTime = now + n.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, startTime);

      gain.gain.setValueAtTime(0.16, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + n.duration + 0.02);
    });
  }

  /**
   * Fanfarra curta de vitória ao limpar todos os coletáveis do labirinto.
   */
  playStageClearSound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const melody = [
      { freq: 523.25, delay: 0.0, duration: 0.11 },
      { freq: 659.25, delay: 0.12, duration: 0.11 },
      { freq: 783.99, delay: 0.24, duration: 0.12 },
      { freq: 1046.5, delay: 0.38, duration: 0.32 }
    ];

    const now = ctx.currentTime;

    melody.forEach((note) => {
      const startTime = now + note.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, startTime);

      gain.gain.setValueAtTime(0.22, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.duration + 0.02);
    });
  }

  /**
   * Melodia dramática de Game Over quando as 3 vidas acabam.
   */
  playGameOverSound() {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [
      { freq: 392.0, delay: 0.0, duration: 0.16 },
      { freq: 349.23, delay: 0.18, duration: 0.16 },
      { freq: 329.63, delay: 0.36, duration: 0.18 },
      { freq: 261.63, delay: 0.56, duration: 0.42 }
    ];

    const now = ctx.currentTime;

    notes.forEach((note) => {
      const startTime = now + note.delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.duration + 0.02);
    });
  }
}
