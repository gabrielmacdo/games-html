import * as THREE from 'three';
import { CONFIG } from './config.js';
import { ARENA_GRID, ARENA_ROWS, ARENA_COLS } from './mapData.js';

/**
 * EGGFIRE - Gerador Procedural 3D da Arena 19x19 (Fase 2)
 * Utiliza THREE.InstancedMesh para todas as paredes e pilares (WALL_HEIGHT = 3.2, TILE_SIZE = 3.0)
 * garantindo 60 FPS constantes e único draw call para a geometria sólida.
 */
export class Arena {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.grid = ARENA_GRID;
    this.rows = ARENA_ROWS;
    this.cols = ARENA_COLS;
    this.tileSize = CONFIG.TILE_SIZE;
    this.wallHeight = CONFIG.WALL_HEIGHT;

    this.instancedWalls = null;
    this.floorMesh = null;
    this.ceilingGrid = null;

    this._buildFloor();
    this._buildInstancedWalls();
    this._buildAtmosphericCeiling();
  }

  /**
   * Retorna os metadados necessários para colisão (Player) e renderização do Radar
   */
  getArenaInfo() {
    return {
      grid: this.grid,
      rows: this.rows,
      cols: this.cols,
      tileSize: this.tileSize
    };
  }

  /**
   * Retorna os objetos 3D colidíveis pelo Raycaster dos tiros Hitscan
   */
  getShootableMeshes() {
    return [this.instancedWalls, this.floorMesh];
  }

  /**
   * Gera textura procedural limpa e de alto contraste espacial para o piso da arena 19x19
   */
  _createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fundo metálico escuro
    ctx.fillStyle = '#18202c';
    ctx.fillRect(0, 0, 512, 512);

    // Quadrantes sutis
    ctx.fillStyle = '#202a3a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillRect(256, 256, 256, 256);

    // Moldura técnica dourada suave por célula
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.18)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 506);

    // Cruz central discreta de referência
    ctx.strokeStyle = 'rgba(144, 224, 239, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(256, 220);
    ctx.lineTo(256, 292);
    ctx.moveTo(220, 256);
    ctx.lineTo(292, 256);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.cols, this.rows);
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Gera textura procedural de painel industrial/tático Egg-Arena para paredes e pilares
   */
  _createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base cinza-azulada clara para contraste com mira e tracers
    ctx.fillStyle = '#485468';
    ctx.fillRect(0, 0, 512, 512);

    // Painel interno chanfrado
    ctx.fillStyle = '#3b4556';
    ctx.fillRect(24, 54, 464, 404);

    // Faixa tática na altura dos olhos (EYE_HEIGHT = 1.35m) em branco/dourado para tingimento por instância
    ctx.fillStyle = '#f4b942';
    ctx.fillRect(0, 286, 512, 34);

    // Frisos escuros nas bordas da faixa
    ctx.fillStyle = '#1b2028';
    ctx.fillRect(0, 280, 512, 6);
    ctx.fillRect(0, 320, 512, 6);

    // Rodapé e cornija superior reforçados
    ctx.fillStyle = '#232934';
    ctx.fillRect(0, 0, 512, 46);
    ctx.fillRect(0, 462, 512, 50);

    // Bordas verticais de divisão de célula (3.0m)
    ctx.strokeStyle = '#1a1f28';
    ctx.lineWidth = 14;
    ctx.strokeRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  _buildFloor() {
    const totalWidth = this.cols * this.tileSize;
    const totalDepth = this.rows * this.tileSize;

    const floorGeo = new THREE.PlaneGeometry(totalWidth, totalDepth);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.MeshStandardMaterial({
      map: this._createFloorTexture(),
      roughness: 0.78,
      metalness: 0.15
    });

    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = 0;
    this.floorMesh.receiveShadow = true;
    this.floorMesh.name = 'arena-floor';
    this.scene.add(this.floorMesh);
  }

  _buildInstancedWalls() {
    const totalWidth = this.cols * this.tileSize;
    const totalDepth = this.rows * this.tileSize;
    const halfWidth = totalWidth / 2;
    const halfDepth = totalDepth / 2;

    // Conta quantas células sólidas existem na matriz 19x19
    let wallCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === 1) wallCount++;
      }
    }

    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    const wallMat = new THREE.MeshStandardMaterial({
      map: this._createWallTexture(),
      roughness: 0.6,
      metalness: 0.2
    });

    this.instancedWalls = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
    this.instancedWalls.castShadow = true;
    this.instancedWalls.receiveShadow = true;
    this.instancedWalls.name = 'arena-walls';

    const dummy = new THREE.Object3D();
    const colorOuter = new THREE.Color(0xd8e2f0);
    const colorPillar = new THREE.Color(0xffe29a); // Pilares internos levemente dourados para leitura espacial

    let idx = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== 1) continue;

        const worldX = c * this.tileSize - halfWidth + this.tileSize * 0.5;
        const worldZ = r * this.tileSize - halfDepth + this.tileSize * 0.5;

        dummy.position.set(worldX, this.wallHeight * 0.5, worldZ);
        dummy.updateMatrix();
        this.instancedWalls.setMatrixAt(idx, dummy.matrix);

        const isOuter = r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1;
        this.instancedWalls.setColorAt(idx, isOuter ? colorOuter : colorPillar);

        idx++;
      }
    }

    this.instancedWalls.instanceMatrix.needsUpdate = true;
    if (this.instancedWalls.instanceColor) {
      this.instancedWalls.instanceColor.needsUpdate = true;
    }

    this.scene.add(this.instancedWalls);
  }

  /**
   * Adiciona vigas luminosas sutis acima das paredes para reforçar a perspectiva de arena FPS
   */
  _buildAtmosphericCeiling() {
    const totalWidth = this.cols * this.tileSize;
    const gridHelper = new THREE.GridHelper(totalWidth, this.cols, 0xffb703, 0x223046);
    gridHelper.position.y = this.wallHeight + 0.02;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.22;
    this.ceilingGrid = gridHelper;
    this.scene.add(gridHelper);
  }
}
