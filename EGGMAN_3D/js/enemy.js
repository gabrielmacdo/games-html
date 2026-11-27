import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  GRID_COLS,
  GRID_ROWS,
  CELL_TYPE,
  ENEMY_OUTSIDE_CELL,
  ENEMY_HOME_CENTER_CELL,
  gridToWorld,
  worldToGrid,
  getCellValue,
  isEnemyWalkable,
  isInsideEnemyHouse
} from './mapData.js';

/**
 * Estados possíveis de cada Ovo Inimigo (Seção 6 de EGGMAN_3D_TECH_SPEC.md)
 */
export const ENEMY_STATE = {
  SCATTER: 'SCATTER',
  CHASE: 'CHASE',
  FRIGHTENED: 'FRIGHTENED',
  EATEN: 'EATEN'
};

/**
 * Definição das 4 personalidades de Ovos Inimigos conforme Seção 6 da especificação:
 * 1. Vermelho (Perseguidor Direto)
 * 2. Rosa (Emboscador: 4 células à frente de player.currentDir)
 * 3. Azul (Flanqueador: vetor dobrado entre o Ovo Vermelho e 2 células à frente do Egg-Man)
 * 4. Laranja (Tímido: persegue se distância > 8 células; recua para o canto inferior esquerdo se <= 8)
 */
export const ENEMY_PROFILES = [
  {
    id: 'red',
    name: 'Ovo Vermelho (Perseguidor)',
    color: CONFIG.COLORS.ENEMY_RED,
    homeCell: { col: 9, row: 10 },
    scatterTarget: { col: GRID_COLS - 2, row: 1 },
    releaseDelay: 0.4
  },
  {
    id: 'pink',
    name: 'Ovo Rosa (Emboscador)',
    color: CONFIG.COLORS.ENEMY_PINK,
    homeCell: { col: 8, row: 10 },
    scatterTarget: { col: 1, row: 1 },
    releaseDelay: 2.2
  },
  {
    id: 'blue',
    name: 'Ovo Azul (Flanqueador)',
    color: CONFIG.COLORS.ENEMY_BLUE,
    homeCell: { col: 10, row: 10 },
    scatterTarget: { col: GRID_COLS - 2, row: GRID_ROWS - 2 },
    releaseDelay: 4.2
  },
  {
    id: 'orange',
    name: 'Ovo Laranja (Tímido)',
    color: CONFIG.COLORS.ENEMY_ORANGE,
    homeCell: { col: 9, row: 10 },
    scatterTarget: { col: 1, row: GRID_ROWS - 2 },
    releaseDelay: 6.2
  }
];

export class Enemy {
  constructor(scene, profile, sharedEggGeo) {
    this.scene = scene;
    this.profile = profile;
    this.id = profile.id;

    // Grupo raiz com travamento vertical estrito (position.y = 0)
    this.mesh = new THREE.Group();

    // Malha visual interna (mesh.children[0]) que recebe a oscilação vertical (walkCycle)
    this.visualGroup = this._buildVisualModel(sharedEggGeo);
    this.mesh.add(this.visualGroup);

    this.scene.add(this.mesh);

    this.state = ENEMY_STATE.SCATTER;
    this.gridCol = profile.homeCell.col;
    this.gridRow = profile.homeCell.row;
    this.currentDir = { x: 0, z: -1 };
    this.lastDecisionCellKey = '';

    this.releaseTimer = profile.releaseDelay;
    this.inHouse = true;
    this.speedMultiplier = 1.0;

    this.walkCycle = Math.random() * Math.PI * 2;
    this.targetRotationY = 0;

    this.reset(ENEMY_STATE.SCATTER, 1.0);
  }

  _buildVisualModel(sharedEggGeo) {
    const container = new THREE.Group();

    // 1. Casca principal do Ovo Inimigo
    this.shellMaterial = new THREE.MeshStandardMaterial({
      color: this.profile.color,
      roughness: 0.34,
      metalness: 0.1
    });

    this.shellMesh = new THREE.Mesh(sharedEggGeo, this.shellMaterial);
    this.shellMesh.castShadow = true;
    this.shellMesh.receiveShadow = true;
    container.add(this.shellMesh);

    // 2. Anel trincado ao redor do ovo (visível apenas em FRIGHTENED)
    const crackGeo = new THREE.TorusGeometry(CONFIG.EGG_MAX_RADIUS * 0.96, 0.035, 6, 12);
    crackGeo.rotateX(Math.PI / 2);
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, wireframe: true });
    this.crackRingMesh = new THREE.Mesh(crackGeo, crackMat);
    this.crackRingMesh.position.y = CONFIG.EGG_HEIGHT * 0.48;
    this.crackRingMesh.visible = false;
    container.add(this.crackRingMesh);

    // 3. Gema interna (exibida exclusivamente no estado EATEN)
    this.eatenYolkGroup = new THREE.Group();
    const yolkGeo = new THREE.SphereGeometry(0.34, 16, 16);
    const yolkMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.ENEMY_YOLK,
      emissive: 0xb45309,
      emissiveIntensity: 0.4,
      roughness: 0.2
    });
    const yolkMesh = new THREE.Mesh(yolkGeo, yolkMat);
    yolkMesh.position.y = 0.68;
    this.eatenYolkGroup.add(yolkMesh);
    this.eatenYolkGroup.visible = false;
    container.add(this.eatenYolkGroup);

    // 4. Olhos frontais (-Z) + sobrancelhas inclinadas
    const eyesGroup = new THREE.Group();
    const height = CONFIG.EGG_HEIGHT;
    const maxRadius = CONFIG.EGG_MAX_RADIUS;
    const eyeY = height * 0.62;
    const eyeForwardZ = -maxRadius * 0.84;
    const eyeSpreadX = 0.21;

    const scleraGeo = new THREE.SphereGeometry(0.13, 14, 14);
    const scleraMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EYE_SCLERA,
      roughness: 0.2
    });

    const pupilGeo = new THREE.SphereGeometry(0.065, 10, 10);
    const pupilMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EYE_PUPIL,
      roughness: 0.1
    });

    const browGeo = new THREE.BoxGeometry(0.2, 0.04, 0.06);
    const browMat = new THREE.MeshStandardMaterial({ color: 0x111827 });

    [-1, 1].forEach((side) => {
      const eyeUnit = new THREE.Group();
      eyeUnit.position.set(side * eyeSpreadX, eyeY, eyeForwardZ);

      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      sclera.scale.set(1.0, 1.2, 0.65);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(0, 0.0, -0.065);

      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(0, 0.14, -0.04);
      brow.rotation.z = side * 0.28;

      eyeUnit.add(sclera);
      eyeUnit.add(pupil);
      eyeUnit.add(brow);
      eyesGroup.add(eyeUnit);
    });

    container.add(eyesGroup);

    return container;
  }

  /**
   * Reposiciona o inimigo na sua célula inicial dentro da base central com saída escalonada.
   */
  reset(initialWaveState = ENEMY_STATE.SCATTER, speedMultiplier = 1.0) {
    this.speedMultiplier = speedMultiplier;
    this.gridCol = this.profile.homeCell.col;
    this.gridRow = this.profile.homeCell.row;
    const worldPos = gridToWorld(this.gridCol, this.gridRow);

    this.mesh.position.set(worldPos.x, 0, worldPos.z);
    this.mesh.rotation.y = 0;
    this.targetRotationY = 0;

    this.currentDir = { x: 0, z: -1 };
    this.lastDecisionCellKey = '';
    this.releaseTimer = this.profile.releaseDelay;
    this.inHouse = true;
    this.state = initialWaveState;

    this._applyVisualState(0);
  }

  enterFrightened() {
    if (this.state === ENEMY_STATE.EATEN) return;

    const wasAlreadyFrightened = this.state === ENEMY_STATE.FRIGHTENED;
    this.state = ENEMY_STATE.FRIGHTENED;

    if (!wasAlreadyFrightened && !this.inHouse) {
      const revX = -this.currentDir.x;
      const revZ = -this.currentDir.z;
      if (isEnemyWalkable(this.gridCol + revX, this.gridRow + revZ, false)) {
        this.currentDir = { x: revX, z: revZ };
        this.lastDecisionCellKey = '';
      }
    }

    this._applyVisualState(CONFIG.POWER_MODE_DURATION);
  }

  enterEaten() {
    this.state = ENEMY_STATE.EATEN;
    this.lastDecisionCellKey = '';
    this._applyVisualState(0);
  }

  syncWaveState(waveState) {
    if (this.state !== ENEMY_STATE.FRIGHTENED && this.state !== ENEMY_STATE.EATEN) {
      this.state = waveState;
      this._applyVisualState(0);
    }
  }

  _applyVisualState(frightenedRemaining = 0) {
    if (this.state === ENEMY_STATE.EATEN) {
      this.shellMesh.visible = false;
      this.crackRingMesh.visible = false;
      this.eatenYolkGroup.visible = true;
      return;
    }

    this.shellMesh.visible = true;
    this.eatenYolkGroup.visible = false;

    if (this.state === ENEMY_STATE.FRIGHTENED) {
      this.crackRingMesh.visible = true;
      const isFlashing =
        frightenedRemaining > 0 &&
        frightenedRemaining < 2.2 &&
        Math.floor(frightenedRemaining * 7) % 2 === 0;

      this.shellMaterial.color.setHex(
        isFlashing
          ? CONFIG.COLORS.ENEMY_FRIGHTENED_FLASH
          : CONFIG.COLORS.ENEMY_FRIGHTENED
      );
      this.shellMaterial.emissive.setHex(0x1e3a8a);
      this.shellMaterial.emissiveIntensity = 0.35;
    } else {
      this.crackRingMesh.visible = false;
      this.shellMaterial.color.setHex(this.profile.color);
      this.shellMaterial.emissive.setHex(0x000000);
      this.shellMaterial.emissiveIntensity = 0.0;
    }
  }

  _computeTargetCell(player, redEnemy) {
    if (this.inHouse && this.state !== ENEMY_STATE.EATEN) {
      return ENEMY_OUTSIDE_CELL;
    }

    if (this.state === ENEMY_STATE.EATEN) {
      return ENEMY_HOME_CENTER_CELL;
    }

    if (this.state === ENEMY_STATE.SCATTER) {
      return this.profile.scatterTarget;
    }

    const pCol = player.gridCol;
    const pRow = player.gridRow;
    const pDirX = player.currentDir.x;
    const pDirZ = player.currentDir.z;

    switch (this.id) {
      case 'red':
        return { col: pCol, row: pRow };

      case 'pink':
        return {
          col: pCol + pDirX * 4,
          row: pRow + pDirZ * 4
        };

      case 'blue': {
        const pivotCol = pCol + pDirX * 2;
        const pivotRow = pRow + pDirZ * 2;
        const redCol = redEnemy ? redEnemy.gridCol : pCol;
        const redRow = redEnemy ? redEnemy.gridRow : pRow;
        return {
          col: redCol + (pivotCol - redCol) * 2,
          row: redRow + (pivotRow - redRow) * 2
        };
      }

      case 'orange': {
        const distCells = Math.hypot(pCol - this.gridCol, pRow - this.gridRow);
        if (distCells > 8.0) {
          return { col: pCol, row: pRow };
        }
        return this.profile.scatterTarget;
      }

      default:
        return { col: pCol, row: pRow };
    }
  }

  _chooseNextDirection(col, row, player, redEnemy) {
    const canPassGate = this.inHouse || this.state === ENEMY_STATE.EATEN;

    const dirs = [
      { x: 0, z: -1 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 1, z: 0 }
    ];

    const validNonReverse = [];
    const allValid = [];

    for (const d of dirs) {
      const nCol = col + d.x;
      const nRow = row + d.z;
      if (!isEnemyWalkable(nCol, nRow, canPassGate)) continue;

      allValid.push(d);
      const isReverse =
        (this.currentDir.x !== 0 || this.currentDir.z !== 0) &&
        d.x === -this.currentDir.x &&
        d.z === -this.currentDir.z;

      if (!isReverse) {
        validNonReverse.push(d);
      }
    }

    const candidates = validNonReverse.length > 0 ? validNonReverse : allValid;
    if (candidates.length === 0) {
      return { x: 0, z: 0 };
    }

    if (this.state === ENEMY_STATE.FRIGHTENED && !this.inHouse) {
      if (Math.random() < 0.35) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
      let bestFleeDir = candidates[0];
      let maxDistSq = -1;
      for (const d of candidates) {
        const dx = col + d.x - player.gridCol;
        const dz = row + d.z - player.gridRow;
        const distSq = dx * dx + dz * dz;
        if (distSq > maxDistSq) {
          maxDistSq = distSq;
          bestFleeDir = d;
        }
      }
      return bestFleeDir;
    }

    const target = this._computeTargetCell(player, redEnemy);
    let bestDir = candidates[0];
    let minDistSq = Infinity;

    for (const d of candidates) {
      const nCol = col + d.x;
      const nRow = row + d.z;
      const dx = nCol - target.col;
      const dz = nRow - target.row;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestDir = d;
      }
    }

    return bestDir;
  }

  /**
   * Retorna a velocidade atual do inimigo considerando o escalonamento de fase (+5% por fase com teto seguro).
   */
  _getCurrentSpeed() {
    const baseSpeed = CONFIG.ENEMY_SPEED * this.speedMultiplier;
    if (this.state === ENEMY_STATE.EATEN) {
      return CONFIG.ENEMY_SPEED * CONFIG.ENEMY_EATEN_FACTOR;
    }
    if (this.state === ENEMY_STATE.FRIGHTENED) {
      return baseSpeed * CONFIG.ENEMY_FRIGHTENED_FACTOR;
    }
    return baseSpeed;
  }

  update(dt, player, redEnemy, waveState, frightenedRemaining) {
    if (this.state === ENEMY_STATE.FRIGHTENED) {
      if (frightenedRemaining <= 0) {
        this.state = waveState;
      }
      this._applyVisualState(frightenedRemaining);
    }

    if (this.releaseTimer > 0) {
      this.releaseTimer = Math.max(0, this.releaseTimer - dt);
      this.walkCycle += dt * CONFIG.WALK_CYCLE_SPEED * 0.7;
      this.mesh.position.y = 0;
      this.mesh.children[0].position.y =
        Math.abs(Math.sin(this.walkCycle)) * (CONFIG.WALK_BOUNCE_AMPLITUDE * 0.6);
      return;
    }

    const pos = this.mesh.position;
    const currentCell = worldToGrid(pos.x, pos.z);
    const cellCenter = gridToWorld(currentCell.col, currentCell.row);
    const cellKey = `${currentCell.col},${currentCell.row}`;

    const speed = this._getCurrentSpeed();
    const step = speed * dt;

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

    const reachedCenter =
      (distToCenter < CONFIG.CENTER_TOLERANCE || crossedCenterX || crossedCenterZ) &&
      movingTowardsOrAtCenter;

    if (reachedCenter && this.lastDecisionCellKey !== cellKey) {
      this.lastDecisionCellKey = cellKey;
      this.inHouse = isInsideEnemyHouse(currentCell.col, currentCell.row);

      if (
        this.state === ENEMY_STATE.EATEN &&
        currentCell.col === ENEMY_HOME_CENTER_CELL.col &&
        currentCell.row === ENEMY_HOME_CENTER_CELL.row
      ) {
        this.state = waveState;
        this.inHouse = true;
        this._applyVisualState(0);
      }

      pos.x = cellCenter.x;
      pos.z = cellCenter.z;

      const newDir = this._chooseNextDirection(
        currentCell.col,
        currentCell.row,
        player,
        redEnemy
      );
      this.currentDir = newDir;

      const consumedDist = Math.hypot(cellCenter.x - prevX, cellCenter.z - prevZ);
      const remainingStep = Math.max(0, step - consumedDist);
      pos.x += this.currentDir.x * remainingStep;
      pos.z += this.currentDir.z * remainingStep;
    } else {
      if (this.currentDir.x !== 0) {
        pos.x = nextX;
        pos.z = cellCenter.z;
      } else if (this.currentDir.z !== 0) {
        pos.x = cellCenter.x;
        pos.z = nextZ;
      }
    }

    this._handleTunnelWrap();

    const updatedCell = worldToGrid(pos.x, pos.z);
    this.gridCol = THREE.MathUtils.clamp(updatedCell.col, 0, GRID_COLS - 1);
    this.gridRow = updatedCell.row;

    if (this.currentDir.x !== 0 || this.currentDir.z !== 0) {
      this.targetRotationY = Math.atan2(-this.currentDir.x, -this.currentDir.z);
      const currentY = this.mesh.rotation.y;
      let diff = this.targetRotationY - currentY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.mesh.rotation.y += diff * Math.min(1, CONFIG.ROTATION_LERP_SPEED * dt);

      this.walkCycle += dt * CONFIG.WALK_CYCLE_SPEED;
    }

    this.mesh.position.y = 0;
    this.mesh.children[0].position.y =
      Math.abs(Math.sin(this.walkCycle)) * CONFIG.WALK_BOUNCE_AMPLITUDE;
  }

  _handleTunnelWrap() {
    const pos = this.mesh.position;
    const leftEdge = gridToWorld(0, this.gridRow).x - CONFIG.TILE_SIZE * 0.5;
    const rightEdge = gridToWorld(GRID_COLS - 1, this.gridRow).x + CONFIG.TILE_SIZE * 0.5;

    if (pos.x < leftEdge && getCellValue(0, this.gridRow) === CELL_TYPE.TUNNEL) {
      pos.x = rightEdge - 0.05;
      this.lastDecisionCellKey = '';
    } else if (
      pos.x > rightEdge &&
      getCellValue(GRID_COLS - 1, this.gridRow) === CELL_TYPE.TUNNEL
    ) {
      pos.x = leftEdge + 0.05;
      this.lastDecisionCellKey = '';
    }
  }
}

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.sharedEggGeo = this._createSharedEggGeometry();

    this.fragmentGeo = new THREE.DodecahedronGeometry(0.14, 0);
    this.fragmentGeo.scale(1.0, 0.45, 0.85);

    this.enemies = ENEMY_PROFILES.map(
      (profile) => new Enemy(this.scene, profile, this.sharedEggGeo)
    );
    this.redEnemy = this.enemies.find((e) => e.id === 'red');

    this.waveIndex = 0;
    this.waveTimer = 0;
    this.currentWaveState = CONFIG.AI_WAVE_TIMINGS[0].state;
    this.stageSpeedMultiplier = 1.0;

    this.activeBursts = [];
  }

  _createSharedEggGeometry() {
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

    const geo = new THREE.LatheGeometry(points, CONFIG.EGG_LATHE_SEGMENTS);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Calcula o multiplicador de velocidade dos inimigos (+5% por fase acima da Fase 1, limitado ao teto seguro).
   * @param {number} stageNumber Número da fase (1, 2, 3...)
   */
  setStageNumber(stageNumber) {
    const bonus = Math.max(0, stageNumber - 1) * CONFIG.ENEMY_STAGE_SPEED_INC;
    this.stageSpeedMultiplier = Math.min(
      CONFIG.ENEMY_MAX_SPEED_MULT,
      1.0 + bonus
    );
    for (const enemy of this.enemies) {
      enemy.speedMultiplier = this.stageSpeedMultiplier;
    }
  }

  /**
   * Reseta todos os 4 ovos inimigos para a base central.
   */
  resetAll(stageNumber = 1) {
    this.setStageNumber(stageNumber);
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.currentWaveState = CONFIG.AI_WAVE_TIMINGS[0].state;

    for (const enemy of this.enemies) {
      enemy.reset(this.currentWaveState, this.stageSpeedMultiplier);
    }
  }

  triggerFrightenedMode() {
    for (const enemy of this.enemies) {
      enemy.enterFrightened();
    }
  }

  spawnShellBreakParticles(position, shellColorHex = CONFIG.COLORS.SHELL_FRAGMENT) {
    const burstGroup = new THREE.Group();
    burstGroup.position.set(position.x, 0.8, position.z);

    const mat = new THREE.MeshStandardMaterial({
      color: shellColorHex,
      emissive: CONFIG.COLORS.SHELL_FRAGMENT,
      emissiveIntensity: 0.25,
      roughness: 0.35
    });

    const particles = [];
    const count = CONFIG.SHELL_PARTICLE_COUNT;

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.fragmentGeo, mat);
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const horizontalSpeed = 2.4 + Math.random() * 3.8;
      const verticalSpeed = 3.5 + Math.random() * 4.5;

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      burstGroup.add(mesh);

      particles.push({
        mesh,
        vx: Math.cos(angle) * horizontalSpeed,
        vy: verticalSpeed,
        vz: Math.sin(angle) * horizontalSpeed,
        rvx: (Math.random() - 0.5) * 14,
        rvy: (Math.random() - 0.5) * 14,
        rvz: (Math.random() - 0.5) * 14
      });
    }

    this.scene.add(burstGroup);
    this.activeBursts.push({
      group: burstGroup,
      material: mat,
      particles,
      elapsed: 0,
      duration: CONFIG.SHELL_PARTICLE_DURATION
    });
  }

  updateParticles(dt) {
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const burst = this.activeBursts[i];
      burst.elapsed += dt;

      const progress = burst.elapsed / burst.duration;
      if (progress >= 1.0) {
        this.scene.remove(burst.group);
        burst.material.dispose();
        this.activeBursts.splice(i, 1);
        continue;
      }

      const scale = Math.max(0.01, 1.0 - progress * 0.85);

      for (const p of burst.particles) {
        p.vy -= CONFIG.SHELL_PARTICLE_GRAVITY * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;

        if (p.mesh.position.y < -0.72) {
          p.mesh.position.y = -0.72;
          p.vy = Math.abs(p.vy) * 0.35;
        }

        p.mesh.rotation.x += p.rvx * dt;
        p.mesh.rotation.y += p.rvy * dt;
        p.mesh.rotation.z += p.rvz * dt;
        p.mesh.scale.setScalar(scale);
      }
    }
  }

  update(dt, player, frightenedRemaining) {
    if (frightenedRemaining <= 0) {
      this.waveTimer += dt;
      const currentWave = CONFIG.AI_WAVE_TIMINGS[this.waveIndex];
      if (currentWave && this.waveTimer >= currentWave.duration) {
        this.waveTimer = 0;
        this.waveIndex = Math.min(
          this.waveIndex + 1,
          CONFIG.AI_WAVE_TIMINGS.length - 1
        );
        this.currentWaveState = CONFIG.AI_WAVE_TIMINGS[this.waveIndex].state;
        for (const enemy of this.enemies) {
          enemy.syncWaveState(this.currentWaveState);
        }
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(
        dt,
        player,
        this.redEnemy,
        this.currentWaveState,
        frightenedRemaining
      );
    }

    this.updateParticles(dt);
  }
}
