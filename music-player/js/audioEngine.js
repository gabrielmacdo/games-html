/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - AUDIO ENGINE ADAPTER
 * Unified Audio Controller for HTML5 <audio> and YouTube IFrame API
 * ====================================================================
 */

import { State } from './state.js';

class AudioEngineAdapter {
  constructor() {
    this.htmlAudio = new Audio();
    this.htmlAudio.preload = 'auto';
    this.htmlAudio.crossOrigin = 'anonymous';

    this.ytPlayer = null;
    this.isYouTubeReady = false;
    this.isYtReady = false;
    this.ytContainerId = 'yt-hidden-player';
    
    /** @type {{ videoId: string, autoPlay: boolean } | null} */
    this.pendingYtTrack = null;

    // Deferred promise for YouTube API & Player readiness
    this.ytReadyPromise = new Promise((resolve) => {
      this._resolveYtReady = resolve;
    });

    /** @type {'html5' | 'youtube' | null} */
    this.activeEngine = null;

    // Web Audio API for Frequency Visualizer
    this.audioCtx = null;
    this.analyser = null;
    this.audioSourceNode = null;
    this.isWebAudioConnected = false;

    // Interval ticker for YouTube time synchronization
    this.timeUpdateTicker = null;

    this.initHtmlAudioListeners();
    this.initYouTubeApi();
  }

  /**
   * Initialize HTML5 Audio Element event listeners
   * @private
   */
  initHtmlAudioListeners() {
    this.htmlAudio.addEventListener('loadedmetadata', () => {
      if (this.activeEngine === 'html5') {
        const dur = this.htmlAudio.duration || 0;
        State.setTime(this.htmlAudio.currentTime || 0, dur);
        State.setIsLoading(false);
      }
    });

    this.htmlAudio.addEventListener('timeupdate', () => {
      if (this.activeEngine === 'html5' && !this.htmlAudio.paused) {
        State.setTime(this.htmlAudio.currentTime || 0, this.htmlAudio.duration || 0);
      }
    });

    this.htmlAudio.addEventListener('play', () => {
      if (this.activeEngine === 'html5') {
        State.setIsPlaying(true);
        State.setIsLoading(false);
        this.resumeAudioContext();
      }
    });

    this.htmlAudio.addEventListener('pause', () => {
      if (this.activeEngine === 'html5') {
        State.setIsPlaying(false);
      }
    });

    this.htmlAudio.addEventListener('waiting', () => {
      if (this.activeEngine === 'html5') {
        State.setIsLoading(true);
      }
    });

    this.htmlAudio.addEventListener('canplay', () => {
      if (this.activeEngine === 'html5') {
        State.setIsLoading(false);
      }
    });

    this.htmlAudio.addEventListener('progress', () => {
      if (this.activeEngine === 'html5' && this.htmlAudio.duration > 0 && this.htmlAudio.buffered.length > 0) {
        try {
          const bufferedEnd = this.htmlAudio.buffered.end(this.htmlAudio.buffered.length - 1);
          const percent = (bufferedEnd / this.htmlAudio.duration) * 100;
          State.setBufferPercent(percent);
        } catch (_) {}
      }
    });

    this.htmlAudio.addEventListener('ended', () => {
      if (this.activeEngine === 'html5') {
        this.handleTrackEnded();
      }
    });

    this.htmlAudio.addEventListener('error', (err) => {
      if (this.activeEngine === 'html5') {
        console.warn('AudioEngine: HTML5 audio error, applying fallback synth', err);
        State.setIsLoading(false);
        this.playSyntheticFallback();
      }
    });
  }

  /**
   * Initialize YouTube IFrame API
   * @private
   */
  initYouTubeApi() {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      this.createYouTubePlayer();
      return;
    }

    // Capture previous callback if already set
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') {
        try { previousCallback(); } catch (_) {}
      }
      this.createYouTubePlayer();
    };

    // Dynamically inject script tag if not present
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }

  /**
   * Instantiate the YT.Player instance
   * @private
   */
  createYouTubePlayer() {
    if (this.ytPlayer) return;
    if (typeof window === 'undefined' || !window.YT || !window.YT.Player) return;

    try {
      this.ytPlayer = new window.YT.Player(this.ytContainerId, {
        height: '100',
        width: '100',
        playerVars: {
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            this.isYtReady = true;
            this.isYouTubeReady = true;
            if (this._resolveYtReady) {
              this._resolveYtReady(this.ytPlayer);
            }
            this.setVolume(State.volume);
            
            // If a track was queued before YouTube API was ready, play it now
            if (this.pendingYtTrack) {
              const { videoId, autoPlay } = this.pendingYtTrack;
              this.pendingYtTrack = null;
              this.loadYouTubeTrack(videoId, autoPlay);
            }
          },
          onStateChange: (event) => {
            this.handleYouTubeStateChange(event);
          },
          onError: (event) => {
            console.warn('AudioEngine: YouTube Player Error code', event.data);
            State.setIsLoading(false);
            State.emit('audioError', { message: 'Erro ao carregar vídeo do YouTube' });
          }
        }
      });
    } catch (e) {
      console.warn('AudioEngine: Error creating YouTube player instance', e);
    }
  }

  /**
   * Handle YouTube Player State changes
   * @param {Object} event
   * @private
   */
  handleYouTubeStateChange(event) {
    if (this.activeEngine !== 'youtube') return;

    const state = event.data;
    if (window.YT && state === window.YT.PlayerState.PLAYING) {
      State.setIsPlaying(true);
      State.setIsLoading(false);
      this.startTimeUpdateTicker();
    } else if (window.YT && state === window.YT.PlayerState.PAUSED) {
      State.setIsPlaying(false);
      this.stopTimeUpdateTicker();
    } else if (window.YT && state === window.YT.PlayerState.BUFFERING) {
      State.setIsLoading(true);
    } else if (window.YT && state === window.YT.PlayerState.ENDED) {
      this.stopTimeUpdateTicker();
      this.handleTrackEnded();
    }
  }

  /**
   * Start ticker for YouTube time update and buffering
   * @private
   */
  startTimeUpdateTicker() {
    this.stopTimeUpdateTicker();
    this.timeUpdateTicker = setInterval(() => {
      if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const currentTime = this.ytPlayer.getCurrentTime() || 0;
        const duration = this.ytPlayer.getDuration() || 0;
        State.setTime(currentTime, duration);

        if (typeof this.ytPlayer.getVideoLoadedFraction === 'function') {
          const fraction = this.ytPlayer.getVideoLoadedFraction() || 0;
          State.setBufferPercent(fraction * 100);
        }
      }
    }, 250);
  }

  /**
   * Stop ticker for YouTube time update
   * @private
   */
  stopTimeUpdateTicker() {
    if (this.timeUpdateTicker) {
      clearInterval(this.timeUpdateTicker);
      this.timeUpdateTicker = null;
    }
  }

  /**
   * Connect HTML5 Audio element to Web Audio API for spectrum visualizer
   * Wrapped in try/catch to ensure external audios without CORS headers continue playing seamlessly
   * @private
   */
  setupWebAudio() {
    if (this.isWebAudioConnected) return;

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;
      }

      if (!this.audioSourceNode) {
        this.audioSourceNode = this.audioCtx.createMediaElementSource(this.htmlAudio);
        this.audioSourceNode.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
      this.isWebAudioConnected = true;
    } catch (e) {
      // If CORS policy prevents MediaElementAudioSourceNode creation, audio will still play natively
      console.warn('AudioEngine: Web Audio Analyser desativado para esta faixa (sem cabeçalho CORS), áudio nativo reproduz normalmente.', e);
      this.isWebAudioConnected = false;
      this.analyser = null;
    }
  }

  /**
   * Resume AudioContext on user interaction
   */
  resumeAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Get real-time visualizer data for canvas rendering
   * @returns {Uint8Array}
   */
  getVisualizerData() {
    const defaultData = new Uint8Array(32);

    if (this.activeEngine === 'html5' && this.analyser && this.isWebAudioConnected) {
      try {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
      } catch (_) {}
    }

    // Dynamic simulated frequency data if audio is playing but analyser is not directly attached
    if (State.isPlaying) {
      const time = performance.now() * 0.005;
      for (let i = 0; i < defaultData.length; i++) {
        const val = Math.sin(time + i * 0.4) * 60 + Math.cos(time * 0.8 + i * 0.2) * 50 + 100;
        defaultData[i] = Math.min(255, Math.max(20, Math.floor(val)));
      }
    }

    return defaultData;
  }

  /**
   * Universal Load Track Method
   * Switches engine automatically based on track sourceType
   * @param {import('./mockData.js').Track} track
   * @param {boolean} [autoPlay=true]
   */
  loadTrack(track, autoPlay = true) {
    if (!track) return;

    if (track.sourceType === 'local' && (track.isDisconnected || !track.src)) {
      this.switchEngine('html5');
      this.htmlAudio.src = '';
      State.setIsLoading(false);
      State.setIsPlaying(false);
      return;
    }

    State.setIsLoading(true);

    if (track.sourceType === 'youtube') {
      this.switchEngine('youtube');
      this.loadYouTubeTrack(track.youtubeId, autoPlay);
    } else {
      this.switchEngine('html5');
      this.loadHtml5Track(track.src, autoPlay);
    }
  }

  /**
   * Switch between HTML5 and YouTube audio engines
   * @param {'html5' | 'youtube'} targetEngine
   * @private
   */
  switchEngine(targetEngine) {
    if (this.activeEngine === targetEngine) return;

    if (this.activeEngine === 'html5') {
      this.htmlAudio.pause();
      this.htmlAudio.src = '';
    } else if (this.activeEngine === 'youtube') {
      this.stopTimeUpdateTicker();
      if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
        try {
          this.ytPlayer.stopVideo();
        } catch (e) {}
      }
    }

    this.activeEngine = targetEngine;
  }

  /**
   * Load HTML5 audio track
   * @param {string} src
   * @param {boolean} autoPlay
   * @private
   */
  loadHtml5Track(src, autoPlay) {
    State.setBufferPercent(0);
    this.setupWebAudio();
    this.htmlAudio.src = src || '';
    this.htmlAudio.load();
    this.setVolume(State.volume);

    if (autoPlay) {
      const playPromise = this.htmlAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('AudioEngine: HTML5 AutoPlay policy prevented playback', err);
          State.setIsPlaying(false);
          State.setIsLoading(false);
        });
      }
    }
  }

  /**
   * Load YouTube track with async readiness chaining
   * @param {string} videoId
   * @param {boolean} autoPlay
   * @private
   */
  loadYouTubeTrack(videoId, autoPlay) {
    if (!videoId) return;

    // If YouTube Player is not ready yet, queue the track and chain execution
    if (!this.isYouTubeReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      this.pendingYtTrack = { videoId, autoPlay };
      State.setIsLoading(true);

      this.ytReadyPromise.then(() => {
        if (this.activeEngine === 'youtube' && this.pendingYtTrack && this.pendingYtTrack.videoId === videoId) {
          const shouldAutoPlay = this.pendingYtTrack.autoPlay;
          this.pendingYtTrack = null;
          this.loadYouTubeTrack(videoId, shouldAutoPlay);
        }
      });
      return;
    }

    try {
      this.setVolume(State.volume);
      if (autoPlay) {
        this.ytPlayer.loadVideoById(videoId);
      } else {
        this.ytPlayer.cueVideoById(videoId);
      }
    } catch (e) {
      console.warn('AudioEngine: Error loading YouTube video', e);
      State.setIsLoading(false);
    }
  }

  /**
   * Play active audio engine
   */
  play() {
    this.resumeAudioContext();

    if (this.activeEngine === 'html5') {
      const playPromise = this.htmlAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn('AudioEngine: Play error', e));
      }
    } else if (this.activeEngine === 'youtube') {
      if (!this.isYouTubeReady || !this.ytPlayer || typeof this.ytPlayer.playVideo !== 'function') {
        if (State.currentTrack?.youtubeId) {
          this.loadYouTubeTrack(State.currentTrack.youtubeId, true);
        }
      } else {
        try {
          this.ytPlayer.playVideo();
        } catch (e) {
          console.warn('AudioEngine: YouTube playVideo error', e);
        }
      }
    }
  }

  /**
   * Pause active audio engine
   */
  pause() {
    if (this.activeEngine === 'html5') {
      this.htmlAudio.pause();
    } else if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (e) {}
    }
  }

  /**
   * Toggle between Play and Pause
   */
  togglePlay() {
    if (State.isPlaying) {
      this.pause();
    } else {
      if (!State.currentTrack && State.queue.length > 0) {
        State.setCurrentIndex(0);
        this.loadTrack(State.currentTrack, true);
      } else if (State.currentTrack) {
        if (State.currentTrack.sourceType === 'youtube' && (this.activeEngine !== 'youtube' || !State.isPlaying)) {
          this.loadTrack(State.currentTrack, true);
        } else {
          this.play();
        }
      }
    }
  }

  /**
   * Universal seek method
   * @param {number} value - Seconds or Percentage (0 to 100)
   * @param {boolean} [isPercent=false]
   */
  seek(value, isPercent = false) {
    let targetTime = value;

    if (isPercent) {
      const duration = State.duration || (this.activeEngine === 'html5' ? this.htmlAudio.duration : (this.ytPlayer?.getDuration?.() || 0));
      targetTime = (value / 100) * duration;
    }

    if (this.activeEngine === 'html5') {
      if (!isNaN(this.htmlAudio.duration)) {
        this.htmlAudio.currentTime = targetTime;
        State.setTime(targetTime, this.htmlAudio.duration);
      }
    } else if (this.activeEngine === 'youtube' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(targetTime, true);
      State.setTime(targetTime, this.ytPlayer.getDuration() || 0);
    }
  }

  /**
   * Set volume universally (0 to 100)
   * @param {number} volume
   */
  setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, volume));
    const effectiveVol = State.isMuted ? 0 : clamped;

    this.htmlAudio.volume = effectiveVol / 100;

    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(effectiveVol);
        if (State.isMuted) {
          this.ytPlayer.mute();
        } else {
          this.ytPlayer.unMute();
        }
      } catch (e) {}
    }
  }

  /**
   * Set muted state
   * @param {boolean} isMuted
   */
  setMute(isMuted) {
    this.setVolume(State.volume);
  }

  /**
   * Handle track completion based on repeat mode
   * @private
   */
  handleTrackEnded() {
    if (State.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else {
      State.emit('trackEnded');
    }
  }

  /**
   * Synthesize audio chords if network audio stream fails
   * @private
   */
  playSyntheticFallback() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {}
  }
}

export const AudioEngine = new AudioEngineAdapter();
