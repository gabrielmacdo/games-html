import * as THREE from 'three';
import { CONFIG, getWaveScaling } from './config.js';
import { ENEMY_SPAWN_CELLS, cellToWorld } from './mapData.js';

/**
 * EGGFIRE - Ovos Inimigos Armados, IA por Centros de Célula + Unstuck Steering,
 * Texturas Reais de Rachadura na Casca e Escalonamento Balanceado por Horda (Fase 4+)
 */

/**
 * Gera a malha paramétrica de um Ovo 3D via THREE.LatheGeometry
 * Visual mantido em ENEMY_RADIUS = 0.65 e ENEMY_HEIGHT = 1.60
 */
function createEggLatheGeometry(radius = CONFIG.ENEMY_RADIUS, height = CONFIG.ENEMY_HEIGHT) {
  const points = [];
  const segments = 24;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = t * Math.PI;

    const y = (1 - Math.cos(theta)) * 0.5 * height;
    const taper = 1.0 - 0.22 * Math.pow(t, 1.4);
    const r = Math.sin(theta) * radius * taper;

    points.push(new THREE.Vector2(Math.max(0.001, r), y));
  }

  const geo = new THREE.LatheGeometry(points, 24);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Desenha uma rede de rachadura ramificada em zigue-zague diretamente no Canvas 2D
 * com suporte a múltiplos galhos laterais e espessura reforçada (4px a 7px+)
 */
function drawJaggedCrack(ctx, startX, startY, length, baseAngle, segments, strokeColor, lineWidth, glowColor = null) {
  let x = startX;
  let y = startY;
  const stepLen = length / segments;

  ctx.save();
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x, y);

  for (let i = 0; i < segments; i++) {
    const jitterAngle = baseAngle + ((i % 2 === 0 ? 1 : -1) * 0.38) + (Math.random() - 0.5) * 0.45;
    x += Math.cos(jitterAngle) * stepLen;
    y += Math.sin(jitterAngle) * stepLen;
    ctx.lineTo(x, y);

    // Galhos laterais ramificados em cada nó intermediário
    if (i >= 1 && i < segments - 1) {
      const side = i % 2 === 0 ? 1 : -1;
      const branchAngle = jitterAngle + side * (0.72 + Math.random() * 0.25);
      const branchLen = stepLen * (1.25 + (i % 3) * 0.35);
      const bx1 = x + Math.cos(branchAngle) * (branchLen * 0.55);
      const by1 = y + Math.sin(branchAngle) * (branchLen * 0.55);
      const bx2 = bx1 + Math.cos(branchAngle - side * 0.45) * (branchLen * 0.55);
      const by2 = by1 + Math.sin(branchAngle - side * 0.45) * (branchLen * 0.55);

      ctx.moveTo(x, y);
      ctx.lineTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.moveTo(x, y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Gera as 3 variações de THREE.CanvasTexture compartilhadas em memória (zero overhead):
 * - stage 0: Casca Intacta (HP >= 65%)
 * - stage 1: Rachadura Estágio 1 (HP < 65%) — 7 redes ramificadas distribuídas de 0 a canvas.width (360° da LatheGeometry)
 * - stage 2: Rachadura Crítica (HP < 35%) — 8 redes densas cobrindo 360° com borda alaranjada/brilhante (4px a 7px+)
 * @param {0|1|2} stage
 * @returns {THREE.CanvasTexture}
 */
function createSharedShellTexture(stage = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 1. Gradiente vertical suave de casca de ovo com sombreamento orgânico na base e topo
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#fff3d6');
  grad.addColorStop(0.45, '#ffe8c2');
  grad.addColorStop(0.82, '#edd0a3');
  grad.addColorStop(1.0, '#d8b98e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Textura sutil de poros naturais da casca
  ctx.fillStyle = 'rgba(160, 115, 65, 0.08)';
  for (let i = 0; i < 220; i++) {
    const px = (i * 73) % 512;
    const py = (i * 137) % 512;
    ctx.fillRect(px, py, 3, 3);
  }

  // 2. Rachadura Estágio 1 (HP < 65%): 7 redes de rachaduras distribuídas uniformemente de X=25 a X=490 (cobrindo 360°)
  if (stage >= 1) {
    const rootsStage1 = [
      { x: 28,  y: 115, len: 235, ang: 1.48 },
      { x: 96,  y: 155, len: 225, ang: 1.62 },
      { x: 168, y: 110, len: 245, ang: 1.52 },
      { x: 242, y: 140, len: 230, ang: 1.58 },
      { x: 316, y: 115, len: 240, ang: 1.46 },
      { x: 392, y: 150, len: 225, ang: 1.65 },
      { x: 468, y: 120, len: 235, ang: 1.54 }
    ];

    for (const r of rootsStage1) {
      // Borda de relevo clara ao lado da trinca (7px)
      drawJaggedCrack(ctx, r.x + 2, r.y + 2, r.len, r.ang, 8, 'rgba(255, 252, 240, 0.72)', 7.0);
      // Fissura escura profunda da casca quebrada (5px)
      drawJaggedCrack(ctx, r.x, r.y, r.len, r.ang, 8, '#1d110a', 5.0);
    }

    // Anel horizontal irregular interligando as rachaduras na altura do peito/costas (360°)
    drawJaggedCrack(ctx, 10, 235, 492, 0.02, 12, 'rgba(255, 252, 240, 0.6)', 6.0);
    drawJaggedCrack(ctx, 10, 235, 492, 0.02, 12, '#1d110a', 4.5);
  }

  // 3. Rachadura Crítica Estágio 2 (HP < 35%): 8 redes densas cobrindo 360° com brilho interno de gema
  if (stage >= 2) {
    const rootsStage2 = [
      { x: 18,  y: 95,  len: 280, ang: 1.55 },
      { x: 82,  y: 130, len: 265, ang: 1.45 },
      { x: 146, y: 90,  len: 285, ang: 1.60 },
      { x: 210, y: 125, len: 270, ang: 1.50 },
      { x: 274, y: 95,  len: 280, ang: 1.58 },
      { x: 338, y: 130, len: 265, ang: 1.48 },
      { x: 404, y: 90,  len: 285, ang: 1.62 },
      { x: 472, y: 120, len: 275, ang: 1.52 }
    ];

    for (const r of rootsStage2) {
      // Halo incandescente laranja-avermelhado da gema interna (7px)
      drawJaggedCrack(ctx, r.x, r.y, r.len, r.ang, 9, '#ff4800', 7.0, '#ff9f1c');
      // Fissura interna dourada brilhante (4.8px)
      drawJaggedCrack(ctx, r.x, r.y, r.len, r.ang, 9, '#ffd166', 4.8);
      // Centro escuro de ruptura (2.4px)
      drawJaggedCrack(ctx, r.x, r.y, r.len, r.ang, 9, '#160a04', 2.4);
    }

    // Duas faixas transversais incandescentes cruzando todos os 360° da casca
    drawJaggedCrack(ctx, 8, 195, 496, 0.05, 14, '#ff4800', 6.8, '#ff9f1c');
    drawJaggedCrack(ctx, 8, 195, 496, 0.05, 14, '#ffd166', 4.2);
    drawJaggedCrack(ctx, 8, 305, 496, -0.04, 14, '#ff4800', 6.5, '#ff9f1c');
    drawJaggedCrack(ctx, 8, 305, 496, -0.04, 14, '#ffd166', 4.0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

export class EnemyManager {
  /**
   * @param {THREE.Scene} scene
   * @param {object} arenaInfo - ({ grid, rows, cols, tileSize })
   * @param {THREE.Object3D} wallMesh - InstancedMesh das paredes para checagem de Line-of-Sight
   * @param {import('./player.js').Player} player
   * @param {import('./audio.js').SoundManager} audio
   */
  constructor(scene, arenaInfo, wallMesh, player, audio) {
    this.scene = scene;
    this.arenaInfo = arenaInfo;
    this.wallMesh = wallMesh;
    this.player = player;
    this.audio = audio;

    this.enemies = [];
    this.projectiles = [];
    this.shatterEffects = [];
    this.hitSparks = [];

    this.score = 0;
    this.currentWave = 1;
    this.waveScaling = getWaveScaling(1);

    // Callbacks para o HUD / main.js
    this.onPlayerHitCallback = null;     // (damage, absorbedByShield) => void
    this.onEnemyKilledCallback = null;   // (score, activeCount, wave) => void

    // Geometrias compartilhadas
    this.eggGeo = createEggLatheGeometry(CONFIG.ENEMY_RADIUS, CONFIG.ENEMY_HEIGHT);
    this.projectileGeo = new THREE.SphereGeometry(CONFIG.ENEMY.PROJECTILE_RADIUS, 14, 12);
    this.projectileCoreGeo = new THREE.SphereGeometry(CONFIG.ENEMY.PROJECTILE_RADIUS * 0.58, 10, 8);
    this.fragmentGeo = new THREE.DodecahedronGeometry(0.14, 0);
    this.yolkGeo = new THREE.SphereGeometry(0.28, 16, 14);
    this.sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);

    // 3 Texturas de Casca compartilhadas em memória (0: Intacta, 1: Rachada <65%, 2: Crítica <35%)
    this.shellTextures = [
      createSharedShellTexture(0),
      createSharedShellTexture(1),
      createSharedShellTexture(2)
    ];

    this.losRaycaster = new THREE.Raycaster();
  }

  /**
   * Limpa todos os inimigos e projéteis atuais da cena e reinicia na Horda 1 com score zerado
   */
  resetForNewGame() {
    for (const e of this.enemies) {
      if (e.root) this.scene.remove(e.root);
    }
    this.enemies = [];

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this._removeProjectile(i);
    }

    this.score = 0;
    this.spawnWave(1);
  }

  /**
   * Inicia uma onda específica aplicando o escalonamento balanceado de quantidade, velocidade e dano
   * @param {number} waveNumber
   */
  spawnWave(waveNumber = 1) {
    // Remove inimigos antigos já derrotados da lista para não acumular referências
    for (const e of this.enemies) {
      if (e.root) this.scene.remove(e.root);
    }
    this.enemies = [];

    this.currentWave = Math.max(1, Math.floor(waveNumber));
    this.waveScaling = getWaveScaling(this.currentWave);

    const count = this.waveScaling.enemyCount;
    for (let i = 0; i < count; i++) {
      const cell = ENEMY_SPAWN_CELLS[i % ENEMY_SPAWN_CELLS.length];
      // Pequeno offset caso mais de 8 inimigos dividam células de spawn em ondas altas (>= Onda 6)
      const ringOffset = i >= ENEMY_SPAWN_CELLS.length ? 0.45 : 0;
      this.spawnEnemyAtCell(cell.row, cell.col, i, ringOffset);
    }
  }

  /**
   * Compatibilidade com chamadas diretas de squad inicial
   */
  spawnInitialSquad() {
    this.spawnWave(this.currentWave);
  }

  /**
   * Cria um ovo inimigo completo na célula (row, col)
   */
  spawnEnemyAtCell(row, col, id = 0, offset = 0) {
    const worldPos = cellToWorld(row, col, this.arenaInfo.tileSize);
    const root = new THREE.Group();
    root.position.set(worldPos.x + offset, 0, worldPos.z + offset);

    // 1. Corpo do Ovo (LatheGeometry) com textura de casca intacta (estágio 0)
    const shellMat = new THREE.MeshStandardMaterial({
      map: this.shellTextures[0],
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.08
    });
    const bodyMesh = new THREE.Mesh(this.eggGeo, shellMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    root.add(bodyMesh);

    // 2. Viseira Tática Escura + Fita Laser Vermelha Frontal (+Z local é a frente do inimigo)
    const visorGroup = new THREE.Group();
    const visorMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.ENEMY_VISOR,
      roughness: 0.2,
      metalness: 0.8
    });
    const visorGeo = new THREE.BoxGeometry(0.76, 0.22, 0.36);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 1.05, 0.36);
    visorGroup.add(visorMesh);

    const eyeGlowMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.ENEMY_LASER
    });
    const eyeGlowGeo = new THREE.BoxGeometry(0.58, 0.065, 0.04);
    const eyeGlowMesh = new THREE.Mesh(eyeGlowGeo, eyeGlowMat);
    eyeGlowMesh.position.set(0, 1.05, 0.545);
    visorGroup.add(eyeGlowMesh);

    // Cinto tático na cintura do ovo
    const beltMat = new THREE.MeshStandardMaterial({
      color: 0x262c36,
      roughness: 0.5,
      metalness: 0.6
    });
    const beltGeo = new THREE.CylinderGeometry(0.61, 0.63, 0.13, 22);
    const beltMesh = new THREE.Mesh(beltGeo, beltMat);
    beltMesh.position.set(0, 0.68, 0);
    visorGroup.add(beltMesh);

    root.add(visorGroup);

    // 3. Pistola 3D Tática apontada para frente (+Z local) na lateral direita do ovo
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.58, 0.78, 0.25);

    const gunMetalMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.GUN_METAL,
      roughness: 0.35,
      metalness: 0.8
    });
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.42), gunMetalMat);
    gunBody.position.set(0, 0, 0.12);
    gunGroup.add(gunBody);

    const barrelGeo = new THREE.CylinderGeometry(0.036, 0.04, 0.28, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const gunBarrel = new THREE.Mesh(barrelGeo, gunMetalMat);
    gunBarrel.position.set(0, 0.03, 0.38);
    gunGroup.add(gunBarrel);

    // Esfera de aviso de disparo (Charge Telegraph 0.35s) na boca da arma do inimigo
    const chargeMat = new THREE.MeshBasicMaterial({
      color: 0xff9f1c,
      transparent: true,
      opacity: 0.0
    });
    const chargeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), chargeMat);
    chargeSphere.position.set(0, 0.03, 0.54);
    chargeSphere.visible = false;
    gunGroup.add(chargeSphere);

    root.add(gunGroup);

    // 4. Barra de Vida Flutuante (Billboard acima do ovo)
    const hpBarObj = this._createFloatingHealthBar();
    hpBarObj.group.position.set(0, CONFIG.ENEMY_HEIGHT + 0.34, 0);
    root.add(hpBarObj.group);

    this.scene.add(root);

    // Escolhe a primeira célula vizinha transitável como waypoint inicial
    const firstNextCell = this._pickNextPatrolCell(row, col, row, col);
    const firstWaypoint = cellToWorld(firstNextCell.row, firstNextCell.col, this.arenaInfo.tileSize);

    const enemy = {
      id,
      root,
      bodyMesh,
      shellMat,
      crackStage: 0,
      eyeGlowMesh,
      chargeSphere,
      hpBar: hpBarObj,
      hp: CONFIG.ENEMY.MAX_HP,
      maxHp: CONFIG.ENEMY.MAX_HP,
      alive: true,
      state: 'PATROL', // 'PATROL' | 'CHASE' | 'ATTACK'
      yaw: Math.atan2(firstWaypoint.x - worldPos.x, firstWaypoint.z - worldPos.z),
      prevCell: { row, col },
      targetCell: firstNextCell,
      waypointPos: new THREE.Vector3(firstWaypoint.x, 0, firstWaypoint.z),
      moveDir: new THREE.Vector2(0, 1),
      steeringAngleOffset: 0,
      steeringRecoveryTimer: 0,
      lastKnownPlayerPos: null,
      losCheckTimer: Math.random() * 0.14,
      hasLineOfSight: false,
      fireCooldown: 0.8 + Math.random() * 0.8,
      chargeTimer: 0,
      isCharging: false,
      strafeSign: Math.random() < 0.5 ? 1 : -1,
      strafeSwitchTimer: 1.5 + Math.random() * 1.5,
      hitFlashTimer: 0,
      hpBarVisibleTimer: 0
    };

    bodyMesh.userData.enemy = enemy;
    this.enemies.push(enemy);
    return enemy;
  }

  /**
   * Cria uma discreta barra de vida 3D flutuante acima do inimigo
   */
  _createFloatingHealthBar() {
    const group = new THREE.Group();
    const width = 0.92;
    const height = 0.11;

    const bgGeo = new THREE.PlaneGeometry(width + 0.06, height + 0.05);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x0d1117,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    group.add(bgMesh);

    const fillGeo = new THREE.PlaneGeometry(width, height);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xff3b30,
      side: THREE.DoubleSide
    });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.position.z = 0.01;
    group.add(fillMesh);

    group.visible = false;
    return { group, fillMesh, maxWidth: width };
  }

  getEnemyHitboxes() {
    const list = [];
    for (const e of this.enemies) {
      if (e.alive) list.push(e.bodyMesh);
    }
    return list;
  }

  getActiveEnemies() {
    return this.enemies.filter((e) => e.alive);
  }

  /**
   * Aplica dano Hitscan a um ovo inimigo, atualiza a textura de rachadura da casca e verifica quebra total
   */
  damageEnemy(enemy, damage, hitPoint, hitNormal) {
    if (!enemy || !enemy.alive) return;

    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlashTimer = 0.11;
    enemy.hpBarVisibleTimer = 4.0;
    enemy.shellMat.emissive.setHex(0x883300);
    enemy.shellMat.emissiveIntensity = 0.75;

    // Ao ser atingido, o inimigo registra a posição do jogador e avança pelo grid
    enemy.lastKnownPlayerPos = this.player.position.clone();
    if (enemy.state === 'PATROL') {
      enemy.state = 'CHASE';
      this._assignChaseCellWaypoint(enemy);
    }

    this._spawnShellHitChips(hitPoint, hitNormal);

    // Atualiza a CanvasTexture compartilhada de rachadura na casca (< 65% e < 35%)
    const hpRatio = enemy.hp / enemy.maxHp;
    let newStage = 0;
    if (hpRatio < 0.35) {
      newStage = 2;
    } else if (hpRatio < 0.65) {
      newStage = 1;
    }

    if (newStage !== enemy.crackStage) {
      enemy.crackStage = newStage;
      enemy.shellMat.map = this.shellTextures[newStage];
      enemy.shellMat.needsUpdate = true;
    }

    // Atualiza preenchimento da barra de vida flutuante
    const clampedRatio = Math.max(0.001, hpRatio);
    enemy.hpBar.fillMesh.scale.x = clampedRatio;
    enemy.hpBar.fillMesh.position.x = -((1 - clampedRatio) * enemy.hpBar.maxWidth) * 0.5;
    if (hpRatio < 0.35) {
      enemy.hpBar.fillMesh.material.color.setHex(0xff9f1c);
    }

    if (enemy.hp <= 0) {
      this._shatterEnemy(enemy);
    } else if (this.audio) {
      this.audio.playShellHit();
    }
  }

  _spawnShellHitChips(point, normal) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? CONFIG.COLORS.EGG_SHELL : CONFIG.COLORS.EGG_YOLK,
        transparent: true,
        opacity: 1.0
      });
      const chip = new THREE.Mesh(this.sparkGeo, mat);
      chip.position.copy(point).addScaledVector(normal, 0.04);

      const vel = new THREE.Vector3(
        normal.x * 2.8 + (Math.random() - 0.5) * 3.5,
        Math.random() * 3.2 + 0.8,
        normal.z * 2.8 + (Math.random() - 0.5) * 3.5
      );

      this.scene.add(chip);
      this.hitSparks.push({
        mesh: chip,
        velocity: vel,
        age: 0,
        maxLife: 0.32
      });
    }
  }

  /**
   * Explode o ovo inimigo derrotado em 15 fragmentos 3D de casca com gravidade + gema central (~0.9s)
   * Pontuação escalonada: 100 * wave
   */
  _shatterEnemy(enemy) {
    enemy.alive = false;
    this.scene.remove(enemy.root);

    if (this.audio) {
      this.audio.playShellShatter();
    }

    this.score += this.waveScaling.killScore;
    if (typeof this.onEnemyKilledCallback === 'function') {
      this.onEnemyKilledCallback(this.score, this.getActiveEnemies().length, this.currentWave);
    }

    const origin = enemy.root.position.clone();
    origin.y += 0.85;

    const pieces = [];

    for (let i = 0; i < CONFIG.ENEMY.SHATTER_FRAGMENTS; i++) {
      const fragMat = new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.ENEMY_SHELL,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 1.0
      });

      const fragMesh = new THREE.Mesh(this.fragmentGeo, fragMat);
      fragMesh.scale.set(
        0.8 + Math.random() * 0.9,
        0.4 + Math.random() * 0.5,
        0.8 + Math.random() * 0.9
      );
      fragMesh.position.set(
        origin.x + (Math.random() - 0.5) * 0.5,
        origin.y + (Math.random() - 0.5) * 0.6,
        origin.z + (Math.random() - 0.5) * 0.5
      );

      const angle = (i / CONFIG.ENEMY.SHATTER_FRAGMENTS) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 2.8 + Math.random() * 4.2;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        2.6 + Math.random() * 3.8,
        Math.sin(angle) * speed
      );

      const rotSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14
      );

      this.scene.add(fragMesh);
      pieces.push({ mesh: fragMesh, velocity, rotSpeed, isYolk: false });
    }

    const yolkMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.EGG_YOLK,
      roughness: 0.2,
      metalness: 0.15,
      emissive: 0xff8800,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 1.0
    });
    const yolkMesh = new THREE.Mesh(this.yolkGeo, yolkMat);
    yolkMesh.position.copy(origin);
    this.scene.add(yolkMesh);

    pieces.push({
      mesh: yolkMesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 1.2, 3.8, (Math.random() - 0.5) * 1.2),
      rotSpeed: new THREE.Vector3(3, 5, 2),
      isYolk: true
    });

    this.shatterEffects.push({
      pieces,
      age: 0,
      maxLife: CONFIG.ENEMY.SHATTER_DURATION
    });
  }

  /**
   * Converte posição de mundo (x, z) para índices da célula na matriz (row, col)
   */
  _worldToCell(x, z) {
    const { rows, cols, tileSize } = this.arenaInfo;
    const halfWidth = (cols * tileSize) / 2;
    const halfDepth = (rows * tileSize) / 2;
    return {
      col: Math.max(0, Math.min(cols - 1, Math.floor((x + halfWidth) / tileSize))),
      row: Math.max(0, Math.min(rows - 1, Math.floor((z + halfDepth) / tileSize)))
    };
  }

  /**
   * Retorna todas as células vizinhas ortogonais transitáveis (grid[r][c] === 0)
   */
  _getOpenNeighborCells(row, col) {
    const { grid, rows, cols } = this.arenaInfo;
    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    const list = [];
    for (const d of dirs) {
      const nr = row + d.dr;
      const nc = col + d.dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
        list.push({ row: nr, col: nc });
      }
    }
    return list;
  }

  /**
   * Escolhe a próxima célula vizinha livre para PATROL, evitando voltar à célula anterior
   */
  _pickNextPatrolCell(currRow, currCol, prevRow, prevCol) {
    const neighbors = this._getOpenNeighborCells(currRow, currCol);
    if (neighbors.length === 0) {
      return { row: currRow, col: currCol };
    }

    if (neighbors.length > 1) {
      const forwardCandidates = neighbors.filter(
        (n) => !(n.row === prevRow && n.col === prevCol)
      );
      if (forwardCandidates.length > 0) {
        return forwardCandidates[Math.floor(Math.random() * forwardCandidates.length)];
      }
    }

    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  /**
   * Escolhe a próxima célula vizinha livre que mais aproxima o inimigo do objetivo em CHASE
   * garantindo navegação pelo centro exato das células (sem cortar diagonais em quinas)
   */
  _pickNextChaseCell(currRow, currCol, prevRow, prevCol, goalX, goalZ) {
    const neighbors = this._getOpenNeighborCells(currRow, currCol);
    if (neighbors.length === 0) {
      return { row: currRow, col: currCol };
    }

    // Prioriza células que não sejam um recuo imediato, a menos que seja a única opção
    let pool = neighbors;
    if (neighbors.length > 1) {
      const nonBacktrack = neighbors.filter((n) => !(n.row === prevRow && n.col === prevCol));
      if (nonBacktrack.length > 0) {
        pool = nonBacktrack;
      }
    }

    let bestCell = pool[0];
    let bestDistSq = Infinity;

    for (const candidate of pool) {
      const pos = cellToWorld(candidate.row, candidate.col, this.arenaInfo.tileSize);
      const dx = goalX - pos.x;
      const dz = goalZ - pos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestCell = candidate;
      }
    }

    return bestCell;
  }

  /**
   * Atualiza o waypoint do inimigo para o centro exato da próxima célula livre em PATROL
   */
  _assignPatrolCellWaypoint(enemy) {
    const curr = this._worldToCell(enemy.root.position.x, enemy.root.position.z);
    const nextCell = this._pickNextPatrolCell(
      curr.row,
      curr.col,
      enemy.prevCell.row,
      enemy.prevCell.col
    );
    enemy.prevCell = curr;
    enemy.targetCell = nextCell;
    const wp = cellToWorld(nextCell.row, nextCell.col, this.arenaInfo.tileSize);
    enemy.waypointPos.set(wp.x, 0, wp.z);
  }

  /**
   * Atualiza o waypoint do inimigo para o centro exato da próxima célula livre em CHASE
   */
  _assignChaseCellWaypoint(enemy) {
    const curr = this._worldToCell(enemy.root.position.x, enemy.root.position.z);
    const goal = enemy.lastKnownPlayerPos || this.player.position;
    const nextCell = this._pickNextChaseCell(
      curr.row,
      curr.col,
      enemy.prevCell.row,
      enemy.prevCell.col,
      goal.x,
      goal.z
    );
    enemy.prevCell = curr;
    enemy.targetCell = nextCell;
    const wp = cellToWorld(nextCell.row, nextCell.col, this.arenaInfo.tileSize);
    enemy.waypointPos.set(wp.x, 0, wp.z);
  }

  /**
   * Verifica se há Linha de Visão (Line of Sight) desobstruída entre o inimigo e o jogador (< 22m)
   */
  _checkLineOfSight(enemy) {
    const ex = enemy.root.position.x;
    const ez = enemy.root.position.z;
    const px = this.player.position.x;
    const pz = this.player.position.z;

    const dx = px - ex;
    const dz = pz - ez;
    const dist = Math.hypot(dx, dz);

    if (dist > CONFIG.ENEMY.LOS_MAX_DIST) return false;
    if (dist < 0.5) return true;

    const origin = new THREE.Vector3(ex, 1.05, ez);
    const target = new THREE.Vector3(px, CONFIG.EYE_HEIGHT * 0.85, pz);
    const dir = target.clone().sub(origin).normalize();

    this.losRaycaster.set(origin, dir);
    this.losRaycaster.near = 0.2;
    this.losRaycaster.far = dist - 0.3;

    const wallHits = this.losRaycaster.intersectObject(this.wallMesh, false);
    return wallHits.length === 0;
  }

  /**
   * Depenetração Radial Circle-vs-AABB (2 iterações de solver na vizinhança 3x3)
   * usando o raio físico reduzido ENEMY_COLLISION_RADIUS = 0.48
   */
  _resolveEnemyCircleAABB(candidateX, candidateZ) {
    const { grid, rows, cols, tileSize } = this.arenaInfo;
    const r = CONFIG.ENEMY_COLLISION_RADIUS;
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

              if (minPen === penLeft) nextX = minX - r;
              else if (minPen === penRight) nextX = maxX + r;
              else if (minPen === penTop) nextZ = minZ - r;
              else nextZ = maxZ + r;
            }
          }
        }
      }
    }

    return { x: nextX, z: nextZ };
  }

  /**
   * Unstuck Steering: Avalia qual lado (+65° ou -65°) possui maior espaço aberto sem colisão
   */
  _chooseOpenSteeringAngle(x, z, dirX, dirZ) {
    const angleRad = (65 * Math.PI) / 180;
    const probeDist = 0.85;

    // Testa +65°
    const cosP = Math.cos(angleRad);
    const sinP = Math.sin(angleRad);
    const dirPX = dirX * cosP - dirZ * sinP;
    const dirPZ = dirX * sinP + dirZ * cosP;
    const candPX = x + dirPX * probeDist;
    const candPZ = z + dirPZ * probeDist;
    const resP = this._resolveEnemyCircleAABB(candPX, candPZ);
    const moveP = Math.hypot(resP.x - x, resP.z - z);

    // Testa -65°
    const cosN = Math.cos(-angleRad);
    const sinN = Math.sin(-angleRad);
    const dirNX = dirX * cosN - dirZ * sinN;
    const dirNZ = dirX * sinN + dirZ * cosN;
    const candNX = x + dirNX * probeDist;
    const candNZ = z + dirNZ * probeDist;
    const resN = this._resolveEnemyCircleAABB(candNX, candNZ);
    const moveN = Math.hypot(resN.x - x, resN.z - z);

    return moveP >= moveN ? angleRad : -angleRad;
  }

  /**
   * Dispara uma esfera de energia/gema brilhante com velocidade moderada (14 unidades/s)
   * Dano escalonado pela onda atual (com teto de 35 HP)
   */
  _fireEnemyProjectile(enemy) {
    enemy.root.updateMatrixWorld(true);
    const muzzlePos = new THREE.Vector3();
    enemy.chargeSphere.getWorldPosition(muzzlePos);

    const targetPos = new THREE.Vector3(
      this.player.position.x,
      CONFIG.EYE_HEIGHT - 0.12,
      this.player.position.z
    );

    const direction = targetPos.sub(muzzlePos).normalize();

    const projGroup = new THREE.Group();
    projGroup.position.copy(muzzlePos);

    const outerMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.ENEMY_PLASMA,
      transparent: true,
      opacity: 0.72
    });
    const outerMesh = new THREE.Mesh(this.projectileGeo, outerMat);
    projGroup.add(outerMesh);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0
    });
    const coreMesh = new THREE.Mesh(this.projectileCoreGeo, coreMat);
    projGroup.add(coreMesh);

    this.scene.add(projGroup);

    const distToPlayer = muzzlePos.distanceTo(this.player.position);
    if (this.audio) {
      this.audio.playEnemyFire(distToPlayer);
    }

    this.projectiles.push({
      mesh: projGroup,
      velocity: direction.multiplyScalar(CONFIG.ENEMY.PROJECTILE_SPEED),
      damage: this.waveScaling.projectileDamage,
      age: 0,
      maxLife: 4.5
    });
  }

  _isPointInsideWall(x, z) {
    const { grid, rows, cols, tileSize } = this.arenaInfo;
    const halfWidth = (cols * tileSize) / 2;
    const halfDepth = (rows * tileSize) / 2;

    const col = Math.floor((x + halfWidth) / tileSize);
    const row = Math.floor((z + halfDepth) / tileSize);

    if (row < 0 || row >= rows || col < 0 || col >= cols) return true;
    return grid[row][col] === 1;
  }

  /**
   * Atualiza IA dos inimigos, navegação por centros de célula, Unstuck Steering, projéteis e explosões
   * @param {number} dt
   */
  update(dt) {
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const speedMult = this.waveScaling.speedMultiplier;

    const patrolSpeed = CONFIG.ENEMY.PATROL_SPEED * speedMult;
    const chaseSpeed = CONFIG.ENEMY.CHASE_SPEED * speedMult;
    const strafeSpeed = CONFIG.ENEMY.STRAFE_SPEED * speedMult;

    // =========================================================================
    // 1. ATUALIZA OVOS INIMIGOS (IA: PATROL, CHASE, ATTACK)
    // =========================================================================
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0) {
          enemy.shellMat.emissive.setHex(0x000000);
          enemy.shellMat.emissiveIntensity = 0;
        }
      }

      // Checa Linha de Visão (Line of Sight) em intervalos curtos (0.14s)
      enemy.losCheckTimer -= dt;
      if (enemy.losCheckTimer <= 0) {
        enemy.losCheckTimer = 0.14;
        const hadLOS = enemy.hasLineOfSight;
        enemy.hasLineOfSight = this._checkLineOfSight(enemy);

        if (enemy.hasLineOfSight) {
          enemy.state = 'ATTACK';
          enemy.lastKnownPlayerPos = new THREE.Vector3(px, 0, pz);
        } else if (hadLOS && enemy.state === 'ATTACK') {
          // Acabou de perder linha de visão: entra em CHASE mirando o centro da próxima célula
          enemy.state = 'CHASE';
          this._assignChaseCellWaypoint(enemy);
        }
      }

      const ex = enemy.root.position.x;
      const ez = enemy.root.position.z;
      const dxToPlayer = px - ex;
      const dzToPlayer = pz - ez;
      const distToPlayer = Math.hypot(dxToPlayer, dzToPlayer);

      // Visibilidade e orientação Billboard da barra de vida flutuante
      if (enemy.hpBarVisibleTimer > 0) {
        enemy.hpBarVisibleTimer -= dt;
      }
      const showHpBar =
        enemy.hp < enemy.maxHp || enemy.hpBarVisibleTimer > 0 || (enemy.hasLineOfSight && distToPlayer < 16);
      enemy.hpBar.group.visible = showHpBar;
      if (showHpBar) {
        enemy.hpBar.group.lookAt(this.player.camera.position);
      }

      let moveVX = 0;
      let moveVZ = 0;
      let desiredYaw = enemy.yaw;

      if (enemy.state === 'ATTACK') {
        // Olha diretamente para o jogador
        desiredYaw = Math.atan2(dxToPlayer, dzToPlayer);

        enemy.strafeSwitchTimer -= dt;
        if (enemy.strafeSwitchTimer <= 0) {
          enemy.strafeSwitchTimer = 1.4 + Math.random() * 1.4;
          enemy.strafeSign *= -1;
        }

        const dirX = dxToPlayer / (distToPlayer || 1);
        const dirZ = dzToPlayer / (distToPlayer || 1);
        const strafeX = -dirZ * enemy.strafeSign;
        const strafeZ = dirX * enemy.strafeSign;

        let radialSpeed = 0;
        if (distToPlayer > CONFIG.ENEMY.PREFERRED_MAX_DIST) {
          radialSpeed = chaseSpeed * 0.75;
        } else if (distToPlayer < CONFIG.ENEMY.PREFERRED_MIN_DIST) {
          radialSpeed = -patrolSpeed * 0.7;
        }

        moveVX = dirX * radialSpeed + strafeX * strafeSpeed;
        moveVZ = dirZ * radialSpeed + strafeZ * strafeSpeed;

        // Lógica de Disparo com Brilho de Aviso (0.35s Charge Telegraph)
        if (!enemy.isCharging) {
          enemy.fireCooldown -= dt;
          if (enemy.fireCooldown <= 0) {
            enemy.isCharging = true;
            enemy.chargeTimer = CONFIG.ENEMY.CHARGE_TIME;
            enemy.chargeSphere.visible = true;
          }
        } else {
          enemy.chargeTimer -= dt;
          const chargeProgress = 1 - Math.max(0, enemy.chargeTimer / CONFIG.ENEMY.CHARGE_TIME);
          enemy.chargeSphere.material.opacity = 0.4 + chargeProgress * 0.6;
          const sc = 0.6 + chargeProgress * 0.9;
          enemy.chargeSphere.scale.setScalar(sc);

          if (enemy.chargeTimer <= 0) {
            enemy.isCharging = false;
            enemy.chargeSphere.visible = false;
            enemy.fireCooldown = CONFIG.ENEMY.FIRE_COOLDOWN + Math.random() * 0.45;
            if (enemy.hasLineOfSight) {
              this._fireEnemyProjectile(enemy);
            }
          }
        }
      } else if (enemy.state === 'CHASE') {
        enemy.isCharging = false;
        enemy.chargeSphere.visible = false;

        if (!enemy.lastKnownPlayerPos) {
          enemy.state = 'PATROL';
          this._assignPatrolCellWaypoint(enemy);
        } else {
          // Distância até a última posição conhecida do jogador
          const totalDistToGoal = Math.hypot(
            enemy.lastKnownPlayerPos.x - ex,
            enemy.lastKnownPlayerPos.z - ez
          );

          if (totalDistToGoal < 0.85) {
            // Chegou na última célula conhecida do jogador: retoma patrulha
            enemy.state = 'PATROL';
            this._assignPatrolCellWaypoint(enemy);
          } else {
            // Navega mirando o centro exato da próxima célula livre do grid (waypointPos)
            const dxWP = enemy.waypointPos.x - ex;
            const dzWP = enemy.waypointPos.z - ez;
            const distWP = Math.hypot(dxWP, dzWP);

            if (distWP < 0.28) {
              this._assignChaseCellWaypoint(enemy);
            }

            const ndx = enemy.waypointPos.x - ex;
            const ndz = enemy.waypointPos.z - ez;
            const ndist = Math.hypot(ndx, ndz) || 1;

            moveVX = (ndx / ndist) * chaseSpeed;
            moveVZ = (ndz / ndist) * chaseSpeed;
            desiredYaw = Math.atan2(moveVX, moveVZ);
          }
        }
      } else {
        // Estado PATROL: mira o centro exato da próxima célula livre do grid
        enemy.isCharging = false;
        enemy.chargeSphere.visible = false;

        const dxWP = enemy.waypointPos.x - ex;
        const dzWP = enemy.waypointPos.z - ez;
        const distWP = Math.hypot(dxWP, dzWP);

        if (distWP < 0.25) {
          this._assignPatrolCellWaypoint(enemy);
        }

        const ndx = enemy.waypointPos.x - ex;
        const ndz = enemy.waypointPos.z - ez;
        const ndist = Math.hypot(ndx, ndz) || 1;

        moveVX = (ndx / ndist) * patrolSpeed;
        moveVZ = (ndz / ndist) * patrolSpeed;
        desiredYaw = Math.atan2(moveVX, moveVZ);
      }

      // Aplica desvio ativo de Unstuck Steering (±65°) caso esteja contornando uma quina
      if (enemy.steeringRecoveryTimer > 0) {
        enemy.steeringRecoveryTimer -= dt;
        const cosS = Math.cos(enemy.steeringAngleOffset);
        const sinS = Math.sin(enemy.steeringAngleOffset);
        const rotVX = moveVX * cosS - moveVZ * sinS;
        const rotVZ = moveVX * sinS + moveVZ * cosS;
        moveVX = rotVX;
        moveVZ = rotVZ;
        if (enemy.state !== 'ATTACK') {
          desiredYaw = Math.atan2(moveVX, moveVZ);
        }
      }

      // Deslocamento pretendido no frame
      const prevX = enemy.root.position.x;
      const prevZ = enemy.root.position.z;
      const intendedStepX = moveVX * dt;
      const intendedStepZ = moveVZ * dt;
      const intendedDist = Math.hypot(intendedStepX, intendedStepZ);

      const resolved = this._resolveEnemyCircleAABB(
        prevX + intendedStepX,
        prevZ + intendedStepZ
      );

      const actualDist = Math.hypot(resolved.x - prevX, resolved.z - prevZ);

      // Unstuck Steering (Desvio Automático de Quina):
      // Se o deslocamento real após depenetração for menor que 35% da distância pretendida,
      // rotaciona o vetor de direção em ±65° em direção ao lado aberto
      if (intendedDist > 0.001 && actualDist < intendedDist * 0.35) {
        const normDirX = intendedStepX / intendedDist;
        const normDirZ = intendedStepZ / intendedDist;
        const steerAngle = this._chooseOpenSteeringAngle(prevX, prevZ, normDirX, normDirZ);

        enemy.steeringAngleOffset = steerAngle;
        enemy.steeringRecoveryTimer = 0.28;

        // Aplica imediatamente o passo rotacionado neste mesmo frame para não perder velocidade
        const cosA = Math.cos(steerAngle);
        const sinA = Math.sin(steerAngle);
        const steeredX = (normDirX * cosA - normDirZ * sinA) * intendedDist;
        const steeredZ = (normDirX * sinA + normDirZ * cosA) * intendedDist;
        const steeredResolved = this._resolveEnemyCircleAABB(prevX + steeredX, prevZ + steeredZ);

        enemy.root.position.x = steeredResolved.x;
        enemy.root.position.z = steeredResolved.z;

        // Se ainda assim estiver bloqueado em PATROL/CHASE, recalcula célula vizinha aberta
        if (
          enemy.state !== 'ATTACK' &&
          Math.hypot(steeredResolved.x - prevX, steeredResolved.z - prevZ) < intendedDist * 0.2
        ) {
          enemy.prevCell = { row: -1, col: -1 };
          if (enemy.state === 'CHASE') {
            this._assignChaseCellWaypoint(enemy);
          } else {
            this._assignPatrolCellWaypoint(enemy);
          }
        }
      } else {
        enemy.root.position.x = resolved.x;
        enemy.root.position.z = resolved.z;
      }

      // Rotação angular suave do corpo do ovo para a direção desejada
      const angleDiff = Math.atan2(
        Math.sin(desiredYaw - enemy.yaw),
        Math.cos(desiredYaw - enemy.yaw)
      );
      enemy.yaw += angleDiff * Math.min(1, dt * 10);
      enemy.root.rotation.y = enemy.yaw;
    }

    // Separação suave entre inimigos usando o raio físico ENEMY_COLLISION_RADIUS
    this._resolveEnemyToEnemySeparation();

    // =========================================================================
    // 2. ATUALIZA PROJÉTEIS DOS INIMIGOS (14 unidades/s, desviáveis)
    // =========================================================================
    const hitDistSq = Math.pow(CONFIG.PLAYER_RADIUS + CONFIG.ENEMY.PROJECTILE_RADIUS, 2);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;

      if (p.age >= p.maxLife) {
        this._removeProjectile(i);
        continue;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);
      const pos = p.mesh.position;

      // 2.1. Colisão contra paredes ou piso da arena
      if (pos.y <= 0.05 || this._isPointInsideWall(pos.x, pos.z)) {
        this._spawnProjectileImpactSparks(pos, 0xff9f1c);
        this._removeProjectile(i);
        continue;
      }

      // 2.2. Colisão contra o Jogador no plano XZ
      const dx = pos.x - px;
      const dz = pos.z - pz;
      if (dx * dx + dz * dz < hitDistSq) {
        const dmg = p.damage || this.waveScaling.projectileDamage;
        const damagedHp = this.player.takeDamage(dmg);
        if (damagedHp) {
          this._spawnProjectileImpactSparks(pos, 0xff3b30);
          if (this.audio) this.audio.playPlayerHurt();
        } else {
          this._spawnProjectileImpactSparks(pos, CONFIG.COLORS.SHIELD_CYAN);
          if (this.audio) this.audio.playShieldDeflect();
        }

        if (typeof this.onPlayerHitCallback === 'function') {
          this.onPlayerHitCallback(dmg, !damagedHp);
        }

        this._removeProjectile(i);
      }
    }

    // =========================================================================
    // 3. ATUALIZA EXPLOSÕES DE QUEBRA DE CASCA (15 fragmentos + gema central)
    // =========================================================================
    for (let i = this.shatterEffects.length - 1; i >= 0; i--) {
      const fx = this.shatterEffects[i];
      fx.age += dt;
      const progress = fx.age / fx.maxLife;

      if (progress >= 1) {
        for (const piece of fx.pieces) {
          this.scene.remove(piece.mesh);
          piece.mesh.material.dispose();
        }
        this.shatterEffects.splice(i, 1);
      } else {
        for (const piece of fx.pieces) {
          piece.velocity.y -= 14.5 * dt;
          piece.mesh.position.addScaledVector(piece.velocity, dt);

          if (piece.mesh.position.y < 0.08) {
            piece.mesh.position.y = 0.08;
            piece.velocity.y = Math.abs(piece.velocity.y) * 0.35;
            piece.velocity.x *= 0.75;
            piece.velocity.z *= 0.75;
          }

          piece.mesh.rotation.x += piece.rotSpeed.x * dt;
          piece.mesh.rotation.y += piece.rotSpeed.y * dt;
          piece.mesh.rotation.z += piece.rotSpeed.z * dt;
          piece.mesh.material.opacity = 1 - Math.pow(progress, 1.5);
        }
      }
    }

    // 4. Atualiza lascas de casca de impactos parciais
    for (let i = this.hitSparks.length - 1; i >= 0; i--) {
      const s = this.hitSparks[i];
      s.age += dt;
      const progress = s.age / s.maxLife;

      if (progress >= 1) {
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
        this.hitSparks.splice(i, 1);
      } else {
        s.velocity.y -= 13.0 * dt;
        s.mesh.position.addScaledVector(s.velocity, dt);
        s.mesh.material.opacity = 1 - progress;
      }
    }
  }

  _resolveEnemyToEnemySeparation() {
    const minSep = CONFIG.ENEMY_COLLISION_RADIUS * 2.15;
    const minSepSq = minSep * minSep;

    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;

      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;

        const dx = b.root.position.x - a.root.position.x;
        const dz = b.root.position.z - a.root.position.z;
        const distSq = dx * dx + dz * dz;

        if (distSq > 1e-6 && distSq < minSepSq) {
          const dist = Math.sqrt(distSq);
          const overlap = (minSep - dist) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;

          const resA = this._resolveEnemyCircleAABB(
            a.root.position.x - nx * overlap,
            a.root.position.z - nz * overlap
          );
          const resB = this._resolveEnemyCircleAABB(
            b.root.position.x + nx * overlap,
            b.root.position.z + nz * overlap
          );

          a.root.position.x = resA.x;
          a.root.position.z = resA.z;
          b.root.position.x = resB.x;
          b.root.position.z = resB.z;
        }
      }
    }
  }

  _spawnProjectileImpactSparks(pos, colorHex) {
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1.0
      });
      const spark = new THREE.Mesh(this.sparkGeo, mat);
      spark.position.copy(pos);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4.5,
        Math.random() * 3.0,
        (Math.random() - 0.5) * 4.5
      );

      this.scene.add(spark);
      this.hitSparks.push({
        mesh: spark,
        velocity: vel,
        age: 0,
        maxLife: 0.25
      });
    }
  }

  _removeProjectile(index) {
    const p = this.projectiles[index];
    this.scene.remove(p.mesh);
    p.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.dispose();
      }
    });
    this.projectiles.splice(index, 1);
  }
}
