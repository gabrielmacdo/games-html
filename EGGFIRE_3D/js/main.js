import * as THREE from 'three';
import {
  CONFIG,
  loadRecords,
  saveRecords,
  loadUserSettings,
  saveUserSettings
} from './config.js';
import { PLAYER_SPAWN_CELL, cellToWorld, validateArenaTopology } from './mapData.js';
import { Arena } from './arena.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { EnemyManager } from './enemy.js';
import { SoundManager } from './audio.js';
import { Radar } from './radar.js';

/**
 * EGGFIRE - Fase 5 Final:
 * - Máquina de Estados Global: 'START' | 'PLAYING' | 'WAVE_CLEAR' | 'GAME_OVER' (e pausa via Menu ⚙️)
 * - Sistema de Hordas Progressivas com getWaveScaling(wave) e reabastecimento de Power-Ups
 * - Persistência de Recordes (HIGH SCORE e MAX WAVE) e Configurações no localStorage
 * - Controles Mobile Dual-Touch em Paisagem (Joystick Analógico + Mira Touch + Botão 🔥)
 */
class EggfireApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.radarCanvas = document.getElementById('radar-canvas');

    // Estado global do jogo
    this.gameState = 'START'; // 'START' | 'PLAYING' | 'WAVE_CLEAR' | 'GAME_OVER'
    this.isSettingsOpen = false;
    this.waveClearTimer = 0;

    // Carrega recordes e preferências salvas
    this.records = loadRecords();
    this.userSettings = loadUserSettings();

    this._cacheDOMElements();

    // 1. Valida a topologia da arena 19x19 na inicialização (Zero becos sem saída)
    validateArenaTopology();

    // 2. Cena, Neblina Atmosférica e Câmera FPS
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.COLORS.SKY);
    this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.FOG, 0.018);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.FOV,
      window.innerWidth / window.innerHeight,
      0.08,
      140
    );
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Iluminação e Construção Procedural da Arena 19x19 via InstancedMesh
    this._setupLights();
    this.arena = new Arena(this.scene);
    this.arenaInfo = this.arena.getArenaInfo();

    // 4. Áudio, Jogador, Armas/Power-Ups, Ovos Inimigos e Radar 2D
    this.audio = new SoundManager();
    this.player = new Player(this.camera, this.canvas, this.arenaInfo);

    const spawnPos = cellToWorld(PLAYER_SPAWN_CELL.row, PLAYER_SPAWN_CELL.col);
    this.player.setSpawn(spawnPos.x, spawnPos.z, 0);

    // Aplica configurações persistidas (sensibilidade, som e skin da arma/luva)
    this._applySettingsToRuntime();

    this.weapons = new WeaponSystem(this.scene, this.camera, this.player, this.audio);
    this.enemyManager = new EnemyManager(
      this.scene,
      this.arenaInfo,
      this.arena.instancedWalls,
      this.player,
      this.audio
    );
    this.enemyManager.spawnWave(1);

    this.radar = new Radar(this.radarCanvas, this.arenaInfo);

    this._bindGameCallbacks();
    this._bindUIEvents();
    this._bindMobileDualTouch();
    this._updateRecordsUI();

    this.clock = new THREE.Clock();
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  _cacheDOMElements() {
    // Contadores e barras do HUD
    this.waveValueEl = document.getElementById('wave-value');
    this.scoreValueEl = document.getElementById('score-value');
    this.enemiesValueEl = document.getElementById('enemies-value');
    this.hudHighscoreEl = document.getElementById('hud-highscore');

    this.hpValueEl = document.getElementById('hp-value');
    this.hpFillEl = document.getElementById('hp-fill');
    this.shieldBarContainer = document.getElementById('shield-bar-container');
    this.shieldTimerText = document.getElementById('shield-timer-text');
    this.shieldFillEl = document.getElementById('shield-fill');
    this.shieldScreenFx = document.getElementById('shield-screen-fx');
    this.damageScreenFx = document.getElementById('damage-screen-fx');
    this.damageFlashTimeout = null;

    this.weaponCardEl = document.querySelector('.weapon-card');
    this.weaponNameEl = document.getElementById('weapon-name');
    this.weaponSubEl = document.getElementById('weapon-sub');
    this.rifleBarContainer = document.getElementById('rifle-bar-container');
    this.rifleTimerText = document.getElementById('rifle-timer-text');
    this.rifleFillEl = document.getElementById('rifle-fill');
    this.crosshairEl = document.getElementById('crosshair');
    this.pickupToastEl = document.getElementById('pickup-toast');
    this.toastTimeout = null;

    // Banner de Horda Concluída
    this.waveBannerEl = document.getElementById('wave-banner');
    this.waveBannerTitleEl = document.getElementById('wave-banner-title');
    this.waveBannerSubEl = document.getElementById('wave-banner-sub');

    // Botões Superiores
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnAudio = document.getElementById('btn-audio');
    this.btnSettings = document.getElementById('btn-settings');

    // Modais: Start, Settings e Game Over
    this.startScreenEl = document.getElementById('start-screen');
    this.startTitleEl = document.getElementById('start-title');
    this.startSubtitleEl = document.getElementById('start-subtitle');
    this.startHighscoreEl = document.getElementById('start-highscore');
    this.startMaxwaveEl = document.getElementById('start-maxwave');
    this.btnStart = document.getElementById('btn-start');

    this.settingsModalEl = document.getElementById('settings-modal');
    this.sliderSensitivity = document.getElementById('slider-sensitivity');
    this.sensitivityLabel = document.getElementById('sensitivity-label');
    this.btnSettingsAudio = document.getElementById('btn-settings-audio');
    this.skinSelectorEl = document.getElementById('skin-selector');
    this.btnCloseSettings = document.getElementById('btn-close-settings');

    this.gameoverScreenEl = document.getElementById('gameover-screen');
    this.goScoreEl = document.getElementById('go-score');
    this.goWaveEl = document.getElementById('go-wave');
    this.goHighscoreEl = document.getElementById('go-highscore');
    this.goMaxwaveEl = document.getElementById('go-maxwave');
    this.btnRestart = document.getElementById('btn-restart');

    // Controles Mobile Dual-Touch
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.touchLookZone = document.getElementById('touch-look-zone');
    this.btnTouchFire = document.getElementById('btn-touch-fire');
  }

  _setupLights() {
    const ambientLight = new THREE.AmbientLight(CONFIG.COLORS.AMBIENT_LIGHT, 0.7);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdbe9ff, 0x222838, 0.5);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(CONFIG.COLORS.DIR_LIGHT, 1.35);
    dirLight.position.set(22, 36, 18);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 95;
    const d = 34;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);
  }

  _bindGameCallbacks() {
    // Disparo Hitscan do jogador contra paredes, piso e ovos inimigos
    this.player.onShootCallback = (weaponType) => {
      if (this.gameState !== 'PLAYING' && this.gameState !== 'WAVE_CLEAR') return;
      this.weapons.handlePlayerShoot(
        this.arena.getShootableMeshes(),
        weaponType,
        this.enemyManager
      );
    };

    // Quando o usuário pressiona ESC no desktop e perde o Pointer Lock durante a partida
    this.player.onPointerLockLost = () => {
      if (
        (this.gameState === 'PLAYING' || this.gameState === 'WAVE_CLEAR') &&
        !this.isSettingsOpen
      ) {
        this._openSettingsModal();
      }
    };

    // Coleta de Power-Up
    this.weapons.onPowerUpCollected = (_type, label) => {
      this._showPickupToast(label);
    };

    // Impacto de projétil inimigo no jogador
    this.enemyManager.onPlayerHitCallback = (_damage, absorbedByShield) => {
      if (this.gameState !== 'PLAYING') return;

      if (absorbedByShield) {
        this._showPickupToast('🛡️ IMPACTO ABSORVIDO PELO ESCUDO CIANO!');
      } else {
        this._triggerDamageFlash();
        if (this.player.hp <= 0) {
          this._triggerGameOver();
        }
      }
    };

    // Eliminação de ovo inimigo e verificação de conclusão de Horda
    this.enemyManager.onEnemyKilledCallback = (score, remaining, currentWave) => {
      const pts = 100 * currentWave;
      this.records = saveRecords(score, currentWave);
      this._updateRecordsUI();

      if (remaining > 0) {
        this._showPickupToast(`💥 OVO FRAGMENTADO! (+${pts} PTS • RESTAM ${remaining})`);
      } else if (this.gameState === 'PLAYING') {
        this._triggerWaveClear(currentWave);
      }
    };
  }

  /**
   * Transição para o estado WAVE_CLEAR (3.0s de respiro antes da próxima Horda)
   */
  _triggerWaveClear(clearedWave) {
    this.gameState = 'WAVE_CLEAR';
    this.waveClearTimer = 3.0;
    this.audio.playWaveClear();

    const nextWave = clearedWave + 1;
    this.records = saveRecords(this.enemyManager.score, nextWave);
    this._updateRecordsUI();

    if (this.waveBannerEl && this.waveBannerTitleEl && this.waveBannerSubEl) {
      this.waveBannerTitleEl.textContent = `🏆 HORDA ${clearedWave} CONCLUÍDA!`;
      this.waveBannerSubEl.textContent = `Power-Ups Reabastecidos • Horda ${nextWave} iniciando em 3s...`;
      this.waveBannerEl.classList.remove('hidden');
    }
  }

  /**
   * Inicia a próxima Horda após os 3.0s de WAVE_CLEAR
   */
  _advanceToNextWave() {
    if (this.waveBannerEl) {
      this.waveBannerEl.classList.add('hidden');
    }
    const nextWave = this.enemyManager.currentWave + 1;
    this.weapons.replenishAllPowerUps();
    this.enemyManager.spawnWave(nextWave);
    this.gameState = 'PLAYING';

    this._showPickupToast(
      `⚠️ HORDA ${nextWave} EM COMBATE (${this.enemyManager.waveScaling.enemyCount} OVOS INIMIGOS)!`
    );
  }

  /**
   * Transição para o estado GAME_OVER quando o HP do jogador chega a 0
   */
  _triggerGameOver() {
    this.gameState = 'GAME_OVER';
    this.player.controlsEnabled = false;
    this.player.clearInputs();
    this.player.exitPointerLock();

    if (this.waveBannerEl) {
      this.waveBannerEl.classList.add('hidden');
    }

    this.audio.playGameOver();

    const finalScore = this.enemyManager.score;
    const finalWave = this.enemyManager.currentWave;
    this.records = saveRecords(finalScore, finalWave);
    this._updateRecordsUI();

    if (this.goScoreEl) this.goScoreEl.textContent = String(finalScore).padStart(4, '0');
    if (this.goWaveEl) this.goWaveEl.textContent = `HORDA ${finalWave}`;
    if (this.goHighscoreEl) {
      this.goHighscoreEl.textContent = String(this.records.highScore).padStart(4, '0');
    }
    if (this.goMaxwaveEl) {
      this.goMaxwaveEl.textContent = `HORDA ${this.records.maxWave}`;
    }

    if (this.gameoverScreenEl) {
      this.gameoverScreenEl.classList.add('visible');
    }
  }

  /**
   * Inicia ou reinicia uma partida completa na Horda 1
   */
  _startNewGame() {
    this.audio.unlock();
    this._tryMobileFullscreen();

    const spawnPos = cellToWorld(PLAYER_SPAWN_CELL.row, PLAYER_SPAWN_CELL.col);
    this.player.resetState(spawnPos.x, spawnPos.z, 0);
    this.weapons.replenishAllPowerUps();
    this.enemyManager.resetForNewGame();

    this.gameState = 'PLAYING';
    this.isSettingsOpen = false;
    this.player.controlsEnabled = true;

    if (this.startScreenEl) this.startScreenEl.classList.remove('visible');
    if (this.gameoverScreenEl) this.gameoverScreenEl.classList.remove('visible');
    if (this.settingsModalEl) this.settingsModalEl.classList.remove('visible');
    if (this.waveBannerEl) this.waveBannerEl.classList.add('hidden');

    this.player.requestPointerLock();
    this._showPickupToast('🔥 HORDA 1 INICIADA! ELIMINE OS OVOS INIMIGOS!');
  }

  _openSettingsModal() {
    if (this.gameState === 'GAME_OVER') return;
    this.isSettingsOpen = true;
    this.player.controlsEnabled = false;
    this.player.clearInputs();
    this.player.exitPointerLock();

    if (this.settingsModalEl) {
      this.settingsModalEl.classList.add('visible');
    }
  }

  _closeSettingsModal() {
    this.isSettingsOpen = false;
    if (this.settingsModalEl) {
      this.settingsModalEl.classList.remove('visible');
    }

    if (this.gameState === 'PLAYING' || this.gameState === 'WAVE_CLEAR') {
      this.player.controlsEnabled = true;
      this.player.requestPointerLock();
    }
  }

  _applySettingsToRuntime() {
    this.player.setSensitivityMultiplier(this.userSettings.sensitivityMultiplier);
    this.player.applyWeaponSkin(this.userSettings.skinId);
    this.audio.setMuted(this.userSettings.muted);

    if (this.sliderSensitivity) {
      this.sliderSensitivity.value = String(this.userSettings.sensitivityMultiplier);
    }
    if (this.sensitivityLabel) {
      this.sensitivityLabel.textContent = `${this.userSettings.sensitivityMultiplier.toFixed(1)}x`;
    }
    this._syncAudioButtonsUI();

    if (this.skinSelectorEl) {
      const buttons = this.skinSelectorEl.querySelectorAll('.skin-option');
      buttons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.skin === this.userSettings.skinId);
      });
    }
  }

  _syncAudioButtonsUI() {
    const isMuted = this.audio.muted;
    if (this.btnAudio) {
      this.btnAudio.textContent = isMuted ? '🔇' : '🔊';
    }
    if (this.btnSettingsAudio) {
      this.btnSettingsAudio.textContent = isMuted ? '🔇 MUDO' : '🔊 LIGADO';
      this.btnSettingsAudio.classList.toggle('muted', isMuted);
    }
  }

  _updateRecordsUI() {
    const hsText = String(this.records.highScore).padStart(4, '0');
    const mwText = `HORDA ${this.records.maxWave}`;

    if (this.hudHighscoreEl) this.hudHighscoreEl.textContent = hsText;
    if (this.startHighscoreEl) this.startHighscoreEl.textContent = hsText;
    if (this.startMaxwaveEl) this.startMaxwaveEl.textContent = mwText;
  }

  _bindUIEvents() {
    // Botão ENTRAR NA ARENA (Start Screen)
    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => {
        if (this.gameState === 'START') {
          this._startNewGame();
        } else {
          this._closeSettingsModal();
        }
      });
    }

    // Botão JOGAR NOVAMENTE (Game Over Screen)
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        this._startNewGame();
      });
    }

    // Botão de Tela Cheia (⛶)
    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleFullscreen();
        this.btnFullscreen.blur();
      });
    }

    // Botão de Áudio no HUD (🔊)
    if (this.btnAudio) {
      this.btnAudio.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMuteSetting();
        this.btnAudio.blur();
      });
    }

    // Botão de Configurações no HUD (⚙️)
    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSettingsOpen) {
          this._closeSettingsModal();
        } else {
          this._openSettingsModal();
        }
        this.btnSettings.blur();
      });
    }

    // Controles internos do Modal de Configurações (⚙️)
    if (this.sliderSensitivity) {
      this.sliderSensitivity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        this.userSettings.sensitivityMultiplier = val;
        this.player.setSensitivityMultiplier(val);
        if (this.sensitivityLabel) {
          this.sensitivityLabel.textContent = `${val.toFixed(1)}x`;
        }
        saveUserSettings(this.userSettings);
      });
    }

    if (this.btnSettingsAudio) {
      this.btnSettingsAudio.addEventListener('click', () => {
        this._toggleMuteSetting();
      });
    }

    if (this.skinSelectorEl) {
      this.skinSelectorEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.skin-option');
        if (!btn) return;
        const skinId = btn.dataset.skin;
        if (!skinId) return;

        this.userSettings.skinId = skinId;
        this.player.applyWeaponSkin(skinId);
        saveUserSettings(this.userSettings);
        this._applySettingsToRuntime();
      });
    }

    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => {
        this._closeSettingsModal();
      });
    }

    // Atalhos de Teclado: M (Mute) e P (Configurações / Pausa)
    window.addEventListener('keydown', (e) => {
      this.audio.unlock();
      if (e.code === 'KeyM') {
        this._toggleMuteSetting();
      } else if (e.code === 'KeyP') {
        if (this.gameState === 'PLAYING' || this.gameState === 'WAVE_CLEAR') {
          if (this.isSettingsOpen) {
            this._closeSettingsModal();
          } else {
            this._openSettingsModal();
          }
        }
      }
    });

    // Responsividade de Viewport + visualViewport listener para navegadores Mobile (Android/iOS)
    const handleViewportResize = () => {
      const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleViewportResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }
  }

  /**
   * Configura os controles Mobile Dual-Touch:
   * - Polegar Esquerdo: Joystick Analógico Virtual 360°
   * - Polegar Direito: Arrasto livre para olhar (Yaw/Pitch) + Botão dedicado de Disparo (🔥)
   */
  _bindMobileDualTouch() {
    // 1. Joystick Analógico Virtual (Esquerda)
    if (this.joystickZone && this.joystickBase && this.joystickKnob) {
      let joyTouchId = null;
      const maxRadius = 42;

      const updateJoystick = (clientX, clientY) => {
        const rect = this.joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Normaliza entre -1 e +1 (para cima no ecrã é -Y => moveForward positivo)
        const normStrafe = dx / maxRadius;
        const normForward = -dy / maxRadius;
        this.player.setTouchMovement(normForward, normStrafe);
      };

      const resetJoystick = () => {
        joyTouchId = null;
        this.joystickKnob.style.transform = 'translate(-50%, -50%)';
        this.player.setTouchMovement(0, 0);
      };

      this.joystickZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          this.audio.unlock();
          if (joyTouchId !== null) return;
          const touch = e.changedTouches[0];
          joyTouchId = touch.identifier;
          updateJoystick(touch.clientX, touch.clientY);
        },
        { passive: false }
      );

      this.joystickZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === joyTouchId) {
              updateJoystick(t.clientX, t.clientY);
              break;
            }
          }
        },
        { passive: false }
      );

      const onJoyEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            resetJoystick();
            break;
          }
        }
      };

      this.joystickZone.addEventListener('touchend', onJoyEnd);
      this.joystickZone.addEventListener('touchcancel', onJoyEnd);
    }

    // 2. Zona de Arrasto da Mira (Direita)
    if (this.touchLookZone) {
      let lookTouchId = null;
      let lastLookX = 0;
      let lastLookY = 0;

      this.touchLookZone.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          this.audio.unlock();
          if (lookTouchId !== null) return;
          const touch = e.changedTouches[0];
          lookTouchId = touch.identifier;
          lastLookX = touch.clientX;
          lastLookY = touch.clientY;
        },
        { passive: false }
      );

      this.touchLookZone.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          if (!this.player.controlsEnabled) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === lookTouchId) {
              const dx = t.clientX - lastLookX;
              const dy = t.clientY - lastLookY;
              lastLookX = t.clientX;
              lastLookY = t.clientY;
              this.player.rotateView(dx, dy, true);
              break;
            }
          }
        },
        { passive: false }
      );

      const onLookEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) {
            lookTouchId = null;
            break;
          }
        }
      };

      this.touchLookZone.addEventListener('touchend', onLookEnd);
      this.touchLookZone.addEventListener('touchcancel', onLookEnd);
    }

    // 3. Botão Dedicado de Tiro (🔥) com suporte a segurar para rajadas do Egg-Rifle
    if (this.btnTouchFire) {
      this.btnTouchFire.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.audio.unlock();
          this.btnTouchFire.classList.add('firing');
          this.player.setTouchShooting(true);
        },
        { passive: false }
      );

      const stopTouchFire = (e) => {
        e.preventDefault();
        this.btnTouchFire.classList.remove('firing');
        this.player.setTouchShooting(false);
      };

      this.btnTouchFire.addEventListener('touchend', stopTouchFire);
      this.btnTouchFire.addEventListener('touchcancel', stopTouchFire);
    }
  }

  _toggleMuteSetting() {
    const isMuted = this.audio.toggleMute();
    this.userSettings.muted = isMuted;
    saveUserSettings(this.userSettings);
    this._syncAudioButtonsUI();
  }

  _toggleFullscreen() {
    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  _tryMobileFullscreen() {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      const docEl = document.documentElement;
      if (!document.fullscreenElement && docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      }
    }
  }

  _showPickupToast(text) {
    if (!this.pickupToastEl) return;
    this.pickupToastEl.textContent = text;
    this.pickupToastEl.classList.add('visible');

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.pickupToastEl.classList.remove('visible');
    }, 2600);
  }

  _triggerDamageFlash() {
    if (!this.damageScreenFx) return;
    this.damageScreenFx.classList.add('active');
    if (this.damageFlashTimeout) clearTimeout(this.damageFlashTimeout);
    this.damageFlashTimeout = setTimeout(() => {
      this.damageScreenFx.classList.remove('active');
    }, 220);
  }

  /**
   * Verifica se o dispositivo está em retrato no mobile (pausa automaticamente a simulação)
   */
  _isPortraitBlocked() {
    if (!window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
  }

  /**
   * Sincroniza Horda, Placar, Inimigos Restantes, HP, Escudo Ciano e Arma Equipada
   */
  _updateCombatHUD() {
    const activeEnemies = this.enemyManager.getActiveEnemies();

    if (this.waveValueEl) {
      this.waveValueEl.textContent = String(this.enemyManager.currentWave).padStart(2, '0');
    }
    if (this.scoreValueEl) {
      this.scoreValueEl.textContent = String(this.enemyManager.score).padStart(4, '0');
    }
    if (this.enemiesValueEl) {
      this.enemiesValueEl.textContent = String(activeEnemies.length);
    }

    if (this.hpValueEl && this.hpFillEl) {
      const hp = Math.round(this.player.hp);
      const pct = Math.max(0, Math.min(100, (hp / this.player.maxHp) * 100));
      this.hpValueEl.textContent = `${hp} / ${this.player.maxHp}`;
      this.hpFillEl.style.width = `${pct}%`;
      this.hpFillEl.classList.toggle('low', hp <= 35);
    }

    const shieldActive = this.player.shieldTimer > 0;
    if (this.shieldBarContainer) {
      this.shieldBarContainer.classList.toggle('hidden', !shieldActive);
    }
    if (this.shieldScreenFx) {
      this.shieldScreenFx.classList.toggle('active', shieldActive);
    }
    if (shieldActive && this.shieldTimerText && this.shieldFillEl) {
      this.shieldTimerText.textContent = `${this.player.shieldTimer.toFixed(1)}s`;
      const pct = (this.player.shieldTimer / CONFIG.POWERUPS.SHIELD_DURATION) * 100;
      this.shieldFillEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }

    const isRifle = this.player.currentWeapon === 'RIFLE';
    if (this.weaponCardEl) {
      this.weaponCardEl.classList.toggle('rifle-active', isRifle);
    }
    if (this.crosshairEl) {
      this.crosshairEl.classList.toggle('rifle-mode', isRifle);
    }
    if (this.weaponNameEl && this.weaponSubEl) {
      if (isRifle) {
        this.weaponNameEl.textContent = CONFIG.RIFLE.NAME;
        this.weaponSubEl.textContent = 'Automático • 25 Dano • 0.10s';
      } else {
        this.weaponNameEl.textContent = CONFIG.PISTOL.NAME;
        this.weaponSubEl.textContent = 'Semigatilho • 35 Dano • 0.32s';
      }
    }
    if (this.rifleBarContainer) {
      this.rifleBarContainer.classList.toggle('hidden', !isRifle);
    }
    if (isRifle && this.rifleTimerText && this.rifleFillEl) {
      this.rifleTimerText.textContent = `${this.player.rifleTimer.toFixed(1)}s`;
      const pct = (this.player.rifleTimer / CONFIG.RIFLE.DURATION) * 100;
      this.rifleFillEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
  }

  _animate() {
    requestAnimationFrame(this._animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Pausa a atualização lógica se estiver no Menu ⚙️, em START, GAME_OVER ou com o celular na vertical
    const isSimulationActive =
      (this.gameState === 'PLAYING' || this.gameState === 'WAVE_CLEAR') &&
      !this.isSettingsOpen &&
      !this._isPortraitBlocked();

    if (isSimulationActive) {
      this.player.update(dt);
      this.weapons.update(dt);
      this.enemyManager.update(dt);

      if (this.gameState === 'WAVE_CLEAR') {
        this.waveClearTimer -= dt;
        if (this.waveClearTimer <= 0) {
          this._advanceToNextWave();
        }
      }
    }

    this.radar.render(
      this.player,
      this.weapons.getPowerUpsStatus(),
      this.enemyManager.getActiveEnemies()
    );
    this._updateCombatHUD();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new EggfireApp();
});
