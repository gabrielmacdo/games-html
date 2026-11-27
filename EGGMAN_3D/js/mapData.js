import { CONFIG } from './config.js';

/**
 * Codificação da Matriz do Labirinto (GRID[row][col]) conforme Seção 4.2:
 * 0: Corredor vazio
 * 1: Parede sólida (intransponível)
 * 2: Corredor com bolinha de ponto
 * 3: Corredor com moeda de poder / Egg Coin (4 cantos estratégicos)
 * 4: Portão da base dos inimigos (intransponível para o jogador; transponível para inimigos)
 * 5: Túnel de teletransporte lateral (wrap-around horizontal)
 */
export const CELL_TYPE = {
  EMPTY: 0,
  WALL: 1,
  DOT: 2,
  POWER_COIN: 3,
  ENEMY_GATE: 4,
  TUNNEL: 5
};

/**
 * Labirinto Clássico Simétrico 19 colunas x 21 linhas (100% livre de becos sem saída).
 * Moedas de Ovo (3) posicionadas nos 4 cantos estratégicos: (1,2), (17,2), (1,16), (17,16).
 */
export const INITIAL_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // row 0
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1], // row 1
  [1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 3, 1], // row 2
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // row 3
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], // row 4
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1], // row 5
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1], // row 6
  [1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1], // row 7
  [1, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 1], // row 8
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 4, 1, 1, 0, 1, 2, 1, 1, 1, 1], // row 9 (Portão 4 em col 9, row 9)
  [5, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 5], // row 10 (Túnel lateral 5 e interior da base)
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1], // row 11
  [1, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 1], // row 12
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1], // row 13
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1], // row 14
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1], // row 15
  [1, 3, 2, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 2, 3, 1], // row 16 (Spawn do Egg-Man em col 9, row 16)
  [1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1], // row 17
  [1, 2, 2, 1, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 1, 2, 2, 1], // row 18
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1], // row 19
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // row 20
];

export const GRID = INITIAL_GRID.map((row) => [...row]);

export const GRID_ROWS = GRID.length;
export const GRID_COLS = GRID[0].length;

// Célula inicial segura do Egg-Man
export const PLAYER_START_CELL = { col: 9, row: 16 };

// Coordenadas estratégicas da Base Central dos Inimigos
export const ENEMY_GATE_CELL = { col: 9, row: 9 };
export const ENEMY_OUTSIDE_CELL = { col: 9, row: 8 };
export const ENEMY_HOME_CENTER_CELL = { col: 9, row: 10 };

// Limites internos da base central dos inimigos
export const ENEMY_HOUSE_BOUNDS = {
  rowMin: 9,
  rowMax: 10,
  colMin: 8,
  colMax: 10
};

/**
 * Verifica se uma célula (col, row) fica dentro da caixa da base dos inimigos (incluindo o portão).
 */
export function isInsideEnemyHouse(col, row) {
  return (
    row >= ENEMY_HOUSE_BOUNDS.rowMin &&
    row <= ENEMY_HOUSE_BOUNDS.rowMax &&
    col >= ENEMY_HOUSE_BOUNDS.colMin &&
    col <= ENEMY_HOUSE_BOUNDS.colMax
  );
}

/**
 * Restaura a matriz GRID para o estado inicial completo (para reinício de fase).
 */
export function resetGridData() {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      GRID[row][col] = INITIAL_GRID[row][col];
    }
  }
}

/**
 * Converte coordenadas de matriz (col, row) para o centro exato da célula no mundo 3D (x, z).
 */
export function gridToWorld(col, row) {
  const halfCols = (GRID_COLS - 1) / 2;
  const halfRows = (GRID_ROWS - 1) / 2;

  return {
    x: (col - halfCols) * CONFIG.TILE_SIZE,
    z: (row - halfRows) * CONFIG.TILE_SIZE
  };
}

/**
 * Converte uma posição 3D (x, z) para a célula da matriz (col, row) mais próxima.
 */
export function worldToGrid(x, z) {
  const halfCols = (GRID_COLS - 1) / 2;
  const halfRows = (GRID_ROWS - 1) / 2;

  const col = Math.round(x / CONFIG.TILE_SIZE + halfCols);
  const row = Math.round(z / CONFIG.TILE_SIZE + halfRows);

  return { col, row };
}

/**
 * Retorna o valor de uma célula da matriz com tratamento de limites e wrap-around horizontal em túneis.
 */
export function getCellValue(col, row) {
  if (row < 0 || row >= GRID_ROWS) {
    return CELL_TYPE.WALL;
  }

  if (col < 0 || col >= GRID_COLS) {
    const wrappedCol = ((col % GRID_COLS) + GRID_COLS) % GRID_COLS;
    if (GRID[row][wrappedCol] === CELL_TYPE.TUNNEL) {
      return CELL_TYPE.TUNNEL;
    }
    return CELL_TYPE.WALL;
  }

  return GRID[row][col];
}

/**
 * Verifica se uma célula (col, row) é transitável pelo jogador (Egg-Man).
 */
export function isPlayerWalkable(col, row) {
  const cell = getCellValue(col, row);
  return cell !== CELL_TYPE.WALL && cell !== CELL_TYPE.ENEMY_GATE;
}

/**
 * Verifica se uma célula (col, row) é transitável por um ovo inimigo.
 * Inimigos podem atravessar o portão (4) quando estão saindo da base central
 * ou quando estão retornando à base no estado EATEN.
 * @param {number} col
 * @param {number} row
 * @param {boolean} canPassGate Se o inimigo tem permissão para cruzar o portão 4 neste momento
 * @returns {boolean}
 */
export function isEnemyWalkable(col, row, canPassGate = false) {
  const cell = getCellValue(col, row);
  if (cell === CELL_TYPE.WALL) return false;
  if (cell === CELL_TYPE.ENEMY_GATE) return canPassGate;
  return true;
}

/**
 * Verifica na inicialização se existe algum beco sem saída no labirinto.
 */
export function validateMazeTopology() {
  const deadEnds = [];
  const dirs = [
    { x: 0, z: -1 },
    { x: 0, z: 1 },
    { x: -1, z: 0 },
    { x: 1, z: 0 }
  ];

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (isInsideEnemyHouse(col, row) || !isPlayerWalkable(col, row)) {
        continue;
      }

      let walkableNeighbors = 0;
      for (const d of dirs) {
        if (isPlayerWalkable(col + d.x, row + d.z)) {
          walkableNeighbors++;
        }
      }

      if (walkableNeighbors < 2) {
        deadEnds.push({ col, row, neighbors: walkableNeighbors });
        console.warn(
          `[MazeTopology] Beco sem saída detectado na célula (Col ${col}, Row ${row}) com apenas ${walkableNeighbors} vizinho(s) transitável(is).`
        );
      }
    }
  }

  return deadEnds;
}
