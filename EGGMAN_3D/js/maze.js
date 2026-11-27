import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  INITIAL_GRID,
  GRID,
  GRID_ROWS,
  GRID_COLS,
  CELL_TYPE,
  gridToWorld,
  resetGridData
} from './mapData.js';

/**
 * Constrói proceduralmente o labirinto 3D:
 * - Piso e Paredes (THREE.InstancedMesh)
 * - Portão translúcido da base inimiga (célula 4)
 * - Bolinhas de Ponto (célula 2) otimizadas em um único THREE.InstancedMesh
 * - Moedas de Ovo / Power-Ups (célula 3) com rotação contínua no eixo Y
 */
export class Maze {
  constructor(scene) {
    this.scene = scene;
    this.mazeGroup = new THREE.Group();

    // Estruturas de controle dos coletáveis (sem recriar geometria a cada reset)
    this.dotIndexMap = new Map(); // chave "col,row" -> índice no InstancedMesh
    this.dotLocations = [];       // array de { col, row, x, z }
    this.dotInstancedMesh = null;

    this.coinMeshes = new Map();  // chave "col,row" -> THREE.Mesh da moeda
    this.totalCollectibles = 0;
    this.remainingCollectibles = 0;

    this._dummy = new THREE.Object3D();
    this._hiddenMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    this._buildFloor();
    this._buildWallsAndGates();
    this._buildCollectibles();

    this.scene.add(this.mazeGroup);
  }

  /**
   * Cria o piso sólido do labirinto cobrindo toda a extensão da matriz em Y = 0.
   */
  _buildFloor() {
    const floorWidth = GRID_COLS * CONFIG.TILE_SIZE;
    const floorDepth = GRID_ROWS * CONFIG.TILE_SIZE;

    const floorGeo = new THREE.PlaneGeometry(floorWidth, floorDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.FLOOR_BASE,
      roughness: 0.88,
      metalness: 0.05
    });

    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;

    this.mazeGroup.add(floorMesh);
  }

  /**
   * Instancia todas as paredes (célula 1) em um único THREE.InstancedMesh
   * e o portão da base inimiga (célula 4) com material translúcido.
   */
  _buildWallsAndGates() {
    const wallPositions = [];
    const gatePositions = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = INITIAL_GRID[row][col];
        const worldPos = gridToWorld(col, row);

        if (cell === CELL_TYPE.WALL) {
          wallPositions.push(worldPos);
        } else if (cell === CELL_TYPE.ENEMY_GATE) {
          gatePositions.push(worldPos);
        }
      }
    }

    const wallGeo = new THREE.BoxGeometry(
      CONFIG.TILE_SIZE,
      CONFIG.WALL_HEIGHT,
      CONFIG.TILE_SIZE
    );

    const wallMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.WALL_BASE,
      emissive: CONFIG.COLORS.WALL_EMISSIVE,
      roughness: 0.45,
      metalness: 0.15
    });

    const wallInstancedMesh = new THREE.InstancedMesh(
      wallGeo,
      wallMat,
      wallPositions.length
    );
    wallInstancedMesh.castShadow = true;
    wallInstancedMesh.receiveShadow = true;

    const wallCenterY = CONFIG.WALL_HEIGHT / 2;

    wallPositions.forEach((pos, index) => {
      this._dummy.position.set(pos.x, wallCenterY, pos.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      wallInstancedMesh.setMatrixAt(index, this._dummy.matrix);
    });

    wallInstancedMesh.instanceMatrix.needsUpdate = true;
    this.mazeGroup.add(wallInstancedMesh);

    if (gatePositions.length > 0) {
      const gateGeo = new THREE.BoxGeometry(
        CONFIG.TILE_SIZE,
        CONFIG.GATE_HEIGHT,
        CONFIG.TILE_SIZE * 0.35
      );

      const gateMat = new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.GATE_COLOR,
        emissive: CONFIG.COLORS.GATE_COLOR,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.65,
        roughness: 0.2,
        metalness: 0.1
      });

      gatePositions.forEach((pos) => {
        const gateMesh = new THREE.Mesh(gateGeo, gateMat);
        gateMesh.position.set(pos.x, CONFIG.GATE_HEIGHT / 2, pos.z);
        gateMesh.castShadow = false;
        gateMesh.receiveShadow = true;
        this.mazeGroup.add(gateMesh);
      });
    }
  }

  /**
   * Cria as Bolinhas de Ponto (célula 2, SphereGeometry raio 0.18 em Y = 0.4 via InstancedMesh)
   * e as Moedas de Ovo (célula 3, CylinderGeometry raio 0.45, espessura 0.12 em Y = 0.6).
   */
  _buildCollectibles() {
    const coinLocations = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = INITIAL_GRID[row][col];
        const worldPos = gridToWorld(col, row);
        const key = `${col},${row}`;

        if (cell === CELL_TYPE.DOT) {
          const idx = this.dotLocations.length;
          this.dotLocations.push({ col, row, x: worldPos.x, z: worldPos.z });
          this.dotIndexMap.set(key, idx);
        } else if (cell === CELL_TYPE.POWER_COIN) {
          coinLocations.push({ col, row, x: worldPos.x, z: worldPos.z, key });
        }
      }
    }

    // 1. Bolinhas de Ponto (THREE.SphereGeometry raio 0.18 em Y = 0.4)
    const dotGeo = new THREE.SphereGeometry(CONFIG.DOT_RADIUS, 12, 12);
    const dotMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.DOT_COLOR,
      emissive: CONFIG.COLORS.DOT_EMISSIVE,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.1
    });

    this.dotInstancedMesh = new THREE.InstancedMesh(
      dotGeo,
      dotMat,
      this.dotLocations.length
    );
    this.dotInstancedMesh.castShadow = true;
    this.dotInstancedMesh.receiveShadow = false;
    this.mazeGroup.add(this.dotInstancedMesh);

    // 2. Moedas de Ovo / Power-Ups (THREE.CylinderGeometry raio 0.45, espessura 0.12 em Y = 0.6)
    // Rotacionamos a geometria em 90° no eixo X para que a moeda fique em pé (como um disco vertical)
    // e gire continuamente em torno do eixo Y no loop principal.
    const coinGeo = new THREE.CylinderGeometry(
      CONFIG.COIN_RADIUS,
      CONFIG.COIN_RADIUS,
      CONFIG.COIN_THICKNESS,
      24
    );
    coinGeo.rotateX(Math.PI / 2);

    const coinMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.COIN_COLOR,
      emissive: CONFIG.COLORS.COIN_EMISSIVE,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.65
    });

    coinLocations.forEach((loc) => {
      const coinMesh = new THREE.Mesh(coinGeo, coinMat);
      coinMesh.position.set(loc.x, CONFIG.COIN_Y, loc.z);
      coinMesh.castShadow = true;
      this.mazeGroup.add(coinMesh);
      this.coinMeshes.set(loc.key, coinMesh);
    });

    this.totalCollectibles = this.dotLocations.length + coinLocations.length;
    this.resetCollectibles();
  }

  /**
   * Restaura todas as bolinhas e moedas de ovo para o início de uma nova fase
   * sem alocar novas geometrias ou materiais (zero memory leak).
   */
  resetCollectibles() {
    resetGridData();

    // Restaura matrizes de todas as bolinhas no InstancedMesh
    this.dotLocations.forEach((loc, index) => {
      this._dummy.position.set(loc.x, CONFIG.DOT_Y, loc.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      this.dotInstancedMesh.setMatrixAt(index, this._dummy.matrix);
    });
    this.dotInstancedMesh.instanceMatrix.needsUpdate = true;

    // Reexibe as 4 Moedas de Ovo
    for (const coinMesh of this.coinMeshes.values()) {
      coinMesh.visible = true;
      coinMesh.rotation.y = 0;
    }

    this.remainingCollectibles = this.totalCollectibles;
  }

  /**
   * Verifica se há um item coletável na célula (col, row) e o consome.
   * @param {number} col
   * @param {number} row
   * @returns {number | null} CELL_TYPE.DOT (2), CELL_TYPE.POWER_COIN (3) ou null se vazio
   */
  collectAtCell(col, row) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      return null;
    }

    const cell = GRID[row][col];
    if (cell !== CELL_TYPE.DOT && cell !== CELL_TYPE.POWER_COIN) {
      return null;
    }

    const key = `${col},${row}`;
    GRID[row][col] = CELL_TYPE.EMPTY;
    this.remainingCollectibles = Math.max(0, this.remainingCollectibles - 1);

    if (cell === CELL_TYPE.DOT) {
      const idx = this.dotIndexMap.get(key);
      if (idx !== undefined) {
        // Oculta a instância zerando sua escala na matriz
        this.dotInstancedMesh.setMatrixAt(idx, this._hiddenMatrix);
        this.dotInstancedMesh.instanceMatrix.needsUpdate = true;
      }
      return CELL_TYPE.DOT;
    }

    if (cell === CELL_TYPE.POWER_COIN) {
      const coinMesh = this.coinMeshes.get(key);
      if (coinMesh) {
        coinMesh.visible = false;
      }
      return CELL_TYPE.POWER_COIN;
    }

    return null;
  }

  /**
   * Atualiza a rotação contínua no eixo Y das Moedas de Ovo visíveis.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    for (const coinMesh of this.coinMeshes.values()) {
      if (coinMesh.visible) {
        coinMesh.rotation.y += CONFIG.COIN_ROTATION_SPEED * dt;
      }
    }
  }
}
