import * as THREE from 'three';
import { CONFIG, WEAPON_SKINS } from './config.js';

/**
 * Controlador de 1ª Pessoa do Egg-Man (Fase 5 Final):
 * - Câmera FPS com ordem YXZ (Yaw ilimitado, Pitch limitado entre -45° e +45°)
 * - Movimentação 360° no plano XZ (Teclado WASD/Setas + Joystick Analógico Virtual Mobile)
 * - Mira via Pointer Lock API (Desktop) + Área de Arrasto Dual-Touch (Mobile)
 * - Colisão contínua por Depenetração Radial Circle-vs-AABB (2 iterações de solver na vizinhança 3x3)
 * - Customização em tempo real do acabamento (Skin) da Arma/Luva e multiplicador de sensibilidade
 */
export class Player {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} domElement
   * @param {object} arenaInfo - Dados do grid da arena ({ grid, rows, cols, tileSize })
   */
  constructor(camera, domElement, arenaInfo) {
    this.camera = camera;
    this.domElement = domElement;
    this.arenaInfo = arenaInfo;

    this.camera.rotation.order = 'YXZ';
    this.yaw = 0;
    this.pitch = 0;

    this.position = new THREE.Vector3(0, 0, 0);
    this.camera.position.set(0, CONFIG.EYE_HEIGHT, 0);

    // Atributos de Saúde e Power-Ups Temporários
    this.maxHp = CONFIG.PLAYER_MAX_HP;
    this.hp = CONFIG.PLAYER_MAX_HP;
    this.rifleTimer = 0;
    this.shieldTimer = 0;
    this.currentWeapon = 'PISTOL';

    // Configurações customizáveis pelo Menu ⚙️
    this.sensitivityMultiplier = 1.0;
    this.currentSkinId = 'tactical';

    // Controle de habilitação de input (bloqueado quando em START, GAME_OVER ou PAUSED)
    this.controlsEnabled = false;

    // Entradas de teclado
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      shoot: false
    };

    // Entradas analógicas do Joystick Virtual Mobile (-1 a +1)
    this.touchMove = {
      forward: 0,
      strafe: 0
    };
    this.touchShooting = false;

    // Controle de Pointer Lock e fallback de arrasto do mouse
    this.isLocked = false;
    this.isDraggingFallback = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;

    // Estado de Disparo, Bobbing e Recuo do Viewmodel
    this.shootCooldownTimer = 0;
    this.kickbackProgress = 0;
    this.muzzleFlashTimer = 0;
    this.bobTimer = 0;
    this.isMoving = false;

    this.weaponBasePos = new THREE.Vector3(0.32, -0.27, -0.52);
    this.weaponBaseRot = new THREE.Euler(0.02, -0.06, 0);

    this.onShootCallback = null;
    this.onPointerLockLost = null;

    this._createWeaponViewmodels();
    this._bindEvents();
  }

  /**
   * Restaura estado completo do jogador para uma nova partida
   */
  resetState(x, z, yawAngle = 0) {
    this.hp = this.maxHp;
    this.rifleTimer = 0;
    this.shieldTimer = 0;
    this.shootCooldownTimer = 0;
    this.kickbackProgress = 0;
    this._setWeaponViewmodel('PISTOL');
    this.clearInputs();
    this.setSpawn(x, z, yawAngle);
  }

  /**
   * Limpa teclas e toques ativos (ao abrir menu ou terminar partida)
   */
  clearInputs() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.shoot = false;
    this.touchMove.forward = 0;
    this.touchMove.strafe = 0;
    this.touchShooting = false;
    this.isDraggingFallback = false;
  }

  setSpawn(x, z, yawAngle = 0) {
    this.position.set(x, 0, z);
    this.yaw = yawAngle;
    this.pitch = 0;
    this._syncCameraTransform();
  }

  /**
   * Define o multiplicador de sensibilidade da mira (0.5x a 2.0x)
   */
  setSensitivityMultiplier(mult) {
    this.sensitivityMultiplier = Math.max(0.5, Math.min(2.0, Number(mult) || 1.0));
  }

  /**
   * Aplica imediatamente o acabamento visual (Skin) nos materiais da Egg-Pistol, Egg-Rifle e Luva
   * @param {string} skinId
   */
  applyWeaponSkin(skinId) {
    const skin = WEAPON_SKINS[skinId] || WEAPON_SKINS.tactical;
    this.currentSkinId = skin.id;

    if (this.materials) {
      this.materials.shellMat.color.setHex(skin.shellColor);
      this.materials.yolkMat.color.setHex(skin.accentColor);
      this.materials.goldMat.color.setHex(skin.accentColor);
      this.materials.metalMat.color.setHex(skin.metalColor);
      this.materials.gloveMat.color.setHex(skin.gloveColor);
    }
  }

  activateRifle(duration = CONFIG.RIFLE.DURATION) {
    this.rifleTimer = duration;
    this._setWeaponViewmodel('RIFLE');
  }

  activateShield(duration = CONFIG.POWERUPS.SHIELD_DURATION) {
    this.shieldTimer = duration;
  }

  heal(amount = CONFIG.POWERUPS.HEAL_AMOUNT) {
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - oldHp;
  }

  takeDamage(amount) {
    if (this.shieldTimer > 0) {
      return false;
    }
    this.hp = Math.max(0, this.hp - amount);
    return true;
  }

  _setWeaponViewmodel(type) {
    if (this.currentWeapon === type) return;
    this.currentWeapon = type;

    if (this.pistolMeshGroup && this.rifleMeshGroup) {
      this.pistolMeshGroup.visible = type === 'PISTOL';
      this.rifleMeshGroup.visible = type === 'RIFLE';
    }
    this.shootCooldownTimer = 0;
  }

  _createWeaponViewmodels() {
    this.weaponGroup = new THREE.Group();

    const shellMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EGG_SHELL,
      roughness: 0.35,
      metalness: 0.08
    });
    const yolkMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EGG_YOLK,
      roughness: 0.25,
      metalness: 0.2,
      emissive: 0x3a2200,
      emissiveIntensity: 0.35
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.RIFLE_GOLD,
      roughness: 0.22,
      metalness: 0.82,
      emissive: 0x332000,
      emissiveIntensity: 0.25
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.GUN_METAL,
      roughness: 0.4,
      metalness: 0.75
    });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.GUN_BARREL,
      roughness: 0.3,
      metalness: 0.85
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.05
    });
    const flashMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.MUZZLE_FLASH,
      transparent: true,
      opacity: 0.92
    });

    this.materials = {
      shellMat,
      yolkMat,
      goldMat,
      metalMat,
      barrelMat,
      gloveMat
    };

    // =========================================================================
    // 1. VIEWMODEL: EGG-PISTOL (Arma Base)
    // =========================================================================
    this.pistolMeshGroup = new THREE.Group();
    this.weaponGroup.add(this.pistolMeshGroup);

    const bodyGeo = new THREE.SphereGeometry(0.075, 20, 16);
    bodyGeo.scale(0.85, 0.95, 1.85);
    const bodyMesh = new THREE.Mesh(bodyGeo, shellMat);
    bodyMesh.position.set(0, 0.02, 0.02);
    this.pistolMeshGroup.add(bodyMesh);

    const slideGeo = new THREE.BoxGeometry(0.068, 0.042, 0.26);
    const slideMesh = new THREE.Mesh(slideGeo, metalMat);
    slideMesh.position.set(0, 0.078, -0.02);
    this.pistolMeshGroup.add(slideMesh);

    const barrelGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.18, 16);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    barrelMesh.position.set(0, 0.055, -0.18);
    this.pistolMeshGroup.add(barrelMesh);

    const muzzleRingGeo = new THREE.TorusGeometry(0.022, 0.005, 10, 20);
    const muzzleRingMesh = new THREE.Mesh(muzzleRingGeo, yolkMat);
    muzzleRingMesh.position.set(0, 0.055, -0.27);
    this.pistolMeshGroup.add(muzzleRingMesh);

    const coreGeo = new THREE.SphereGeometry(0.036, 16, 12);
    coreGeo.scale(1.35, 0.75, 0.9);
    const coreMesh = new THREE.Mesh(coreGeo, yolkMat);
    coreMesh.position.set(0, 0.025, 0.01);
    this.pistolMeshGroup.add(coreMesh);

    const gripGeo = new THREE.BoxGeometry(0.062, 0.14, 0.075);
    const gripMesh = new THREE.Mesh(gripGeo, metalMat);
    gripMesh.position.set(0, -0.065, 0.075);
    gripMesh.rotation.x = 0.28;
    this.pistolMeshGroup.add(gripMesh);

    const gloveGeo = new THREE.SphereGeometry(0.058, 14, 12);
    const gloveMesh = new THREE.Mesh(gloveGeo, gloveMat);
    gloveMesh.position.set(0, -0.085, 0.095);
    this.pistolMeshGroup.add(gloveMesh);

    const rearSightGeo = new THREE.BoxGeometry(0.05, 0.018, 0.02);
    const rearSightMesh = new THREE.Mesh(rearSightGeo, yolkMat);
    rearSightMesh.position.set(0, 0.105, 0.09);
    this.pistolMeshGroup.add(rearSightMesh);

    const frontSightGeo = new THREE.BoxGeometry(0.014, 0.02, 0.02);
    const frontSightMesh = new THREE.Mesh(frontSightGeo, yolkMat);
    frontSightMesh.position.set(0, 0.105, -0.13);
    this.pistolMeshGroup.add(frontSightMesh);

    const flashGeo = new THREE.ConeGeometry(0.045, 0.14, 8);
    flashGeo.rotateX(-Math.PI / 2);
    this.pistolFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.pistolFlashMesh.position.set(0, 0.055, -0.34);
    this.pistolFlashMesh.visible = false;
    this.pistolMeshGroup.add(this.pistolFlashMesh);

    this.pistolMuzzleAnchor = new THREE.Object3D();
    this.pistolMuzzleAnchor.position.set(0, 0.055, -0.29);
    this.pistolMeshGroup.add(this.pistolMuzzleAnchor);

    // =========================================================================
    // 2. VIEWMODEL: EGG-RIFLE AUTOMÁTICO (Power-Up de 10s)
    // =========================================================================
    this.rifleMeshGroup = new THREE.Group();
    this.rifleMeshGroup.visible = false;
    this.weaponGroup.add(this.rifleMeshGroup);

    const rifleReceiverGeo = new THREE.BoxGeometry(0.082, 0.095, 0.38);
    const rifleReceiver = new THREE.Mesh(rifleReceiverGeo, goldMat);
    rifleReceiver.position.set(0, 0.035, -0.04);
    this.rifleMeshGroup.add(rifleReceiver);

    const rifleShellGeo = new THREE.SphereGeometry(0.068, 18, 14);
    rifleShellGeo.scale(0.82, 0.78, 2.2);
    const rifleShell = new THREE.Mesh(rifleShellGeo, shellMat);
    rifleShell.position.set(0, 0.03, -0.02);
    this.rifleMeshGroup.add(rifleShell);

    const handguardGeo = new THREE.BoxGeometry(0.066, 0.068, 0.24);
    const handguard = new THREE.Mesh(handguardGeo, metalMat);
    handguard.position.set(0, 0.04, -0.28);
    this.rifleMeshGroup.add(handguard);

    const rifleBarrelGeo = new THREE.CylinderGeometry(0.019, 0.022, 0.34, 16);
    rifleBarrelGeo.rotateX(Math.PI / 2);
    const rifleBarrel = new THREE.Mesh(rifleBarrelGeo, barrelMat);
    rifleBarrel.position.set(0, 0.045, -0.44);
    this.rifleMeshGroup.add(rifleBarrel);

    const muzzleBrakeGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.06, 16);
    muzzleBrakeGeo.rotateX(Math.PI / 2);
    const muzzleBrake = new THREE.Mesh(muzzleBrakeGeo, goldMat);
    muzzleBrake.position.set(0, 0.045, -0.60);
    this.rifleMeshGroup.add(muzzleBrake);

    const magGeo = new THREE.BoxGeometry(0.046, 0.16, 0.072);
    const magMesh = new THREE.Mesh(magGeo, yolkMat);
    magMesh.position.set(0, -0.065, -0.14);
    magMesh.rotation.x = -0.24;
    this.rifleMeshGroup.add(magMesh);

    const scopeMountGeo = new THREE.BoxGeometry(0.052, 0.028, 0.14);
    const scopeMount = new THREE.Mesh(scopeMountGeo, metalMat);
    scopeMount.position.set(0, 0.096, -0.04);
    this.rifleMeshGroup.add(scopeMount);

    const scopeLensGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.12, 16);
    scopeLensGeo.rotateX(Math.PI / 2);
    const scopeLens = new THREE.Mesh(scopeLensGeo, barrelMat);
    scopeLens.position.set(0, 0.122, -0.04);
    this.rifleMeshGroup.add(scopeLens);

    const opticDotGeo = new THREE.RingGeometry(0.008, 0.018, 16);
    const opticDotMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide
    });
    const opticDot = new THREE.Mesh(opticDotGeo, opticDotMat);
    opticDot.position.set(0, 0.122, 0.022);
    this.rifleMeshGroup.add(opticDot);

    const stockGeo = new THREE.BoxGeometry(0.068, 0.085, 0.16);
    const stockMesh = new THREE.Mesh(stockGeo, metalMat);
    stockMesh.position.set(0, 0.02, 0.19);
    this.rifleMeshGroup.add(stockMesh);

    const rifleGrip = gripMesh.clone();
    this.rifleMeshGroup.add(rifleGrip);

    const rifleGlove = gloveMesh.clone();
    this.rifleMeshGroup.add(rifleGlove);

    const rifleFlashGeo = new THREE.ConeGeometry(0.058, 0.19, 8);
    rifleFlashGeo.rotateX(-Math.PI / 2);
    this.rifleFlashMesh = new THREE.Mesh(rifleFlashGeo, flashMat);
    this.rifleFlashMesh.position.set(0, 0.045, -0.68);
    this.rifleFlashMesh.visible = false;
    this.rifleMeshGroup.add(this.rifleFlashMesh);

    this.rifleMuzzleAnchor = new THREE.Object3D();
    this.rifleMuzzleAnchor.position.set(0, 0.045, -0.62);
    this.rifleMeshGroup.add(this.rifleMuzzleAnchor);

    this.weaponGroup.position.copy(this.weaponBasePos);
    this.weaponGroup.rotation.copy(this.weaponBaseRot);

    this.camera.add(this.weaponGroup);
  }

  getMuzzleWorldPosition() {
    const worldPos = new THREE.Vector3();
    const activeAnchor =
      this.currentWeapon === 'RIFLE' ? this.rifleMuzzleAnchor : this.pistolMuzzleAnchor;

    if (activeAnchor) {
      activeAnchor.getWorldPosition(worldPos);
    } else {
      this.camera.getWorldPosition(worldPos);
    }
    return worldPos;
  }

  getActiveWeaponConfig() {
    return this.currentWeapon === 'RIFLE' ? CONFIG.RIFLE : CONFIG.PISTOL;
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.controlsEnabled) return;
      this._onKeyChange(e.code, true);
    });
    window.addEventListener('keyup', (e) => {
      this._onKeyChange(e.code, false);
    });

    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.isLocked;
      this.isLocked = document.pointerLockElement === this.domElement;
      if (wasLocked && !this.isLocked && typeof this.onPointerLockLost === 'function') {
        this.onPointerLockLost();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.controlsEnabled) return;
      if (this.isLocked) {
        this.rotateView(e.movementX, e.movementY, false);
      } else if (this.isDraggingFallback) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.rotateView(dx, dy, false);
      }
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !this.controlsEnabled) return;

      if (!this.isLocked) {
        this.requestPointerLock();
        this.isDraggingFallback = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }

      this.keys.shoot = true;
      this.tryShoot();
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDraggingFallback = false;
        this.keys.shoot = false;
      }
    });
  }

  requestPointerLock() {
    // Evita solicitar Pointer Lock em dispositivos puramente touch
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    if (this.domElement.requestPointerLock) {
      try {
        const promise = this.domElement.requestPointerLock();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {});
        }
      } catch (_) {
        // Ignora erro caso bloqueado pelo navegador
      }
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
    this.isLocked = false;
  }

  _onKeyChange(code, isPressed) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = isPressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = isPressed;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = isPressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = isPressed;
        break;
      case 'Space':
        this.keys.shoot = isPressed;
        if (isPressed && this.controlsEnabled) this.tryShoot();
        break;
    }
  }

  /**
   * Rotaciona a câmera com suporte a sensibilidade customizada (Mouse e Dual-Touch)
   * @param {number} deltaX
   * @param {number} deltaY
   * @param {boolean} isTouch
   */
  rotateView(deltaX, deltaY, isTouch = false) {
    const baseSens = isTouch ? CONFIG.TOUCH_SENSITIVITY : CONFIG.MOUSE_SENSITIVITY;
    const sens = baseSens * this.sensitivityMultiplier;

    this.yaw -= deltaX * sens;
    this.pitch -= deltaY * sens;
    this.pitch = Math.max(-CONFIG.PITCH_LIMIT, Math.min(CONFIG.PITCH_LIMIT, this.pitch));
  }

  /**
   * Define o vetor de deslocamento do Joystick Analógico Virtual Mobile (-1 a +1)
   */
  setTouchMovement(forward, strafe) {
    this.touchMove.forward = Math.max(-1, Math.min(1, forward));
    this.touchMove.strafe = Math.max(-1, Math.min(1, strafe));
  }

  /**
   * Define o estado do botão dedicado de tiro Mobile (🔥)
   */
  setTouchShooting(isFiring) {
    this.touchShooting = Boolean(isFiring);
    if (this.touchShooting && this.controlsEnabled) {
      this.tryShoot();
    }
  }

  tryShoot() {
    if (!this.controlsEnabled || this.shootCooldownTimer > 0) return false;

    const weaponCfg = this.getActiveWeaponConfig();
    this.shootCooldownTimer = weaponCfg.COOLDOWN;
    this.kickbackProgress = 1.0;
    this.muzzleFlashTimer = 0.048;

    const activeFlash =
      this.currentWeapon === 'RIFLE' ? this.rifleFlashMesh : this.pistolFlashMesh;
    if (activeFlash) {
      activeFlash.visible = true;
      activeFlash.rotation.z = Math.random() * Math.PI * 2;
    }

    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
      crosshair.classList.add('recoil');
      setTimeout(() => crosshair.classList.remove('recoil'), 75);
    }

    if (typeof this.onShootCallback === 'function') {
      this.onShootCallback(this.currentWeapon, weaponCfg.DAMAGE);
    }
    return true;
  }

  /**
   * Resolve colisão contínua por Depenetração Radial Circle-vs-AABB
   * (2 iterações de solver na vizinhança 3x3)
   */
  _resolveCircleAABBCollisions(candidateX, candidateZ) {
    const { grid, rows, cols, tileSize } = this.arenaInfo;
    const r = CONFIG.PLAYER_RADIUS;
    const rSq = r * r;
    const halfWidth = (cols * tileSize) / 2;
    const halfDepth = (rows * tileSize) / 2;

    let nextX = candidateX;
    let nextZ = candidateZ;

    for (let iter = 0; iter < 2; iter++) {
      const centerCol = Math.floor((nextX + halfWidth) / tileSize);
      const centerRow = Math.floor((nextZ + halfDepth) / tileSize);

      const minCol = Math.max(0, centerCol - 1);
      const maxCol = Math.min(cols - 1, centerCol + 1);
      const minRow = Math.max(0, centerRow - 1);
      const maxRow = Math.min(rows - 1, centerRow + 1);

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          if (grid[row][col] !== 1) continue;

          const minX = col * tileSize - halfWidth;
          const maxX = minX + tileSize;
          const minZ = row * tileSize - halfDepth;
          const maxZ = minZ + tileSize;

          const closestX = Math.max(minX, Math.min(nextX, maxX));
          const closestZ = Math.max(minZ, Math.min(nextZ, maxZ));

          const dx = nextX - closestX;
          const dz = nextZ - closestZ;
          const distSq = dx * dx + dz * dz;

          if (distSq < rSq) {
            const dist = Math.sqrt(distSq);

            if (dist > 1e-6) {
              const overlap = r - dist;
              nextX += (dx / dist) * overlap;
              nextZ += (dz / dist) * overlap;
            } else {
              const penLeft = nextX - minX;
              const penRight = maxX - nextX;
              const penTop = nextZ - minZ;
              const penBottom = maxZ - nextZ;
              const minPen = Math.min(penLeft, penRight, penTop, penBottom);

              if (minPen === penLeft) {
                nextX = minX - r;
              } else if (minPen === penRight) {
                nextX = maxX + r;
              } else if (minPen === penTop) {
                nextZ = minZ - r;
              } else {
                nextZ = maxZ + r;
              }
            }
          }
        }
      }
    }

    return { x: nextX, z: nextZ };
  }

  /**
   * Atualiza física de movimento, timers de power-ups e animações do viewmodel
   * @param {number} dt - Delta time em segundos
   */
  update(dt) {
    if (this.rifleTimer > 0) {
      this.rifleTimer = Math.max(0, this.rifleTimer - dt);
      if (this.rifleTimer === 0 && this.currentWeapon === 'RIFLE') {
        this._setWeaponViewmodel('PISTOL');
      }
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    }

    // Combina entradas do teclado (WASD/Setas) com o Joystick Analógico Mobile
    const keyForward = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0);
    const keyStrafe = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);

    const rawForward = keyForward + this.touchMove.forward;
    const rawStrafe = keyStrafe + this.touchMove.strafe;
    const mag = Math.hypot(rawForward, rawStrafe);

    this.isMoving = this.controlsEnabled && mag > 0.04;

    if (this.isMoving) {
      // Limita magnitude máxima a 1.0 mas preserva controle analógico proporcional do joystick
      const scale = mag > 1.0 ? 1.0 / mag : 1.0;
      const normForward = rawForward * scale;
      const normStrafe = rawStrafe * scale;

      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      const moveX = (forwardX * normForward + rightX * normStrafe) * CONFIG.PLAYER_SPEED * dt;
      const moveZ = (forwardZ * normForward + rightZ * normStrafe) * CONFIG.PLAYER_SPEED * dt;

      const resolved = this._resolveCircleAABBCollisions(
        this.position.x + moveX,
        this.position.z + moveZ
      );
      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    this._syncCameraTransform();

    if (this.shootCooldownTimer > 0) {
      this.shootCooldownTimer = Math.max(0, this.shootCooldownTimer - dt);
    }

    if (this.controlsEnabled && (this.keys.shoot || this.touchShooting) && this.shootCooldownTimer === 0) {
      this.tryShoot();
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        if (this.pistolFlashMesh) this.pistolFlashMesh.visible = false;
        if (this.rifleFlashMesh) this.rifleFlashMesh.visible = false;
      }
    }

    this._updateViewmodelAnimation(dt);
  }

  _syncCameraTransform() {
    this.camera.position.set(this.position.x, CONFIG.EYE_HEIGHT, this.position.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  _updateViewmodelAnimation(dt) {
    if (this.isMoving) {
      this.bobTimer += dt * CONFIG.PISTOL.BOB_FREQ;
    } else {
      this.bobTimer = THREE.MathUtils.lerp(
        this.bobTimer,
        Math.round(this.bobTimer / Math.PI) * Math.PI,
        Math.min(1, dt * 8)
      );
    }

    const bobOffsetX = this.isMoving ? Math.cos(this.bobTimer * 0.5) * CONFIG.PISTOL.BOB_AMP_X : 0;
    const bobOffsetY = this.isMoving ? Math.abs(Math.sin(this.bobTimer)) * CONFIG.PISTOL.BOB_AMP_Y : 0;

    const weaponCfg = this.getActiveWeaponConfig();
    if (this.kickbackProgress > 0) {
      this.kickbackProgress = Math.max(0, this.kickbackProgress - dt * weaponCfg.KICKBACK_RECOVERY);
    }

    const kickZ = this.kickbackProgress * weaponCfg.KICKBACK_Z;
    const kickRotX = this.kickbackProgress * weaponCfg.KICKBACK_ROT_X;

    this.weaponGroup.position.set(
      this.weaponBasePos.x + bobOffsetX,
      this.weaponBasePos.y - bobOffsetY,
      this.weaponBasePos.z + kickZ
    );

    this.weaponGroup.rotation.set(
      this.weaponBaseRot.x + kickRotX,
      this.weaponBaseRot.y,
      this.weaponBaseRot.z
    );
  }
}
