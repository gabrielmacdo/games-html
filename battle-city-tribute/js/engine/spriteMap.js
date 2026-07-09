export const SPRITE_MAP = {
    TANK_P1: {
        UP:    [{x: 0, y: 0},  {x: 16, y: 0}],
        LEFT:  [{x: 32, y: 0}, {x: 48, y: 0}],
        DOWN:  [{x: 64, y: 0}, {x: 80, y: 0}],
        RIGHT: [{x: 96, y: 0}, {x: 112, y: 0}]
    },
    // COORDENADAS DA BALA ORIGINAL (Recorte de 4x4 pixels escalado depois)
    BULLET: {
        UP:    { x: 323, y: 102 },
        LEFT:  { x: 331, y: 102 },
        DOWN:  { x: 339, y: 102 },
        RIGHT: { x: 346, y: 102 }
    },
    // COORDENADAS DOS BLOCOS (Cada bloco original tem 16x16 pixels)
    TILE: {
        BRICK: { x: 256, y: 0 },
        STEEL: { x: 256, y: 16 },
        BUSH:  { x: 272, y: 32 },
        WATER: { x: 256, y: 32 }
    }
};