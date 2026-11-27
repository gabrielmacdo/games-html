import * as THREE from 'three';
import { CONFIG } from './config.js';
import { POWERUP_SPAWN_CELLS, cellToWorld } from './mapData.js';

/**
 * EGGFIRE - Sistema de Tiro Hitscan, Tracers, Faíscas e Power-Ups 3D Flutuantes (Fase 3)
 * - Disparo Hitscan instantâneo via THREE.Raycaster (Egg-Pistol 0.32s / Egg-Rifle 0.10s)
 * - Feixe luminoso (tracer) da ponta do cano até o ponto de impacto (~0.12s)
 * - Partículas de impacto rebatidas pela normal da superfície atingida
 * - Pedestais e Modelos 3D Temáticos Rotativos para os 3 Power-Ups:
 *   1. RIFLE  (Mini-Fuzil Dourado Estilizado)
 *   2. SHIELD (Cúpula / Escudo Energético Ciano Translúcido)
 *   3. HEAL   (Cápsula de Gema Dourada/Esmeralda com Cruz Verde)
 */
export class WeaponSystem {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('./player.js').Player} player
   * @param {import('./audio.js').SoundManager} audio
   */
  constructor(scene, camera, player, audio) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.audio = audio;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.near = 0.1;
    this.raycaster.far = 90;
    this.centerNDC = new THREE.Vector2(0, 0);

    // Listas de efeitos visuais temporários ativos
    this.activeTracers = [];
    this.activeSparks = [];
    this.activeImpactDecals = [];

    // Lista de Power-Ups 3D na arena
    this.powerUps = [];
    this.elapsedTime = 0;

    // Callback opcional para notificar coleta no HUD
    this.onPowerUpCollected = null;

    this.sparkGeo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    this.impactRingGeo = new THREE.RingGeometry(0.03, 0.085, 16);

    this._initArenaPowerUps();
  }

  /**
   * Instancia os Power-Ups 3D nas células definidas em POWERUP_SPAWN_CELLS
   */
  _initArenaPowerUps() {
    const pedestalGeo = new THREE.CylinderGeometry(0.55, 0.68, 0.14, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x222a38,
      roughness: 0.45,
      metalness: 0.7
    });

    POWERUP_SPAWN_CELLS.forEach((cellInfo, index) => {
      const worldPos = cellToWorld(cellInfo.row, cellInfo.col);
      const container = new THREE.Group();
      container.position.set(worldPos.x, 0, worldPos.z);

      // Pedestal metálico no piso
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.07;
      pedestal.receiveShadow = true;
      container.add(pedestal);

      // Anel luminoso na base do pedestal
      const themeColor = this._getPowerUpColor(cellInfo.type);
      const baseRingGeo = new THREE.RingGeometry(0.42, 0.54, 24);
      baseRingGeo.rotateX(-Math.PI / 2);
      const baseRingMat = new THREE.MeshBasicMaterial({
        color: themeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.position.y = 0.145;
      container.add(baseRing);

      // Modelo 3D Flutuante específico do tipo (RIFLE, SHIELD, HEAL)
      const itemGroup = this._createPowerUpModel(cellInfo.type);
      itemGroup.position.y = 1.05;
      container.add(itemGroup);

      this.scene.add(container);

      this.powerUps.push({
        id: index,
        type: cellInfo.type,
        row: cellInfo.row,
        col: cellInfo.col,
        x: worldPos.x,
        z: worldPos.z,
        active: true,
        respawnTimer: 0,
        phaseOffset: index * 1.5,
        container,
        itemGroup,
        baseRing
      });
    });
  }

  _getPowerUpColor(type) {
    switch (type) {
      case 'RIFLE':
        return CONFIG.COLORS.RIFLE_GOLD;
      case 'SHIELD':
        return CONFIG.COLORS.SHIELD_CYAN;
      case 'HEAL':
      default:
        return CONFIG.COLORS.HEAL_GREEN;
    }
  }

  /**
   * Constrói o modelo 3D temático para cada Power-Up
   * @param {'RIFLE'|'SHIELD'|'HEAL'} type
   * @returns {THREE.Group}
   */
  _createPowerUpModel(type) {
    const group = new THREE.Group();

    if (type === 'RIFLE') {
      // 1. Mini-Fuzil Dourado Flutuante em 3D + Aro Orbital Dourado
      const goldMat = new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.RIFLE_GOLD,
        roughness: 0.2,
        metalness: 0.85,
        emissive: 0x664400,
        emissiveIntensity: 0.45
      });
      const darkMetal = new THREE.MeshStandardMaterial({
        color: 0x222834,
        roughness: 0.35,
        metalness: 0.8
      });

      // Corpo do fuzil
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.15, 0.11), goldMat);
      group.add(receiver);

      // Cano alongado
      const barrelGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.45, 14);
      barrelGeo.rotateZ(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, darkMetal);
      barrel.position.set(0.38, 0.03, 0);
      group.add(barrel);

      // Freio de boca dourado
      const tipGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.08, 14);
      tipGeo.rotateZ(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, goldMat);
      tip.position.set(0.58, 0.03, 0);
      group.add(tip);

      // Coronha
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.09), darkMetal);
      stock.position.set(-0.36, -0.02, 0);
      group.add(stock);

      // Carregador inclinado
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.08), goldMat);
      mag.position.set(0.06, -0.17, 0);
      mag.rotation.z = 0.25;
      group.add(mag);

      // Luneta tática
      const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.24, 14);
      scopeGeo.rotateZ(Math.PI / 2);
      const scope = new THREE.Mesh(scopeGeo, goldMat);
      scope.position.set(-0.02, 0.13, 0);
      group.add(scope);

      // Aro energético dourado ao redor do fuzil
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffd166,
        transparent: true,
        opacity: 0.7
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.022, 12, 32), haloMat);
      group.add(halo);
    } else if (type === 'SHIELD') {
      // 2. Escudo / Cúpula Energética Ciano Translúcida
      const coreMat = new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.SHIELD_CYAN,
        roughness: 0.15,
        metalness: 0.3,
        emissive: 0x0088aa,
        emissiveIntensity: 0.65
      });

      const domeMat = new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.SHIELD_CYAN,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.42,
        emissive: 0x00aacc,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide
      });

      // Núcleo octaedro energético
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), coreMat);
      group.add(core);

      // Cúpula facetada translúcida
      const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), domeMat);
      group.add(dome);

      // Anel orbital ciano
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x90e0ef,
        transparent: true,
        opacity: 0.85
      });
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.024, 12, 32), ringMat);
      ring1.rotation.x = Math.PI / 3;
      group.add(ring1);
    } else {
      // 3. Cápsula de Gema (HEAL): Esfera Dourada Translúcida com Cruz Verde Brilhante
      const yolkSphereMat = new THREE.MeshStandardMaterial({
        color: 0xffb703,
        roughness: 0.2,
        metalness: 0.15,
        transparent: true,
        opacity: 0.55,
        emissive: 0x553300,
        emissiveIntensity: 0.3
      });

      const crossMat = new THREE.MeshStandardMaterial({
        color: 0x2ec4b6,
        roughness: 0.2,
        metalness: 0.2,
        emissive: 0x158078,
        emissiveIntensity: 0.75
      });

      const capsuleSphere = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), yolkSphereMat);
      group.add(capsuleSphere);

      // Cruz 3D Verde no centro da cápsula
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.48, 0.14), crossMat);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.14), crossMat);
      group.add(vBar);
      group.add(hBar);

      // Halo verde esmeralda
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x2ec4b6,
        transparent: true,
        opacity: 0.75
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.02, 10, 28), haloMat);
      group.add(halo);
    }

    return group;
  }

  /**
   * Retorna lista de power-ups para renderização de pontos táticos no Radar 2D
   */
  getPowerUpsStatus() {
    return this.powerUps;
  }

  /**
   * Reabastece imediatamente todos os Power-Ups da arena (chamado no início de partida e a cada nova Horda)
   */
  replenishAllPowerUps() {
    for (const p of this.powerUps) {
      p.active = true;
      p.respawnTimer = 0;
      p.itemGroup.visible = true;
      p.baseRing.material.opacity = 0.85;
    }
  }

  /**
   * Executa um disparo Hitscan a partir do centro da mira (NDC 0, 0)
   * contra paredes, piso e ovos inimigos ativos.
   *
   * @param {THREE.Object3D[]} arenaMeshes - Paredes e piso da arena
   * @param {'PISTOL'|'RIFLE'} weaponType
   * @param {import('./enemy.js').EnemyManager} [enemyManager]
   */
  handlePlayerShoot(arenaMeshes, weaponType = 'PISTOL', enemyManager = null) {
    // 1. Som de tiro de acordo com a arma ativa
    if (this.audio) {
      if (weaponType === 'RIFLE') {
        this.audio.playRifleShot();
      } else {
        this.audio.playPistolShot();
      }
    }

    // 2. Posição global exata da ponta do cano do viewmodel ativo
    this.camera.updateMatrixWorld(true);
    const muzzleWorldPos = this.player.getMuzzleWorldPosition();

    // 3. Combina paredes/piso com as hitboxes dos inimigos vivos
    const enemyHitboxes = enemyManager ? enemyManager.getEnemyHitboxes() : [];
    const allTargets = [...arenaMeshes, ...enemyHitboxes];

    // 4. Raycast do centro exato da tela (NDC: 0, 0)
    this.raycaster.setFromCamera(this.centerNDC, this.camera);
    const hits = this.raycaster.intersectObjects(allTargets, false);

    let targetPoint;
    if (hits.length > 0) {
      const hit = hits[0];
      targetPoint = hit.point.clone();

      const worldNormal = new THREE.Vector3(0, 1, 0);
      if (hit.face) {
        worldNormal.copy(hit.face.normal);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        worldNormal.applyMatrix3(normalMatrix).normalize();
      }

      // Verifica se o objeto mais próximo atingido é um Ovo Inimigo
      if (hit.object.userData && hit.object.userData.enemy && enemyManager) {
        const damage = weaponType === 'RIFLE' ? CONFIG.RIFLE.DAMAGE : CONFIG.PISTOL.DAMAGE;
        enemyManager.damageEnemy(hit.object.userData.enemy, damage, targetPoint, worldNormal);
        this._spawnImpactSparks(targetPoint, worldNormal, weaponType);
      } else {
        this._spawnImpactSparks(targetPoint, worldNormal, weaponType);
        this._spawnImpactFlash(targetPoint, worldNormal, weaponType);

        if (this.audio) {
          this.audio.playWallImpact(hit.distance);
        }
      }
    } else {
      targetPoint = new THREE.Vector3();
      this.raycaster.ray.at(60, targetPoint);
    }

    // 5. Cria o feixe luminoso (tracer) da boca do cano até o ponto de impacto
    this._spawnTracer(muzzleWorldPos, targetPoint, weaponType);
  }

  _spawnTracer(startPos, endPos, weaponType) {
    const distance = startPos.distanceTo(endPos);
    if (distance < 0.15) return;

    const radius = weaponType === 'RIFLE' ? 0.017 : 0.013;
    const tracerGeo = new THREE.CylinderGeometry(radius, radius * 1.35, distance, 6);
    tracerGeo.rotateX(Math.PI / 2);

    const tracerMat = new THREE.MeshBasicMaterial({
      color: weaponType === 'RIFLE' ? 0xffb703 : 0xffe066,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    const tracerMesh = new THREE.Mesh(tracerGeo, tracerMat);
    const midPoint = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    tracerMesh.position.copy(midPoint);
    tracerMesh.lookAt(endPos);

    this.scene.add(tracerMesh);
    this.activeTracers.push({
      mesh: tracerMesh,
      age: 0,
      maxLife: 0.12
    });
  }

  _spawnImpactSparks(point, normal, weaponType) {
    const sparkCount = weaponType === 'RIFLE' ? 14 : 10;
    const spawnOrigin = point.clone().addScaledVector(normal, 0.03);

    for (let i = 0; i < sparkCount; i++) {
      const isGold = i % 2 === 0;
      const mat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xffb703 : 0xffffff,
        transparent: true,
        opacity: 1.0
      });

      const sparkMesh = new THREE.Mesh(this.sparkGeo, mat);
      sparkMesh.position.copy(spawnOrigin);

      const spreadX = (Math.random() - 0.5) * 3.8;
      const spreadY = Math.random() * 2.8 + 0.5;
      const spreadZ = (Math.random() - 0.5) * 3.8;

      const velocity = new THREE.Vector3(
        normal.x * (2.6 + Math.random() * 2.5) + spreadX,
        normal.y * (2.6 + Math.random() * 2.5) + spreadY,
        normal.z * (2.6 + Math.random() * 2.5) + spreadZ
      );

      this.scene.add(sparkMesh);
      this.activeSparks.push({
        mesh: sparkMesh,
        velocity,
        age: 0,
        maxLife: 0.22 + Math.random() * 0.14
      });
    }
  }

  _spawnImpactFlash(point, normal, weaponType) {
    const mat = new THREE.MeshBasicMaterial({
      color: weaponType === 'RIFLE' ? 0xff9f1c : 0xffb703,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const ringMesh = new THREE.Mesh(this.impactRingGeo, mat);
    ringMesh.position.copy(point).addScaledVector(normal, 0.015);

    const lookTarget = ringMesh.position.clone().add(normal);
    ringMesh.lookAt(lookTarget);

    this.scene.add(ringMesh);
    this.activeImpactDecals.push({
      mesh: ringMesh,
      age: 0,
      maxLife: 0.32
    });
  }

  /**
   * Atualiza rotação/levitação dos Power-Ups, verifica coleta radial (< 1.1m) e atualiza partículas
   * @param {number} dt
   */
  update(dt) {
    this.elapsedTime += dt;

    // 1. Atualiza Power-Ups 3D na Arena e verifica proximidade com o jogador
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const pickupRadiusSq = CONFIG.POWERUPS.PICKUP_RADIUS * CONFIG.POWERUPS.PICKUP_RADIUS;

    for (const p of this.powerUps) {
      if (p.active) {
        // Rotação contínua no eixo Y e levitação senoidal suave
        p.itemGroup.rotation.y += dt * 2.2;
        p.itemGroup.position.y = 1.05 + Math.sin(this.elapsedTime * 3.2 + p.phaseOffset) * 0.14;

        // Checa distância radial no plano XZ (< 1.1)
        const dx = px - p.x;
        const dz = pz - p.z;
        if (dx * dx + dz * dz < pickupRadiusSq) {
          this._collectPowerUp(p);
        }
      } else {
        // Contagem regressiva para respawn (~18s)
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.active = true;
          p.itemGroup.visible = true;
          p.baseRing.material.opacity = 0.85;
        }
      }
    }

    // 2. Atualiza Tracers (~0.12s)
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      const t = this.activeTracers[i];
      t.age += dt;
      const progress = t.age / t.maxLife;

      if (progress >= 1) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.activeTracers.splice(i, 1);
      } else {
        t.mesh.material.opacity = 1 - progress;
        const scale = 1 - progress * 0.65;
        t.mesh.scale.set(scale, scale, 1);
      }
    }

    // 3. Atualiza Faíscas de Impacto com gravidade
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const s = this.activeSparks[i];
      s.age += dt;
      const progress = s.age / s.maxLife;

      if (progress >= 1) {
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
        this.activeSparks.splice(i, 1);
      } else {
        s.velocity.y -= 13.5 * dt;
        s.mesh.position.addScaledVector(s.velocity, dt);
        s.mesh.rotation.x += 10 * dt;
        s.mesh.rotation.y += 12 * dt;
        s.mesh.material.opacity = 1 - progress;
        const sc = 1 - progress * 0.5;
        s.mesh.scale.setScalar(sc);
      }
    }

    // 4. Atualiza Anéis de Impacto na parede
    for (let i = this.activeImpactDecals.length - 1; i >= 0; i--) {
      const d = this.activeImpactDecals[i];
      d.age += dt;
      const progress = d.age / d.maxLife;

      if (progress >= 1) {
        this.scene.remove(d.mesh);
        d.mesh.material.dispose();
        this.activeImpactDecals.splice(i, 1);
      } else {
        d.mesh.material.opacity = (1 - progress) * 0.85;
        d.mesh.scale.setScalar(1 + progress * 0.6);
      }
    }
  }

  /**
   * Aplica o efeito do Power-Up coletado no jogador e inicia o timer de respawn (18s)
   */
  _collectPowerUp(p) {
    p.active = false;
    p.respawnTimer = CONFIG.POWERUPS.RESPAWN_TIME;
    p.itemGroup.visible = false;
    p.baseRing.material.opacity = 0.2;

    let label = '';
    if (p.type === 'RIFLE') {
      this.player.activateRifle(CONFIG.RIFLE.DURATION);
      if (this.audio) this.audio.playPowerUpPickup('RIFLE');
      label = '🔥 EGG-RIFLE AUTOMÁTICO ATIVO (10s)';
    } else if (p.type === 'SHIELD') {
      this.player.activateShield(CONFIG.POWERUPS.SHIELD_DURATION);
      if (this.audio) this.audio.playPowerUpPickup('SHIELD');
      label = '🛡️ ESCUDO ENERGÉTICO CIANO ATIVO (10s)';
    } else if (p.type === 'HEAL') {
      const healed = this.player.heal(CONFIG.POWERUPS.HEAL_AMOUNT);
      if (this.audio) this.audio.playHealPickup();
      label = healed > 0 ? `💚 CÁPSULA DE GEMA: +${healed} HP RESTAURADOS` : '💚 VIDA MÁXIMA (100 HP)';
    }

    if (typeof this.onPowerUpCollected === 'function') {
      this.onPowerUpCollected(p.type, label);
    }
  }
}
