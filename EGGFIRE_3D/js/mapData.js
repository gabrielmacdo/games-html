import { CONFIG } from './config.js';

/**
 * EGGFIRE - Matriz Topológica da Arena 19x19 e Pontos Reservados (Fase 2)
 * Legenda da Matriz:
 *   1 = Parede externa ou pilar de cobertura sólido
 *   0 = Corredor / Pátio transitável
 *
 * Regra Topológica Estrita: ZERO becos sem saída!
 * Toda célula transitável (0) possui pelo menos 2 vizinhos ortogonais transitáveis (0).
 */

export const ARENA_GRID = [
  //0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], // 1
  [1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1], // 2
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], // 3
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 4
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 5
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1], // 6
  [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1], // 7
  [1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1], // 8
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], // 9 (Centro [9][9])
  [1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1], // 10
  [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1], // 11
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1], // 12
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 13
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 14
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], // 15
  [1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1], // 16
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1], // 17
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // 18
];

export const ARENA_ROWS = ARENA_GRID.length;
export const ARENA_COLS = ARENA_GRID[0].length;

// Ponto inicial do jogador no centro do pátio principal ([9][9])
export const PLAYER_SPAWN_CELL = { row: 9, col: 9 };

// Células reservadas para futuros Power-Ups (Fase 3)
export const POWERUP_SPAWN_CELLS = [
  { row: 4, col: 9, type: 'RIFLE' },
  { row: 14, col: 9, type: 'SHIELD' },
  { row: 9, col: 4, type: 'HEAL' },
  { row: 9, col: 14, type: 'HEAL' }
];

// Células reservadas para futuros Spawns de Ovos Inimigos (Fase 4)
export const ENEMY_SPAWN_CELLS = [
  { row: 1, col: 1 },
  { row: 1, col: 17 },
  { row: 17, col: 1 },
  { row: 17, col: 17 },
  { row: 4, col: 4 },
  { row: 4, col: 14 },
  { row: 14, col: 4 },
  { row: 14, col: 14 }
];

/**
 * Converte coordenadas de célula (row, col) para coordenadas de mundo (x, z)
 */
export function cellToWorld(row, col, tileSize = CONFIG.TILE_SIZE) {
  const halfWidth = (ARENA_COLS * tileSize) / 2;
  const halfDepth = (ARENA_ROWS * tileSize) / 2;
  return {
    x: col * tileSize - halfWidth + tileSize * 0.5,
    z: row * tileSize - halfDepth + tileSize * 0.5
  };
}

/**
 * Valida a topologia da arena 19x19 garantindo que não existam becos sem saída.
 * Toda célula transitável (0) deve possuir pelo menos 2 vizinhos ortogonais transitáveis (0).
 * @returns {{ valid: boolean, deadEnds: Array<{row: number, col: number, openNeighbors: number}> }}
 */
export function validateArenaTopology(grid = ARENA_GRID) {
  const rows = grid.length;
  const cols = grid[0].length;
  const deadEnds = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0) continue;

      let openNeighbors = 0;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0) {
          openNeighbors++;
        }
      }

      if (openNeighbors < 2) {
        deadEnds.push({ row: r, col: c, openNeighbors });
        console.warn(
          `[EGGFIRE Topology Warning] Beco sem saída detectado na célula (${r}, ${c}) com apenas ${openNeighbors} saída(s)!`
        );
      }
    }
  }

  if (deadEnds.length === 0) {
    console.info(`[EGGFIRE Topology] Arena ${rows}x${cols} validada com sucesso: 0 becos sem saída.`);
  }

  return {
    valid: deadEnds.length === 0,
    deadEnds
  };
}
