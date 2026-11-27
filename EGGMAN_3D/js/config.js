/**
 * Constantes globais, skins procedurais e parâmetros arquiteturais do Egg-Man 3D
 * Especificações baseadas em EGGMAN_3D_TECH_SPEC.md
 */

const STORAGE_KEY_CONTROL_MODE = 'eggman3d_control_mode';
const STORAGE_KEY_MOBILE_CONTROL_MODE = 'eggman3d_mobile_control_mode';
const STORAGE_KEY_AUDIO_MUTED = 'eggman3d_audio_muted';
const STORAGE_KEY_HIGH_SCORE = 'eggman3d_high_score';
const STORAGE_KEY_PLAYER_SKIN = 'eggman3d_player_skin';
const STORAGE_KEY_CAMERA_ZOOM = 'eggman3d_camera_zoom';

export const CAMERA_ZOOM_MIN = 1.0;
export const CAMERA_ZOOM_MAX = 1.8;

/**
 * Detecta se o dispositivo primário possui tela sensível ao toque (coarse pointer / touch).
 */
export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

/**
 * Catálogo de Casca do Egg-Man (Cores e padrões exclusivos que não colidem com os 4 inimigos:
 * Vermelho, Rosa, Azul Celeste e Laranja).
 */
export const EGG_SKINS = [
  {
    id: 'golden',
    name: 'Ovo Dourado',
    color: 0xffd54f,
    emissive: 0x332200,
    roughness: 0.25,
    metalness: 0.28,
    pattern: 'solid',
    previewBg: 'linear-gradient(135deg, #fde047, #eab308)'
  },
  {
    id: 'classic_white',
    name: 'Branco Clássico',
    color: 0xf8fafc,
    emissive: 0x1e293b,
    roughness: 0.32,
    metalness: 0.05,
    pattern: 'solid',
    previewBg: 'linear-gradient(135deg, #ffffff, #cbd5e1)'
  },
  {
    id: 'free_range',
    name: 'Ovo Caipira',
    color: 0xd99b66,
    emissive: 0x2e1909,
    roughness: 0.42,
    metalness: 0.05,
    pattern: 'solid',
    previewBg: 'linear-gradient(135deg, #e6b385, #b87333)'
  },
  {
    id: 'quail',
    name: 'Casca de Codorna',
    color: 0xf5efe6,
    emissive: 0x221c15,
    roughness: 0.45,
    metalness: 0.04,
    pattern: 'quail',
    previewBg: 'radial-gradient(circle at 30% 35%, #3e2723 14%, transparent 16%), radial-gradient(circle at 70% 65%, #4e342e 16%, transparent 18%), radial-gradient(circle at 60% 25%, #3e2723 10%, transparent 12%), #f3ead8'
  },
  {
    id: 'mint',
    name: 'Verde Menta',
    color: 0x6ee7b7,
    emissive: 0x064e3b,
    roughness: 0.3,
    metalness: 0.1,
    pattern: 'solid',
    previewBg: 'linear-gradient(135deg, #a7f3d0, #10b981)'
  }
];

function loadInitialControlMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONTROL_MODE);
    if (saved === 'HOLD' || saved === 'CONTINUOUS') {
      return saved;
    }
  } catch (_) {}
  return 'HOLD';
}

function loadInitialMobileControlMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MOBILE_CONTROL_MODE);
    if (saved === 'DPAD' || saved === 'SWIPE') {
      return saved;
    }
  } catch (_) {}
  // Padrão em dispositivos touch: 'DPAD'
  return 'DPAD';
}

function loadInitialMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY_AUDIO_MUTED) === 'true';
  } catch (_) {
    return false;
  }
}

function loadInitialSkin() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLAYER_SKIN);
    if (EGG_SKINS.some((s) => s.id === saved)) {
      return saved;
    }
  } catch (_) {}
  return 'golden';
}

function loadInitialCameraZoom() {
  try {
    const val = parseFloat(localStorage.getItem(STORAGE_KEY_CAMERA_ZOOM));
    if (Number.isFinite(val)) {
      return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, val));
    }
  } catch (_) {}
  return CAMERA_ZOOM_MIN; // 1.0 (visão padrão aprovada)
}

export function loadHighScore() {
  try {
    const val = parseInt(localStorage.getItem(STORAGE_KEY_HIGH_SCORE), 10);
    return Number.isFinite(val) && val > 0 ? val : 0;
  } catch (_) {
    return 0;
  }
}

export function saveHighScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY_HIGH_SCORE, String(score));
  } catch (_) {}
}

export const CONFIG = {
  // Escala do Grid e Geometrias (Unidades Three.js)
  TILE_SIZE: 2.0,
  WALL_HEIGHT: 1.2,
  GATE_HEIGHT: 0.75,

  // Dimensões do Egg-Man & Inimigos (THREE.LatheGeometry)
  EGG_MAX_RADIUS: 0.65,
  EGG_HEIGHT: 1.6,
  EGG_LATHE_SEGMENTS: 32,
  EGG_PROFILE_STEPS: 28,

  // Dimensões dos Coletáveis (Seção 3 de EGGMAN_3D_TECH_SPEC.md)
  DOT_RADIUS: 0.18,
  DOT_Y: 0.4,
  COIN_RADIUS: 0.45,
  COIN_THICKNESS: 0.12,
  COIN_Y: 0.6,
  COIN_ROTATION_SPEED: 3.2,

  // Ciclo de Jogo, Vidas, Pontuação e Superpoder (Fases 3, 4 e 5)
  INITIAL_LIVES: 3,
  READY_BANNER_DURATION: 1.2,
  SCORE_DOT: 10,
  SCORE_POWER_COIN: 50,
  SCORE_ENEMY_BASE: 200,
  POWER_MODE_DURATION: 8.0,

  // Física, Escalonamento por Fase e Movimentação Determinística em Grid
  PLAYER_SPEED: 7.5,
  ENEMY_SPEED: 6.6,
  ENEMY_STAGE_SPEED_INC: 0.05,
  ENEMY_MAX_SPEED_MULT: 1.35,
  ENEMY_FRIGHTENED_FACTOR: 0.6,
  ENEMY_EATEN_FACTOR: 2.0,
  ROTATION_LERP_SPEED: 16.0,
  WALK_CYCLE_SPEED: 14.0,
  WALK_BOUNCE_AMPLITUDE: 0.15,
  CENTER_TOLERANCE: 0.08,
  GRID_EPSILON: 0.08,
  SWIPE_MIN_DISTANCE_PX: 24,

  // Colisão entre Entidades e Partículas de Quebra (Seção 4.4)
  ENTITY_COLLISION_DIST: 1.1,
  SHELL_PARTICLE_COUNT: 15,
  SHELL_PARTICLE_DURATION: 0.8,
  SHELL_PARTICLE_GRAVITY: 18.0,

  // Ciclo Global de IA (Alternância SCATTER / CHASE em segundos)
  AI_WAVE_TIMINGS: [
    { state: 'SCATTER', duration: 7.0 },
    { state: 'CHASE', duration: 20.0 },
    { state: 'SCATTER', duration: 7.0 },
    { state: 'CHASE', duration: 20.0 },
    { state: 'SCATTER', duration: 5.0 },
    { state: 'CHASE', duration: Infinity }
  ],

  // Preferências persistidas no localStorage
  CONTROL_MODE: loadInitialControlMode(),
  MOBILE_CONTROL_MODE: loadInitialMobileControlMode(), // 'DPAD' | 'SWIPE'
   forceShowDpadOnDesktop: false, // Permite exibir o D-Pad em desktop se o usuário clicar manualmente na opção
  AUDIO_MUTED: loadInitialMuted(),
  PLAYER_SKIN: loadInitialSkin(),
  CAMERA_ZOOM: loadInitialCameraZoom(), // 1.0 a 1.8 (apenas afastar)
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  STORAGE_KEY_CONTROL_MODE,
  STORAGE_KEY_MOBILE_CONTROL_MODE,
  STORAGE_KEY_AUDIO_MUTED,
  STORAGE_KEY_HIGH_SCORE,
  STORAGE_KEY_PLAYER_SKIN,
  STORAGE_KEY_CAMERA_ZOOM,

  // Câmera em Terceira Pessoa Elevada (Angled Chase Cam)
  CAMERA_FOV: 45,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 200,
  CAMERA_OFFSET: { x: 0, y: 11, z: 9 },
  CAMERA_LOOK_AHEAD_Z: 2.0,
  CAMERA_LERP_ALPHA: 0.1,

  // Paleta de Cores
  COLORS: {
    SKY_BG: 0x0d1117,
    FLOOR_BASE: 0x161f30,
    WALL_BASE: 0x2563eb,
    WALL_TOP: 0x3b82f6,
    WALL_EMISSIVE: 0x0b1d4d,
    GATE_COLOR: 0xf472b6,
    DOT_COLOR: 0xfef08a,
    DOT_EMISSIVE: 0xca8a04,
    COIN_COLOR: 0xf59e0b,
    COIN_EMISSIVE: 0xb45309,
    EGG_SHELL: 0xffd54f,
    EGG_EMISSIVE: 0x332200,
    EGG_POWER_SHELL: 0x38bdf8,
    EGG_POWER_EMISSIVE: 0x0284c7,
    EYE_SCLERA: 0xffffff,
    EYE_PUPIL: 0x111827,
    ENEMY_RED: 0xef4444,
    ENEMY_PINK: 0xf472b6,
    ENEMY_BLUE: 0x38bdf8,
    ENEMY_ORANGE: 0xf97316,
    ENEMY_FRIGHTENED: 0x1d4ed8,
    ENEMY_FRIGHTENED_FLASH: 0xe2e8f0,
    ENEMY_YOLK: 0xf59e0b,
    SHELL_FRAGMENT: 0xfef9c3,
    AMBIENT_LIGHT: 0xffffff,
    DIR_LIGHT: 0xfffbeb
  }
};

export function setControlMode(newMode) {
  const mode = newMode || (CONFIG.CONTROL_MODE === 'HOLD' ? 'CONTINUOUS' : 'HOLD');
  CONFIG.CONTROL_MODE = mode;
  try {
    localStorage.setItem(STORAGE_KEY_CONTROL_MODE, mode);
  } catch (_) {}
  return mode;
}

export function setMobileControlMode(newMode) {
  const mode =
    newMode || (CONFIG.MOBILE_CONTROL_MODE === 'DPAD' ? 'SWIPE' : 'DPAD');
  CONFIG.MOBILE_CONTROL_MODE = mode;
  // Se o usuário alternou para DPAD manualmente nas configurações (mesmo no desktop), permite visualizar
  CONFIG.forceShowDpadOnDesktop = mode === 'DPAD';
  try {
    localStorage.setItem(STORAGE_KEY_MOBILE_CONTROL_MODE, mode);
  } catch (_) {}
  return mode;
}

export function setCameraZoom(zoomValue) {
  const numeric = Number(zoomValue);
  if (!Number.isFinite(numeric)) return CONFIG.CAMERA_ZOOM;
  const clamped = Math.min(
    CAMERA_ZOOM_MAX,
    Math.max(CAMERA_ZOOM_MIN, Math.round(numeric * 100) / 100)
  );
  CONFIG.CAMERA_ZOOM = clamped;
  try {
    localStorage.setItem(STORAGE_KEY_CAMERA_ZOOM, String(clamped));
  } catch (_) {}
  return clamped;
}

export function setAudioMuted(muted) {
  const nextMuted = typeof muted === 'boolean' ? muted : !CONFIG.AUDIO_MUTED;
  CONFIG.AUDIO_MUTED = nextMuted;
  try {
    localStorage.setItem(STORAGE_KEY_AUDIO_MUTED, String(nextMuted));
  } catch (_) {}
  return nextMuted;
}

export function setPlayerSkin(skinId) {
  const found = EGG_SKINS.find((s) => s.id === skinId);
  if (!found) return CONFIG.PLAYER_SKIN;
  CONFIG.PLAYER_SKIN = found.id;
  try {
    localStorage.setItem(STORAGE_KEY_PLAYER_SKIN, found.id);
  } catch (_) {}
  return found.id;
}

export function getActiveSkinConfig() {
  return EGG_SKINS.find((s) => s.id === CONFIG.PLAYER_SKIN) || EGG_SKINS[0];
}
