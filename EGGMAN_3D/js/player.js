import * as THREE from 'three';
import { CONFIG, getActiveSkinConfig } from './config.js';
import {
  GRID_COLS,
  PLAYER_START_CELL,
  CELL_TYPE,
  gridToWorld,
  worldToGrid,
  getCellValue,
  isPlayerWalkable
} from './mapData.js';

/**
 * Classe responsável pelo modelo 3D procedural do Egg-Man,
 * customização de casca (incluindo textura procedural de Ovo de Codorna via CanvasTexture),
 * animação de caminhada isolada na malha interna, efeito visual de Superpoder,
 * movimentação determinística em Grid 2D com Input Buffering e suporte Mobile (D-Pad Virtual + Swipe).
 */
export class Player {
  constructor(scene, startCell = PLAYER_START_CELL) {
    // Grupo raiz lógico: sua posição Y permanece estritamente travada em 0
    this.mesh = new THREE.Group();

    // Referência ao material da casca e textura procedural de codorna
    this.eggMaterial = null;
    this.quailTexture = this._createProceduralQuailTexture();
    this.isPowerActive = false;

    // Malha visual interna (mesh.children[0]) que recebe a oscilação senoidal vertical
    this.visualGroup = this._createProceduralEggModel();
    this.mesh.add(this.visualGroup);

    scene.add(this.mesh);

    // Estado de animação e orientação
    this.walkCycle = 0;
    this.targetRotationY = 0;
    this.powerPulseTime = 0;

    // Direção atual de deslocamento e fila de intenção de curva (Input Buffering)
    this.currentDir = { x: 0, z: 0 };
    this.nextDir = { x: 0, z: 0 };

    // Pilha ordenada de teclas direcionais atualmente mantidas pressionadas (para o modo 'HOLD')
    this.heldKeys = [];

    // Flag que mantém o movimento contínuo ativo quando o último comando veio de um gesto Touch/Swipe
    this.touchOverrideContinuous = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isSingleTouchSwipeActive = false;

    // Estado do D-Pad Virtual na tela
    this.dpadActiveKey = null;
    this.dpadButtons = [];

    // Célula atual lógica no grid
    this.gridCol = startCell.col;
    this.gridRow = startCell.row;

    this.applySkin();
    this.resetToCell(startCell.col, startCell.row);
    this._initInputListeners();
    this._initVirtualDpadListeners();
  }

  /**
   * Gera proceduralmente via HTML5 Canvas 2D uma textura com pintinhas orgânicas de Ovo de Codorna.
   */
  _createProceduralQuailTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f5efe6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const spots = [
      { x: 34, y: 42, rx: 14, ry: 10, rot: 0.4, color: '#3e2723' },
      { x: 96, y: 28, rx: 8, ry: 6, rot: -0.3, color: '#4e342e' },
      { x: 165, y: 52, rx: 18, ry: 12, rot: 0.8, color: '#3e2723' },
      { x: 222, y: 36, rx: 11, ry: 8, rot: 0.1, color: '#5d4037' },
      { x: 58, y: 102, rx: 16, ry: 11, rot: -0.6, color: '#3e2723' },
      { x: 128, y: 94, rx: 12, ry: 9, rot: 0.3, color: '#4e342e' },
      { x: 204, y: 112, rx: 15, ry: 10, rot: -0.4, color: '#3e2723' },
      { x: 24, y: 168, rx: 12, ry: 9, rot: 0.5, color: '#4e342e' },
      { x: 88, y: 156, rx: 19, ry: 13, rot: -0.2, color: '#3e2723' },
      { x: 152, y: 174, rx: 10, ry: 7, rot: 0.9, color: '#5d4037' },
      { x: 218, y: 182, rx: 16, ry: 12, rot: -0.7, color: '#3e2723' },
      { x: 46, y: 224, rx: 14, ry: 9, rot: 0.2, color: '#3e2723' },
      { x: 118, y: 218, rx: 15, ry: 11, rot: -0.5, color: '#4e342e' },
      { x: 184, y: 232, rx: 13, ry: 8, rot: 0.6, color: '#3e2723' }
    ];

    spots.forEach((s) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, s.rx, s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.fillStyle = '#4e342e';
    for (let i = 0; i < 45; i++) {
      const px = ((i * 73) % 240) + 8;
      const py = ((i * 139) % 240) + 8;
      const r = (i % 3) + 2;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Aplica imediatamente no material 3D do Egg-Man a casca selecionada nas configurações.
   */
  applySkin() {
    if (!this.eggMaterial) return;
    const skin = getActiveSkinConfig();

    this.eggMaterial.roughness = skin.roughness;
    this.eggMaterial.metalness = skin.metalness;
    this.eggMaterial.map = skin.pattern === 'quail' ? this.quailTexture : null;

    if (!this.isPowerActive) {
      this.eggMaterial.color.setHex(skin.color);
      this.eggMaterial.emissive.setHex(skin.emissive);
      this.eggMaterial.emissiveIntensity = 1.0;
    }

    this.eggMaterial.needsUpdate = true;
  }

  /**
   * Posiciona o Egg-Man exatamente no centro de uma célula do grid e zera o movimento.
   */
  resetToCell(col, row) {
    this.gridCol = col;
    this.gridRow = row;
    const worldPos = gridToWorld(col, row);
    this.mesh.position.set(worldPos.x, 0, worldPos.z);
    this.mesh.rotation.y = 0;
    this.targetRotationY = 0;
    this.currentDir = { x: 0, z: 0 };
    this.nextDir = { x: 0, z: 0 };
    this.heldKeys = [];
    this.touchOverrideContinuous = false;
    this._clearDpadActive();
    this.walkCycle = 0;
    this.mesh.children[0].position.y = 0;
    this.setPowerVisual(false, 0);
  }

  /**
   * Atualiza o brilho/material do Egg-Man durante o estado de Superpoder (Moeda de Ovo).
   */
  setPowerVisual(isActive, remainingTime, dt = 0) {
    if (!this.eggMaterial) return;
    this.isPowerActive = isActive;
    const skin = getActiveSkinConfig();

    if (!isActive) {
      this.powerPulseTime = 0;
      this.eggMaterial.color.setHex(skin.color);
      this.eggMaterial.emissive.setHex(skin.emissive);
      this.eggMaterial.emissiveIntensity = 1.0;
      return;
    }

    const freq = remainingTime < 2.5 ? 18.0 : 7.5;
    this.powerPulseTime += dt * freq;
    const pulse = (Math.sin(this.powerPulseTime) + 1) * 0.5;

    if (remainingTime < 2.5 && pulse < 0.35) {
      this.eggMaterial.color.setHex(skin.color);
      this.eggMaterial.emissive.setHex(skin.emissive);
      this.eggMaterial.emissiveIntensity = 1.0;
    } else {
      this.eggMaterial.color.setHex(CONFIG.COLORS.EGG_POWER_SHELL);
      this.eggMaterial.emissive.setHex(CONFIG.COLORS.EGG_POWER_EMISSIVE);
      this.eggMaterial.emissiveIntensity = 0.55 + pulse * 0.65;
    }
  }

  /**
   * Constrói a geometria procedural de ovo via THREE.LatheGeometry
   * com raio máximo exato de 0.65 e altura total de 1.6, mais olhos frontais.
   */
  _createProceduralEggModel() {
    const visualContainer = new THREE.Group();

    const points = [];
    const steps = CONFIG.EGG_PROFILE_STEPS;
    const height = CONFIG.EGG_HEIGHT;
    const maxRadius = CONFIG.EGG_MAX_RADIUS;

    const rawRadii = [];
    let peakRaw = 0;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = t * Math.PI;
      const r = Math.sin(theta) * (1 - 0.22 * Math.cos(theta));
      rawRadii.push({ theta, r });
      if (r > peakRaw) peakRaw = r;
    }

    const scaleR = maxRadius / peakRaw;

    for (let i = 0; i <= steps; i++) {
      const { theta, r } = rawRadii[i];
      const radius = (i === 0 || i === steps) ? 0.0 : r * scaleR;
      const y = ((1 - Math.cos(theta)) * 0.5) * height;
      points.push(new THREE.Vector2(radius, y));
    }

    const eggGeometry = new THREE.LatheGeometry(points, CONFIG.EGG_LATHE_SEGMENTS);
    eggGeometry.computeVertexNormals();

    const skin = getActiveSkinConfig();
    this.eggMaterial = new THREE.MeshStandardMaterial({
      color: skin.color,
      emissive: skin.emissive,
      roughness: skin.roughness,
      metalness: skin.metalness
    });

    const eggBodyMesh = new THREE.Mesh(eggGeometry, this.eggMaterial);
    eggBodyMesh.castShadow = true;
    eggBodyMesh.receiveShadow = true;
    visualContainer.add(eggBodyMesh);

    const eyesGroup = new THREE.Group();
    const eyeY = height * 0.62;
    const eyeForwardZ = -maxRadius * 0.84;
    const eyeSpreadX = 0.21;

    const scleraGeo = new THREE.SphereGeometry(0.13, 16, 16);
    const scleraMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EYE_SCLERA,
      roughness: 0.2
    });

    const pupilGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const pupilMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EYE_PUPIL,
      roughness: 0.1
    });

    [-1, 1].forEach((side) => {
      const eyeUnit = new THREE.Group();
      eyeUnit.position.set(side * eyeSpreadX, eyeY, eyeForwardZ);

      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.scale.set(1.0, 1.2, 0.65);
      sclera.castShadow = true;

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0.01, -0.065);

      eyeUnit.add(sclera);
      eyeUnit.add(pupil);
      eyesGroup.add(eyeUnit);
    });

    visualContainer.add(eyesGroup);

    return visualContainer;
  }

  _codeToDir(code) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
      case 'DPAD_UP':
        return { x: 0, z: -1 };
      case 'KeyS':
      case 'ArrowDown':
      case 'DPAD_DOWN':
        return { x: 0, z: 1 };
      case 'KeyA':
      case 'ArrowLeft':
      case 'DPAD_LEFT':
        return { x: -1, z: 0 };
      case 'KeyD':
      case 'ArrowRight':
      case 'DPAD_RIGHT':
        return { x: 1, z: 0 };
      default:
        return null;
    }
  }

  /**
   * Inicializa o D-Pad Virtual na tela com suporte tanto a toque direto quanto a
   * deslizar o polegar continuamente entre os 4 botões direcionais (elementFromPoint).
   */
  _initVirtualDpadListeners() {
    const dpadEl = document.getElementById('virtual-dpad');
    if (!dpadEl) return;

    this.dpadButtons = Array.from(dpadEl.querySelectorAll('[data-dpad-dir]'));

    const dirMap = {
      up: 'DPAD_UP',
      down: 'DPAD_DOWN',
      left: 'DPAD_LEFT',
      right: 'DPAD_RIGHT'
    };

    const activateDpadFromPoint = (clientX, clientY) => {
      const el = document.elementFromPoint(clientX, clientY);
      const btn = el ? el.closest('[data-dpad-dir]') : null;
      if (!btn) {
        this._clearDpadActive();
        return;
      }

      const dirAttr = btn.getAttribute('data-dpad-dir');
      const virtualKey = dirMap[dirAttr];
      if (!virtualKey) return;

      if (this.dpadActiveKey !== virtualKey) {
        this._clearDpadActive();
        this.dpadActiveKey = virtualKey;
        btn.classList.add('active');

        const dir = this._codeToDir(virtualKey);
        if (dir) {
          this.touchOverrideContinuous = false;
          this.nextDir = dir;
          if (!this.heldKeys.includes(virtualKey)) {
            this.heldKeys.push(virtualKey);
          }
        }
      }
    };

    // Eventos Touch no D-Pad (com deslizamento contínuo do polegar via elementFromPoint)
    dpadEl.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length > 0) {
          activateDpadFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: false }
    );

    dpadEl.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length > 0) {
          activateDpadFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: false }
    );

    const endTouchHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._clearDpadActive();
    };

    dpadEl.addEventListener('touchend', endTouchHandler, { passive: false });
    dpadEl.addEventListener('touchcancel', endTouchHandler, { passive: false });

    // Suporte a clique/arrasto de mouse caso o usuário ative o D-Pad no Desktop para testar
    let isMouseDownOnDpad = false;
    dpadEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isMouseDownOnDpad = true;
      activateDpadFromPoint(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDownOnDpad) return;
      activateDpadFromPoint(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (!isMouseDownOnDpad) return;
      isMouseDownOnDpad = false;
      this._clearDpadActive();
    });
  }

  _clearDpadActive() {
    if (this.dpadActiveKey) {
      this.heldKeys = this.heldKeys.filter((k) => k !== this.dpadActiveKey);
      this.dpadActiveKey = null;
    }
    for (const btn of this.dpadButtons) {
      btn.classList.remove('active');
    }
    if (
      CONFIG.CONTROL_MODE === 'HOLD' &&
      !this.touchOverrideContinuous &&
      this.heldKeys.length === 0
    ) {
      this.nextDir = { x: 0, z: 0 };
    }
  }

  /**
   * Mapeamento de controles Teclado (WASD / Setas) + Gestos Touch Swipe para dispositivos móveis.
   */
  _initInputListeners() {
    window.addEventListener('keydown', (e) => {
      const dir = this._codeToDir(e.code);
      if (!dir) return;

      e.preventDefault();
      this.touchOverrideContinuous = false;
      this.nextDir = dir;

      if (!this.heldKeys.includes(e.code)) {
        this.heldKeys.push(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      const dir = this._codeToDir(e.code);
      if (!dir) return;

      this.heldKeys = this.heldKeys.filter((k) => k !== e.code);

      if (CONFIG.CONTROL_MODE === 'HOLD' && !this.touchOverrideContinuous) {
        if (this.heldKeys.length > 0) {
          const lastKey = this.heldKeys[this.heldKeys.length - 1];
          const fallbackDir = this._codeToDir(lastKey);
          if (fallbackDir) {
            this.nextDir = fallbackDir;
          }
        } else {
          this.nextDir = { x: 0, z: 0 };
        }
      }
    });

    window.addEventListener('blur', () => {
      this.heldKeys = [];
      this._clearDpadActive();
      if (CONFIG.CONTROL_MODE === 'HOLD' && !this.touchOverrideContinuous) {
        this.nextDir = { x: 0, z: 0 };
      }
    });

    // Suporte Mobile Swipe no Canvas (ignora quando são 2 dedos de pinch-to-zoom ou toque sobre o D-Pad/Modais)
    window.addEventListener(
      'touchstart',
      (e) => {
        // Se forem 2 ou mais dedos (gesto de pinça de zoom), desativa o swipe de direção
        if (!e.touches || e.touches.length !== 1) {
          this.isSingleTouchSwipeActive = false;
          return;
        }
        // Se o modo mobile selecionado for DPAD, ignora swipe no canvas
        if (CONFIG.MOBILE_CONTROL_MODE === 'DPAD') {
          this.isSingleTouchSwipeActive = false;
          return;
        }
        const target = e.target;
        if (
          target &&
          target.closest &&
          (target.closest('#virtual-dpad') ||
            target.closest('.modal-card') ||
            target.closest('.overlay-card') ||
            target.closest('button'))
        ) {
          this.isSingleTouchSwipeActive = false;
          return;
        }

        this.isSingleTouchSwipeActive = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this.isSingleTouchSwipeActive || !e.touches || e.touches.length !== 1) {
          this.isSingleTouchSwipeActive = false;
          return;
        }
        if (CONFIG.MOBILE_CONTROL_MODE !== 'SWIPE') return;

        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;

        if (Math.hypot(dx, dy) >= CONFIG.SWIPE_MIN_DISTANCE_PX) {
          this.touchOverrideContinuous = true;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.nextDir = { x: dx > 0 ? 1 : -1, z: 0 };
          } else {
            this.nextDir = { x: 0, z: dy > 0 ? 1 : -1 };
          }
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    window.addEventListener(
      'touchend',
      () => {
        this.isSingleTouchSwipeActive = false;
      },
      { passive: true }
    );
  }

  /**
   * Chamado ao alternar de modo no menu de configurações.
   */
  onControlModeChanged() {
    this.touchOverrideContinuous = false;
    this._clearDpadActive();
    if (CONFIG.CONTROL_MODE === 'HOLD' && this.heldKeys.length === 0) {
      this.nextDir = { x: 0, z: 0 };
    }
  }

  _hasDirection(dir) {
    return dir.x !== 0 || dir.z !== 0;
  }

  _isOppositeDirection(dirA, dirB) {
    return (
      this._hasDirection(dirA) &&
      this._hasDirection(dirB) &&
      dirA.x === -dirB.x &&
      dirA.z === -dirB.z
    );
  }

  /**
   * Executa a movimentação determinística em Grid 2D com Input Buffering.
   */
  update(dt) {
    const pos = this.mesh.position;
    const currentCell = worldToGrid(pos.x, pos.z);
    const cellCenter = gridToWorld(currentCell.col, currentCell.row);
    const isHoldMode =
      CONFIG.CONTROL_MODE === 'HOLD' && !this.touchOverrideContinuous;
    const hasHeldKey = this.heldKeys.length > 0;

    if (isHoldMode) {
      if (hasHeldKey) {
        const activeDir = this._codeToDir(this.heldKeys[this.heldKeys.length - 1]);
        if (activeDir) {
          this.nextDir = activeDir;
        }
      } else {
        this.nextDir = { x: 0, z: 0 };
      }
    }

    // 1. Inversão imediata (180 graus) permitida a qualquer momento no corredor atual
    if (this._isOppositeDirection(this.nextDir, this.currentDir)) {
      this.currentDir = { ...this.nextDir };
    }

    // 2. Se estiver parado no centro de uma célula e houver intenção válida, inicia o movimento
    if (!this._hasDirection(this.currentDir) && this._hasDirection(this.nextDir)) {
      if (!isHoldMode || hasHeldKey) {
        const targetCol = currentCell.col + this.nextDir.x;
        const targetRow = currentCell.row + this.nextDir.z;
        if (isPlayerWalkable(targetCol, targetRow)) {
          pos.x = cellCenter.x;
          pos.z = cellCenter.z;
          this.currentDir = { ...this.nextDir };
        }
      }
    }

    // 3. Deslocamento e verificação de cruzamento/proximidade do centro da célula (CENTER_TOLERANCE = 0.08)
    if (this._hasDirection(this.currentDir)) {
      const step = CONFIG.PLAYER_SPEED * dt;
      const prevX = pos.x;
      const prevZ = pos.z;

      const nextX = prevX + this.currentDir.x * step;
      const nextZ = prevZ + this.currentDir.z * step;

      const distToCenter = Math.hypot(nextX - cellCenter.x, nextZ - cellCenter.z);

      const crossedCenterX =
        this.currentDir.x !== 0 &&
        ((prevX - cellCenter.x) * (nextX - cellCenter.x) <= 0);
      const crossedCenterZ =
        this.currentDir.z !== 0 &&
        ((prevZ - cellCenter.z) * (nextZ - cellCenter.z) <= 0);

      const movingTowardsOrAtCenter =
        (cellCenter.x - prevX) * this.currentDir.x >= -0.0001 &&
        (cellCenter.z - prevZ) * this.currentDir.z >= -0.0001;

      const reachedCenterWindow =
        (distToCenter < CONFIG.CENTER_TOLERANCE || crossedCenterX || crossedCenterZ) &&
        movingTowardsOrAtCenter;

      if (reachedCenterWindow) {
        if (isHoldMode && !hasHeldKey) {
          pos.x = cellCenter.x;
          pos.z = cellCenter.z;
          this.currentDir = { x: 0, z: 0 };
          this.nextDir = { x: 0, z: 0 };
        } else {
          const wantsTurn =
            this._hasDirection(this.nextDir) &&
            (this.nextDir.x !== this.currentDir.x || this.nextDir.z !== this.currentDir.z);

          const nextDirWalkable =
            wantsTurn &&
            isPlayerWalkable(
              currentCell.col + this.nextDir.x,
              currentCell.row + this.nextDir.z
            );

          if (nextDirWalkable) {
            pos.x = cellCenter.x;
            pos.z = cellCenter.z;
            this.currentDir = { ...this.nextDir };

            const consumedDist = Math.hypot(cellCenter.x - prevX, cellCenter.z - prevZ);
            const remainingStep = Math.max(0, step - consumedDist);
            pos.x += this.currentDir.x * remainingStep;
            pos.z += this.currentDir.z * remainingStep;
          } else {
            const forwardWalkable = isPlayerWalkable(
              currentCell.col + this.currentDir.x,
              currentCell.row + this.currentDir.z
            );

            if (!forwardWalkable) {
              pos.x = cellCenter.x;
              pos.z = cellCenter.z;
              this.currentDir = { x: 0, z: 0 };
            } else {
              if (this.currentDir.x !== 0) {
                pos.x = nextX;
                pos.z = cellCenter.z;
              } else {
                pos.x = cellCenter.x;
                pos.z = nextZ;
              }
            }
          }
        }
      } else {
        if (this.currentDir.x !== 0) {
          pos.x = nextX;
          pos.z = cellCenter.z;
        } else {
          pos.x = cellCenter.x;
          pos.z = nextZ;
        }
      }

      // 4. Tratamento do Túnel Lateral (célula 5 - wrap-around horizontal)
      this._handleTunnelWrap();
    }

    const updatedCell = worldToGrid(pos.x, pos.z);
    this.gridCol = THREE.MathUtils.clamp(updatedCell.col, 0, GRID_COLS - 1);
    this.gridRow = updatedCell.row;

    // 5. Rotação suave para a direção de currentDir e animação vertical (walkCycle)
    const isMoving = this._hasDirection(this.currentDir);

    if (isMoving) {
      this.targetRotationY = Math.atan2(-this.currentDir.x, -this.currentDir.z);

      const currentY = this.mesh.rotation.y;
      let diff = this.targetRotationY - currentY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, CONFIG.ROTATION_LERP_SPEED * dt);

      this.walkCycle += dt * CONFIG.WALK_CYCLE_SPEED;
    } else {
      this.walkCycle = 0;
    }

    // Regra 4.1: Travamento Vertical Estrito (entity.position.y = 0)
    this.mesh.position.y = 0;

    if (isMoving) {
      this.mesh.children[0].position.y =
        Math.abs(Math.sin(this.walkCycle)) * CONFIG.WALK_BOUNCE_AMPLITUDE;
    } else {
      this.mesh.children[0].position.y = THREE.MathUtils.lerp(
        this.mesh.children[0].position.y,
        0,
        Math.min(1, dt * 15)
      );
    }
  }

  _handleTunnelWrap() {
    const pos = this.mesh.position;
    const leftEdge = gridToWorld(0, this.gridRow).x - CONFIG.TILE_SIZE * 0.5;
    const rightEdge = gridToWorld(GRID_COLS - 1, this.gridRow).x + CONFIG.TILE_SIZE * 0.5;

    if (
      pos.x < leftEdge &&
      getCellValue(0, this.gridRow) === CELL_TYPE.TUNNEL
    ) {
      pos.x = rightEdge - 0.05;
    } else if (
      pos.x > rightEdge &&
      getCellValue(GRID_COLS - 1, this.gridRow) === CELL_TYPE.TUNNEL
    ) {
      pos.x = leftEdge + 0.05;
    }
  }
}
