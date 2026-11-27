/**
 * EGGFIRE - Especificações de Escala, Física, Armas, Power-Ups, Inimigos,
 * Escalonamento de Hordas e Persistência localStorage (Fase 5 Final)
 */

const STORAGE_KEYS = {
  HIGH_SCORE: 'eggfire_high_score',
  MAX_WAVE: 'eggfire_max_wave',
  SETTINGS: 'eggfire_settings'
};

export const WEAPON_SKINS = {
  tactical: {
    id: 'tactical',
    label: 'Aço Tático',
    shellColor: 0xfff5dc,
    accentColor: 0xffb703,
    metalColor: 0x2b303a,
    gloveColor: 0xffffff
  },
  imperial: {
    id: 'imperial',
    label: 'Ouro Imperial',
    shellColor: 0xffe082,
    accentColor: 0xff9f1c,
    metalColor: 0x6b4e00,
    gloveColor: 0xffd166
  },
  plasma: {
    id: 'plasma',
    label: 'Ciano Plasma',
    shellColor: 0xd8f8ff,
    accentColor: 0x00e5ff,
    metalColor: 0x182b3a,
    gloveColor: 0x90e0ef
  },
  yolk: {
    id: 'yolk',
    label: 'Camuflagem Gema',
    shellColor: 0xffb703,
    accentColor: 0xff5400,
    metalColor: 0x231b12,
    gloveColor: 0xffe5b4
  }
};

export const CONFIG = {
  // 2. Sistema de Coordenadas, Escala e Proporções
  TILE_SIZE: 3.0,               // Largura/profundidade de cada célula da matriz
  WALL_HEIGHT: 3.2,             // Paredes altas fechando a visão entre corredores
  EYE_HEIGHT: 1.35,             // Altura da câmera do Egg-Man em 1ª pessoa
  PLAYER_RADIUS: 0.55,          // Raio cilíndrico de colisão do jogador
  ENEMY_RADIUS: 0.65,           // Raio visual do ovo inimigo (LatheGeometry)
  ENEMY_COLLISION_RADIUS: 0.48, // Raio físico reduzido para navegação fluida nos corredores de 3.0m
  ENEMY_HEIGHT: 1.60,           // Altura paramétrica LatheGeometry do ovo inimigo

  // 3. Física, Saúde e Movimentação do Jogador
  PLAYER_MAX_HP: 100,         // Saúde máxima do Egg-Man (100 HP padrão)
  PLAYER_SPEED: 7.5,          // Velocidade de deslocamento no plano XZ (unidades/s)
  MOUSE_SENSITIVITY: 0.0022,  // Sensibilidade base de rotação yaw/pitch
  TOUCH_SENSITIVITY: 0.0044,  // Sensibilidade base de arrasto de mira touch
  PITCH_LIMIT: Math.PI / 4,   // Limite vertical da câmera (-45° a +45°)
  FOV: 75,                    // Campo de visão em graus

  // 4.1. Arma Base: Egg-Pistol (Munição Infinita)
  PISTOL: {
    NAME: 'EGG-PISTOL',
    COOLDOWN: 0.32,           // Cadência de 0.32s por tiro
    DAMAGE: 35,               // 35 HP por disparo (elimina ovo de 100 HP em 3 tiros)
    KICKBACK_Z: 0.11,         // Recuo linear para trás no eixo Z da arma
    KICKBACK_ROT_X: 0.24,     // Inclinação do cano para cima no disparo (rad)
    KICKBACK_RECOVERY: 14.0,  // Velocidade de retorno da arma à posição original
    BOB_FREQ: 10.5,           // Frequência do balanço ao caminhar
    BOB_AMP_X: 0.016,         // Amplitude horizontal do weaponBob
    BOB_AMP_Y: 0.022          // Amplitude vertical do weaponBob
  },

  // 4.2. Arma Power-Up: Egg-Rifle Automático
  RIFLE: {
    NAME: 'EGG-RIFLE AUTO',
    DURATION: 10.0,           // 10.0s de duração ao coletar
    COOLDOWN: 0.10,           // Cadência de 0.10s por tiro (rajada rápida)
    DAMAGE: 25,               // 25 HP por projétil
    KICKBACK_Z: 0.075,        // Recuo curto e rápido de fuzil
    KICKBACK_ROT_X: 0.11,     // Inclinação controlada em rajada
    KICKBACK_RECOVERY: 22.0   // Retorno rápido para próximo disparo
  },

  // 4.2. Power-Ups 3D Flutuantes na Arena
  POWERUPS: {
    PICKUP_RADIUS: 1.1,       // Distância radial XZ (< 1.1) para coleta automática
    RESPAWN_TIME: 18.0,       // Tempo de regeneração na arena (18s)
    SHIELD_DURATION: 10.0,    // Duração do Escudo Ciano (10.0s)
    HEAL_AMOUNT: 40           // Cura instantânea (+40 HP até 100 HP)
  },

  // 5. Inimigos Armados, IA e Escalonamento Balanceado por Horda (Wave)
  ENEMY: {
    MAX_HP: 100,                // 100 HP por ovo inimigo
    INITIAL_SQUAD_COUNT: 4,     // Squad base na Horda 1 (4 inimigos)
    MAX_SQUAD_COUNT: 10,        // Teto máximo de 10 inimigos simultâneos
    PATROL_SPEED: 3.1,          // Velocidade base de patrulha nos corredores
    CHASE_SPEED: 4.2,           // Velocidade base ao perseguir o jogador
    STRAFE_SPEED: 2.6,          // Velocidade lateral tática durante combate (ATTACK)
    SPEED_WAVE_INCREMENT: 0.06, // +6% de velocidade por horda
    MAX_SPEED_MULTIPLIER: 1.45, // Teto máximo de 1.45x a velocidade base
    LOS_MAX_DIST: 22.0,         // Distância máxima de Linha de Visão (22 unidades)
    PREFERRED_MIN_DIST: 6.5,    // Distância mínima que o inimigo tenta manter do jogador
    PREFERRED_MAX_DIST: 13.5,   // Distância ideal para parar de avançar e fazer strafe
    CHARGE_TIME: 0.35,          // Brilho de aviso na arma antes de disparar (0.35s)
    FIRE_COOLDOWN: 1.55,        // Intervalo entre disparos de cada inimigo
    PROJECTILE_SPEED: 14.0,     // Velocidade moderada do projétil desviável (14 unidades/s)
    PROJECTILE_RADIUS: 0.18,    // Raio da esfera de energia/gema disparada
    BASE_PROJECTILE_DAMAGE: 15, // Dano base na Horda 1 (15 HP)
    DAMAGE_WAVE_INCREMENT: 3,   // +3 HP de dano por horda
    MAX_PROJECTILE_DAMAGE: 35,  // Teto máximo de 35 HP por tiro (evita one-hit kill injusto)
    SHATTER_FRAGMENTS: 15,      // 15 fragmentos de casca na explosão + gema central
    SHATTER_DURATION: 0.9,      // Duração da explosão de fragmentos (~0.9s)
    BASE_KILL_SCORE: 100        // Pontuação base: 100 * wave por inimigo eliminado
  },

  // Cores Temáticas do Universo Egg-Man
  COLORS: {
    SKY: 0x121824,
    FOG: 0x121824,
    AMBIENT_LIGHT: 0xdbe9ff,
    DIR_LIGHT: 0xfff4d6,
    EGG_SHELL: 0xfff5dc,
    ENEMY_SHELL: 0xffe8c2,
    EGG_YOLK: 0xffb703,
    GUN_METAL: 0x2b303a,
    GUN_BARREL: 0x434a59,
    MUZZLE_FLASH: 0xffd166,
    RIFLE_GOLD: 0xffc300,
    SHIELD_CYAN: 0x00e5ff,
    HEAL_GREEN: 0x2ec4b6,
    ENEMY_VISOR: 0x1a1d24,
    ENEMY_LASER: 0xff3b30,
    ENEMY_PLASMA: 0xff5400
  }
};

/**
 * Calcula os atributos escalonados da horda atual (wave >= 1) com tetos de segurança
 * @param {number} wave
 */
export function getWaveScaling(wave = 1) {
  const w = Math.max(1, Math.floor(wave));
  const enemyCount = Math.min(
    CONFIG.ENEMY.MAX_SQUAD_COUNT,
    CONFIG.ENEMY.INITIAL_SQUAD_COUNT + (w - 1)
  );
  const speedMultiplier = Math.min(
    CONFIG.ENEMY.MAX_SPEED_MULTIPLIER,
    1 + (w - 1) * CONFIG.ENEMY.SPEED_WAVE_INCREMENT
  );
  const projectileDamage = Math.min(
    CONFIG.ENEMY.MAX_PROJECTILE_DAMAGE,
    CONFIG.ENEMY.BASE_PROJECTILE_DAMAGE + (w - 1) * CONFIG.ENEMY.DAMAGE_WAVE_INCREMENT
  );
  const killScore = CONFIG.ENEMY.BASE_KILL_SCORE * w;

  return {
    wave: w,
    enemyCount,
    speedMultiplier,
    projectileDamage,
    killScore
  };
}

/**
 * Carrega recordes (HIGH SCORE e MAX WAVE) do localStorage
 */
export function loadRecords() {
  try {
    const highScore = parseInt(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || '0', 10) || 0;
    const maxWave = parseInt(localStorage.getItem(STORAGE_KEYS.MAX_WAVE) || '1', 10) || 1;
    return { highScore, maxWave };
  } catch (_) {
    return { highScore: 0, maxWave: 1 };
  }
}

/**
 * Salva recordes (HIGH SCORE e MAX WAVE) no localStorage
 */
export function saveRecords(score, wave) {
  const current = loadRecords();
  const newHighScore = Math.max(current.highScore, score);
  const newMaxWave = Math.max(current.maxWave, wave);
  try {
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(newHighScore));
    localStorage.setItem(STORAGE_KEYS.MAX_WAVE, String(newMaxWave));
  } catch (_) {
    // Ignora caso localStorage esteja restrito
  }
  return { highScore: newHighScore, maxWave: newMaxWave };
}

/**
 * Carrega configurações do jogador (sensibilidade, som, skin da arma/luva)
 */
export function loadUserSettings() {
  const defaults = {
    sensitivityMultiplier: 1.0,
    muted: false,
    skinId: 'tactical'
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      sensitivityMultiplier: Math.max(0.5, Math.min(2.0, Number(parsed.sensitivityMultiplier) || 1.0)),
      muted: Boolean(parsed.muted),
      skinId: WEAPON_SKINS[parsed.skinId] ? parsed.skinId : 'tactical'
    };
  } catch (_) {
    return defaults;
  }
}

/**
 * Salva configurações do jogador no localStorage
 */
export function saveUserSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (_) {
    // Ignora caso localStorage esteja restrito
  }
}
