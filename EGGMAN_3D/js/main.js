import * as THREE from 'three';
import {
  CONFIG,
  EGG_SKINS,
  isTouchDevice,
  setControlMode,
  setMobileControlMode,
  setCameraZoom,
  setAudioMuted,
  setPlayerSkin,
  loadHighScore,
  saveHighScore
} from './config.js';
import {
  PLAYER_START_CELL,
  CELL_TYPE,
  validateMazeTopology
} from './mapData.js';
import { Maze } from './maze.js';
import { Player } from './player.js';
import { EnemyManager, ENEMY_STATE } from './enemy.js';
import { SoundManager } from './audio.js';

/**
 * Máquina de estados global do jogo (Fase 5 & 5.5)
 */
const GAME_STATE = {
  START: 'START',
  PLAYING: 'PLAYING',
  STAGE_CLEAR: 'STAGE_CLEAR',
  GAME_OVER: 'GAME_OVER'
};

/**
 * Aplicação Principal — Egg-Man 3D (Fase 5.5 Completa + Mobile Fullscreen/100dvh)
 */
class GameApp {
  constructor() {
    this.container = document.getElementById('game-container');

    // Elementos do HUD
    this.scoreEl = document.getElementById('score-val');
    this.highScoreEl = document.getElementById('highscore-val');
    this.stageEl = document.getElementById('stage-val');
    this.remainingEl = document.getElementById('remaining-val');
    this.livesContainerEl = document.getElementById('lives-container');
    this.powerBadgeEl = document.getElementById('power-badge');
    this.powerTimerEl = document.getElementById('power-timer-val');
    this.powerBarFillEl = document.getElementById('power-bar-fill');
    this.readyToastEl = document.getElementById('ready-toast');

    // Sobreposição de bloqueio em modo Retrato no Mobile e D-Pad Virtual
    this.rotateOverlayEl = document.getElementById('rotate-device-overlay');
    this.virtualDpadEl = document.getElementById('virtual-dpad');

    // Telas de Sobreposição (Start, Stage Clear, Game Over e Modal de Configurações)
    this.startOverlayEl = document.getElementById('start-overlay');
    this.startBtn = document.getElementById('start-game-btn');

    this.stageClearBannerEl = document.getElementById('stage-clear-banner');
    this.stageClearSubtitleEl = document.getElementById('stage-clear-subtitle');
    this.nextStageBtn = document.getElementById('next-stage-btn');

    this.gameOverOverlayEl = document.getElementById('gameover-overlay');
    this.finalScoreEl = document.getElementById('final-score-val');
    this.finalHighScoreEl = document.getElementById('final-highscore-val');
    this.restartGameBtn = document.getElementById('restart-game-btn');

    // Botões de Tela Cheia (⛶), Engrenagem (⚙️) e Modal de Configurações
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModalEl = document.getElementById('settings-modal');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    this.modalControlBtn = document.getElementById('modal-control-btn');
    this.modalMobileControlBtn = document.getElementById('modal-mobile-control-btn');
    this.modalAudioBtn = document.getElementById('modal-audio-btn');
    this.zoomRangeInput = document.getElementById('camera-zoom-range');
    this.zoomValueLabel = document.getElementById('camera-zoom-val');
    this.skinGridEl = document.getElementById('skin-selector-grid');

    // Valida na inicialização que o labirinto não possui nenhum beco sem saída
    validateMazeTopology();

    // Estado global da partida
    this.gameState = GAME_STATE.START;
    this.isSettingsOpen = false;
    this.isPortraitBlocked = false;
    this.score = 0;
    this.highScore = loadHighScore();
    this.lives = CONFIG.INITIAL_LIVES;
    this.stage = 1;
    this.powerTimer = 0;
    this.frightenedComboCount = 0;
    this.hitFreezeTimer = 0;
    this.readyTimer = 0;

    // Controle de gesto Pinch-to-Zoom com dois dedos
    this.pinchStartDistance = null;
    this.pinchStartZoom = CONFIG.CAMERA_ZOOM;

    this.sound = new SoundManager();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.COLORS.SKY_BG);

    this.clock = new THREE.Clock();

    this._initRenderer();
    this._initCamera();
    this._initLights();

    // Constrói o labirinto 3D procedural e seus coletáveis
    this.maze = new Maze(this.scene);

    // Instancia o protagonista Egg-Man
    this.player = new Player(this.scene, PLAYER_START_CELL);

    // Instancia os 4 Ovos Inimigos
    this.enemyManager = new EnemyManager(this.scene);

    // Inicializa eventos de UI, modais, zoom (wheel/pinch/slider), D-Pad e bloqueio retrato
    this._initUIControls();
    this._initZoomListeners();
    this._initOrientationMonitor();
    this._updateDpadVisibility();

    // Posiciona a câmera inicialmente e atualiza HUD
    this._updateCamera(true);
    this._renderLivesHUD();
    this._updateHUD();

    // Monitora redimensionamento tanto da janela quanto do visualViewport (retração/expansão da barra mobile)
    const handleViewportChange = () => {
      this._onWindowResize();
      this._checkPortraitOrientationBlock();
    };

    window.addEventListener('resize', handleViewportChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    this._animate();
  }

  /**
   * Retorna as dimensões reais da área visível atual (descontando barras dinâmicas do navegador mobile).
   */
  _getViewportDimensions() {
    if (this.container && this.container.clientWidth > 0 && this.container.clientHeight > 0) {
      return {
        width: this.container.clientWidth,
        height: this.container.clientHeight
      };
    }
    if (window.visualViewport) {
      return {
        width: Math.round(window.visualViewport.width),
        height: Math.round(window.visualViewport.height)
      };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  /**
   * Solicita entrada em Tela Cheia (Fullscreen API) com fallback seguro para Safari iOS
   * e recolhe a barra de endereços superior via window.scrollTo(0, 1).
   */
  _tryEnterMobileFullscreen() {
    try {
      window.scrollTo(0, 1);
    } catch (_) {}

    if (!isTouchDevice()) return;

    const docEl = document.documentElement;
    const isFull =
      document.fullscreenElement || document.webkitFullscreenElement;
    if (isFull) return;

    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      try {
        docEl.webkitRequestFullscreen();
      } catch (_) {}
    }
  }

  /**
   * Alterna manualmente o modo Tela Cheia ao clicar no botão ⛶ no topo direito.
   */
  _toggleFullscreenManual() {
    try {
      window.scrollTo(0, 1);
    } catch (_) {}

    const docEl = document.documentElement;
    const isFull =
      document.fullscreenElement || document.webkitFullscreenElement;

    if (!isFull) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        try {
          docEl.webkitRequestFullscreen();
        } catch (_) {}
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        try {
          document.webkitExitFullscreen();
        } catch (_) {}
      }
    }
  }

  _initUIControls() {
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => {
        this.startBtn.blur();
        this._tryEnterMobileFullscreen();
        this._startNewGame();
      });
    }

    if (this.nextStageBtn) {
      this.nextStageBtn.addEventListener('click', () => {
        this.nextStageBtn.blur();
        this._tryEnterMobileFullscreen();
        this._advanceToNextStage();
      });
    }

    if (this.restartGameBtn) {
      this.restartGameBtn.addEventListener('click', () => {
        this.restartGameBtn.blur();
        this._tryEnterMobileFullscreen();
        this._startNewGame();
      });
    }

    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => {
        this.fullscreenBtn.blur();
        this._toggleFullscreenManual();
      });
    }

    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => {
        this.settingsBtn.blur();
        this._toggleSettingsModal();
      });
    }

    if (this.closeSettingsBtn) {
      this.closeSettingsBtn.addEventListener('click', () => {
        this.closeSettingsBtn.blur();
        this._toggleSettingsModal(false);
      });
    }

    if (this.settingsModalEl) {
      this.settingsModalEl.addEventListener('click', (e) => {
        if (e.target === this.settingsModalEl) {
          this._toggleSettingsModal(false);
        }
      });
    }

    // 1. Alternar Modo de Controle Desktop (HOLD vs CONTINUOUS)
    if (this.modalControlBtn) {
      this._renderModalControlButton();
      this.modalControlBtn.addEventListener('click', () => {
        setControlMode();
        this.player.onControlModeChanged();
        this._renderModalControlButton();
        this.modalControlBtn.blur();
      });
    }

    // 2. Alternar Modo de Controle Mobile (DPAD vs SWIPE)
    if (this.modalMobileControlBtn) {
      this._renderModalMobileControlButton();
      this.modalMobileControlBtn.addEventListener('click', () => {
        setMobileControlMode();
        this.player.onControlModeChanged();
        this._renderModalMobileControlButton();
        this._updateDpadVisibility();
        this.modalMobileControlBtn.blur();
      });
    }

    // 3. Alternar Áudio
    if (this.modalAudioBtn) {
      this._renderModalAudioButton();
      this.modalAudioBtn.addEventListener('click', () => {
        setAudioMuted();
        this._renderModalAudioButton();
        this.modalAudioBtn.blur();
      });
    }

    // 4. Controle Deslizante de Zoom da Câmera (1.0x a 1.8x)
    if (this.zoomRangeInput) {
      this._syncZoomUI();
      this.zoomRangeInput.addEventListener('input', (e) => {
        setCameraZoom(parseFloat(e.target.value));
        this._syncZoomUI();
      });
    }

    // 5. Renderiza cards de seleção de Casca do Egg-Man
    this._buildSkinSelector();

    // Atalhos de teclado
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        this._toggleSettingsModal();
        return;
      }

      if (this.isSettingsOpen || this.isPortraitBlocked) return;

      if (e.code === 'Enter' || e.code === 'Space') {
        if (this.gameState === GAME_STATE.START) {
          e.preventDefault();
          this._startNewGame();
        } else if (this.gameState === GAME_STATE.STAGE_CLEAR) {
          e.preventDefault();
          this._advanceToNextStage();
        } else if (this.gameState === GAME_STATE.GAME_OVER) {
          e.preventDefault();
          this._startNewGame();
        }
      }
    });
  }

  /**
   * Inicializa o ajuste de Zoom da Câmera via Roda do Mouse (wheel) e Pinça com 2 dedos (pinch-to-zoom).
   */
  _initZoomListeners() {
    window.addEventListener(
      'wheel',
      (e) => {
        if (this.isSettingsOpen || this.isPortraitBlocked) return;
        const delta = Math.sign(e.deltaY) * 0.06;
        if (delta !== 0) {
          setCameraZoom(CONFIG.CAMERA_ZOOM + delta);
          this._syncZoomUI();
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches && e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          this.pinchStartDistance = Math.hypot(dx, dy);
          this.pinchStartZoom = CONFIG.CAMERA_ZOOM;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (
          this.pinchStartDistance &&
          e.touches &&
          e.touches.length === 2 &&
          !this.isPortraitBlocked
        ) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDist = Math.hypot(dx, dy);

          if (currentDist > 10) {
            const ratio = this.pinchStartDistance / currentDist;
            setCameraZoom(this.pinchStartZoom * ratio);
            this._syncZoomUI();
          }
        }
      },
      { passive: true }
    );

    const endPinch = (e) => {
      if (!e.touches || e.touches.length < 2) {
        this.pinchStartDistance = null;
      }
    };
    window.addEventListener('touchend', endPinch, { passive: true });
    window.addEventListener('touchcancel', endPinch, { passive: true });
  }

  /**
   * Monitora se o dispositivo é touch e está em modo retrato (portrait) para pausar o jogo automaticamente.
   */
  _initOrientationMonitor() {
    this._checkPortraitOrientationBlock();
    if (window.matchMedia) {
      const mql = window.matchMedia('(pointer: coarse) and (orientation: portrait)');
      if (mql.addEventListener) {
        mql.addEventListener('change', () => this._checkPortraitOrientationBlock());
      }
    }
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this._onWindowResize();
        this._checkPortraitOrientationBlock();
      }, 100);
    });
  }

  _checkPortraitOrientationBlock() {
    let blocked = false;
    if (window.matchMedia) {
      blocked = window.matchMedia(
        '(pointer: coarse) and (orientation: portrait)'
      ).matches;
    } else if (isTouchDevice()) {
      const { width, height } = this._getViewportDimensions();
      blocked = height > width;
    }
    this.isPortraitBlocked = blocked;
  }

  _updateDpadVisibility() {
    if (!this.virtualDpadEl) return;
    const shouldShow =
      CONFIG.MOBILE_CONTROL_MODE === 'DPAD' &&
      (isTouchDevice() || CONFIG.forceShowDpadOnDesktop);

    this.virtualDpadEl.classList.toggle('hidden', !shouldShow);
  }

  _syncZoomUI() {
    if (this.zoomRangeInput) {
      this.zoomRangeInput.value = String(CONFIG.CAMERA_ZOOM);
    }
    if (this.zoomValueLabel) {
      this.zoomValueLabel.textContent = `${CONFIG.CAMERA_ZOOM.toFixed(2)}x`;
    }
  }

  _buildSkinSelector() {
    if (!this.skinGridEl) return;
    this.skinGridEl.innerHTML = '';

    EGG_SKINS.forEach((skin) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'skin-card';
      if (skin.id === CONFIG.PLAYER_SKIN) {
        card.classList.add('active');
      }

      const swatch = document.createElement('span');
      swatch.className = 'skin-swatch';
      swatch.style.background = skin.previewBg;

      const label = document.createElement('span');
      label.className = 'skin-name';
      label.textContent = skin.name;

      card.appendChild(swatch);
      card.appendChild(label);

      card.addEventListener('click', () => {
        setPlayerSkin(skin.id);
        this.player.applySkin();
        this._buildSkinSelector();
        card.blur();
      });

      this.skinGridEl.appendChild(card);
    });
  }

  _toggleSettingsModal(forceState) {
    const nextState =
      typeof forceState === 'boolean' ? forceState : !this.isSettingsOpen;
    this.isSettingsOpen = nextState;

    if (this.settingsModalEl) {
      this.settingsModalEl.classList.toggle('hidden', !this.isSettingsOpen);
    }
  }

  _renderModalControlButton() {
    if (!this.modalControlBtn) return;
    const isHold = CONFIG.CONTROL_MODE === 'HOLD';
    this.modalControlBtn.textContent = isHold
      ? 'Segurar Tecla (HOLD)'
      : 'Contínuo (Arcade)';
    this.modalControlBtn.classList.toggle('mode-continuous', !isHold);
  }

  _renderModalMobileControlButton() {
    if (!this.modalMobileControlBtn) return;
    const isDpad = CONFIG.MOBILE_CONTROL_MODE === 'DPAD';
    this.modalMobileControlBtn.textContent = isDpad
      ? 'Botões D-Pad (Tela)'
      : 'Deslizar (Swipe)';
    this.modalMobileControlBtn.classList.toggle('mode-continuous', !isDpad);
  }

  _renderModalAudioButton() {
    if (!this.modalAudioBtn) return;
    const isMuted = CONFIG.AUDIO_MUTED;
    this.modalAudioBtn.textContent = isMuted ? 'Mudo' : 'Ligado';
    this.modalAudioBtn.classList.toggle('audio-muted', isMuted);
  }

  _renderLivesHUD() {
    if (!this.livesContainerEl) return;
    this.livesContainerEl.innerHTML = '';

    for (let i = 0; i < CONFIG.INITIAL_LIVES; i++) {
      const eggIcon = document.createElement('span');
      eggIcon.className = 'life-egg-icon';
      if (i >= this.lives) {
        eggIcon.classList.add('lost');
      }
      this.livesContainerEl.appendChild(eggIcon);
    }
  }

  _startNewGame() {
    this.score = 0;
    this.lives = CONFIG.INITIAL_LIVES;
    this.stage = 1;
    this.powerTimer = 0;
    this.frightenedComboCount = 0;
    this.hitFreezeTimer = 0;

    if (this.startOverlayEl) this.startOverlayEl.classList.add('hidden');
    if (this.gameOverOverlayEl) this.gameOverOverlayEl.classList.add('hidden');
    if (this.stageClearBannerEl) this.stageClearBannerEl.classList.add('hidden');

    this.maze.resetCollectibles();
    this.player.resetToCell(PLAYER_START_CELL.col, PLAYER_START_CELL.row);
    this.enemyManager.resetAll(this.stage);

    this.gameState = GAME_STATE.PLAYING;
    this._triggerReadyCountdown();
    this._renderLivesHUD();
    this._updateCamera(true);
    this._updateHUD();
  }

  _advanceToNextStage() {
    this.stage += 1;
    this.powerTimer = 0;
    this.frightenedComboCount = 0;
    this.hitFreezeTimer = 0;

    if (this.stageClearBannerEl) {
      this.stageClearBannerEl.classList.add('hidden');
    }

    this.maze.resetCollectibles();
    this.player.resetToCell(PLAYER_START_CELL.col, PLAYER_START_CELL.row);
    this.enemyManager.resetAll(this.stage);

    this.gameState = GAME_STATE.PLAYING;
    this._triggerReadyCountdown();
    this._updateCamera(true);
    this._updateHUD();
  }

  _triggerReadyCountdown() {
    this.readyTimer = CONFIG.READY_BANNER_DURATION;
    if (this.readyToastEl) {
      this.readyToastEl.textContent = `FASE ${this.stage} — PRONTO!`;
      this.readyToastEl.classList.remove('hidden');
    }
    this.sound.playReadySound();
  }

  _resolveLifeLoss() {
    this.lives = Math.max(0, this.lives - 1);
    this._renderLivesHUD();

    this.powerTimer = 0;
    this.frightenedComboCount = 0;

    if (this.lives > 0) {
      this.player.resetToCell(PLAYER_START_CELL.col, PLAYER_START_CELL.row);
      this.enemyManager.resetAll(this.stage);
      this._updateCamera(true);
      this._triggerReadyCountdown();
    } else {
      this.gameState = GAME_STATE.GAME_OVER;
      saveHighScore(this.highScore);
      this.sound.playGameOverSound();

      if (this.finalScoreEl) {
        this.finalScoreEl.textContent = String(this.score).padStart(4, '0');
      }
      if (this.finalHighScoreEl) {
        this.finalHighScoreEl.textContent = String(this.highScore).padStart(4, '0');
      }
      if (this.gameOverOverlayEl) {
        this.gameOverOverlayEl.classList.remove('hidden');
      }
    }
  }

  _initRenderer() {
    const { width, height } = this._getViewportDimensions();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  _initCamera() {
    const { width, height } = this._getViewportDimensions();
    const aspect = width / Math.max(1, height);
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      aspect,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
  }

  _initLights() {
    const ambientLight = new THREE.AmbientLight(CONFIG.COLORS.AMBIENT_LIGHT, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(CONFIG.COLORS.DIR_LIGHT, 1.35);
    dirLight.position.set(16, 28, 18);
    dirLight.castShadow = true;

    const d = 26;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 70;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;

    this.scene.add(dirLight);
  }

  _handleCollectibles() {
    const collectedType = this.maze.collectAtCell(
      this.player.gridCol,
      this.player.gridRow
    );

    if (!collectedType) return;

    if (collectedType === CELL_TYPE.DOT) {
      this._addScore(CONFIG.SCORE_DOT);
      this.sound.playDotSound();
    } else if (collectedType === CELL_TYPE.POWER_COIN) {
      this._addScore(CONFIG.SCORE_POWER_COIN);
      this.powerTimer = CONFIG.POWER_MODE_DURATION;
      this.frightenedComboCount = 0;
      this.enemyManager.triggerFrightenedMode();
      this.sound.playPowerCoinSound();
    }

    if (this.maze.remainingCollectibles === 0 && this.gameState === GAME_STATE.PLAYING) {
      this.gameState = GAME_STATE.STAGE_CLEAR;
      this.powerTimer = 0;
      this.player.setPowerVisual(false, 0);
      this.sound.playStageClearSound();

      if (this.stageClearSubtitleEl) {
        this.stageClearSubtitleEl.textContent = `Fase ${this.stage} concluída! Prepare-se para a Fase ${this.stage + 1} (+5% velocidade inimiga).`;
      }
      if (this.stageClearBannerEl) {
        this.stageClearBannerEl.classList.remove('hidden');
      }
    }
  }

  _handleEnemyCollisions() {
    const pPos = this.player.mesh.position;

    for (const enemy of this.enemyManager.enemies) {
      if (enemy.state === ENEMY_STATE.EATEN) continue;

      const ePos = enemy.mesh.position;
      const dist = Math.hypot(pPos.x - ePos.x, pPos.z - ePos.z);

      if (dist < CONFIG.ENTITY_COLLISION_DIST) {
        if (enemy.state === ENEMY_STATE.FRIGHTENED) {
          this.frightenedComboCount = Math.min(4, this.frightenedComboCount + 1);
          const comboPoints =
            CONFIG.SCORE_ENEMY_BASE * Math.pow(2, this.frightenedComboCount - 1);

          this._addScore(comboPoints);
          this.sound.playEggCrackSound();
          this.enemyManager.spawnShellBreakParticles(ePos, enemy.profile.color);
          enemy.enterEaten();
        } else {
          this.sound.playPlayerHitSound();
          this.hitFreezeTimer = 0.65;
          break;
        }
      }
    }
  }

  _addScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      saveHighScore(this.highScore);
    }
  }

  _updatePowerMode(dt) {
    if (this.powerTimer > 0) {
      this.powerTimer = Math.max(0, this.powerTimer - dt);
      this.player.setPowerVisual(this.powerTimer > 0, this.powerTimer, dt);
      if (this.powerTimer === 0) {
        this.frightenedComboCount = 0;
      }
    }
  }

  /**
   * Atualiza a câmera em terceira pessoa elevada (Angled Chase Cam)
   * aplicando o multiplicador CAMERA_ZOOM (1.0 a 1.8 — apenas afastar) sobre o offset Y e Z.
   */
  _updateCamera(immediate = false) {
    const playerPos = this.player.mesh.position;
    const zoom = CONFIG.CAMERA_ZOOM;
    const offsetY = CONFIG.CAMERA_OFFSET.y * zoom;
    const offsetZ = CONFIG.CAMERA_OFFSET.z * zoom;

    const targetPos = new THREE.Vector3(
      playerPos.x + CONFIG.CAMERA_OFFSET.x,
      playerPos.y + offsetY,
      playerPos.z + offsetZ
    );

    if (immediate) {
      this.camera.position.copy(targetPos);
    } else {
      this.camera.position.lerp(targetPos, CONFIG.CAMERA_LERP_ALPHA);
    }

    this.camera.lookAt(
      this.camera.position.x,
      0,
      this.camera.position.z - offsetZ - CONFIG.CAMERA_LOOK_AHEAD_Z
    );
  }

  _updateHUD() {
    if (this.scoreEl) {
      this.scoreEl.textContent = String(this.score).padStart(4, '0');
    }
    if (this.highScoreEl) {
      this.highScoreEl.textContent = String(this.highScore).padStart(4, '0');
    }
    if (this.stageEl) {
      this.stageEl.textContent = `STAGE ${this.stage}`;
    }
    if (this.remainingEl) {
      this.remainingEl.textContent = `ITENS: ${this.maze.remainingCollectibles} / ${this.maze.totalCollectibles}`;
    }

    if (this.powerBadgeEl && this.powerTimerEl && this.powerBarFillEl) {
      if (this.powerTimer > 0) {
        this.powerBadgeEl.classList.remove('hidden');
        this.powerTimerEl.textContent = `${this.powerTimer.toFixed(1)}s`;
        const pct = Math.min(100, (this.powerTimer / CONFIG.POWER_MODE_DURATION) * 100);
        this.powerBarFillEl.style.width = `${pct}%`;
      } else {
        this.powerBadgeEl.classList.add('hidden');
      }
    }
  }

  _onWindowResize() {
    const { width, height } = this._getViewportDimensions();
    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.maze.update(dt);

    const isPaused = this.isSettingsOpen || this.isPortraitBlocked;

    if (!isPaused && this.gameState === GAME_STATE.PLAYING) {
      if (this.hitFreezeTimer > 0) {
        this.hitFreezeTimer -= dt;
        this.enemyManager.updateParticles(dt);
        if (this.hitFreezeTimer <= 0) {
          this._resolveLifeLoss();
        }
      } else if (this.readyTimer > 0) {
        this.readyTimer -= dt;
        if (this.readyTimer <= 0 && this.readyToastEl) {
          this.readyToastEl.classList.add('hidden');
        }
      } else {
        this.player.update(dt);
        this._handleCollectibles();
        this._updatePowerMode(dt);
        this.enemyManager.update(dt, this.player, this.powerTimer);
        this._handleEnemyCollisions();
      }
    } else {
      this.enemyManager.updateParticles(dt);
    }

    this._updateCamera(false);
    this._updateHUD();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
