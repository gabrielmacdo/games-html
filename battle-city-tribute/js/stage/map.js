import { SPRITE_MAP } from '../engine/spriteMap.js';

export const TILE_TYPES = {
    BRICK: { id: 1, blocksTank: true,  blocksBullet: true,  sprite: SPRITE_MAP.TILE.BRICK },
    STEEL: { id: 2, blocksTank: true,  blocksBullet: true,  sprite: SPRITE_MAP.TILE.STEEL },
    EAGLE: { id: 5, blocksTank: true,  blocksBullet: true,  sprite: { x: 304, y: 32 } } 
};

// AGORA CADA BLOCO TEM 16x16 PIXELS (Dobro de precisão!)
const TILE_SIZE = 16;

// Matriz de Teste reduzida para você entender como ajustar manualmente:
// Altere os números aqui para desenhar o mapa bloco por bloco!
const STAGE_1_MATRIX = [
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0], // Linha 0
    [ 0,  1,  1,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  1,  1,  0,  1,  1,  1,  1,  1,  1,  0], // Linha 1
    [ 0,  0,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0], // Linha 2
    [ 0,  1,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  0,  1,  0,  1,  0,  1,  0,  1,  1,  1,  1,  0,  1,  1,  0], // Linha 3
    [ 0,  0,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  1,  0,  0], // Linha 4
    [ 0,  1,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  1,  0,  0], // Linha 5
    [ 0,  0,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  1,  0,  0], // Linha 6
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  1,  0,  0], // Linha 7
    [ 1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  0], // Linha 8
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 9
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 10
    [ 1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  0], // Linha 11
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 12
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 13
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 14
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 15
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 16
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 17
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0], // Linha 18
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  1,  0,  0,  0], // Linha 19
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  1,  0,  0], // Linha 20
    [ 1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  1,  0,  0], // Linha 21
    [ 1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  1,  0,  0], // Linha 22
    [ 1,  0,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  1,  0,  0], // Linha 23
    [ 1,  0,  1,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0,  1,  0,  0], // Linha 24
    [ 0,  1,  1,  0,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  1,  0,  0], // Linha 25
    [ 0,  1,  0,  0,  0,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  0,  0], // Linha 26
    [ 0,  0,  0,  0,  0,  0,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  0,  0] // Linha 27
];

// Cria o bloco de tijolo já customizado com quais partes estão vivas
function createBrickTile(x, y, partMask) {
    return {
        x: x, y: y,
        size: TILE_SIZE,
        type: TILE_TYPES.BRICK,
        // true = pedaço vivo, false = vazio
        parts: partMask, 
        offsets: [
            { x: 0,  y: 0 },  // 0: Sup Esq
            { x: 8,  y: 0 },  // 1: Sup Dir
            { x: 0,  y: 8 },  // 2: Inf Esq
            { x: 8,  y: 8 }   // 3: Inf Dir
        ]
    };
}

export let mapObstacles = [];

export function generateStage() {
    mapObstacles = [];
    
    for (let row = 0; row < STAGE_1_MATRIX.length; row++) {
        for (let col = 0; col < STAGE_1_MATRIX[row].length; col++) {
            let typeId = STAGE_1_MATRIX[row][col];
            let posX = col * TILE_SIZE;
            let posY = row * TILE_SIZE;

            // --- BLOCOS SÓLIDOS NORMAIS ---
            if (typeId === 1) {
                mapObstacles.push(createBrickTile(posX, posY, [true, true, true, true]));
            } else if (typeId === 2) {
                mapObstacles.push({ x: posX, y: posY, size: TILE_SIZE, type: TILE_TYPES.STEEL });
            }
            
            // --- METADES DE TIJOLO (50%) ---
            else if (typeId === 11) { // Metade Superior
                mapObstacles.push(createBrickTile(posX, posY, [true, true, false, false]));
            }
            else if (typeId === 12) { // Metade Inferior
                mapObstacles.push(createBrickTile(posX, posY, [false, false, true, true]));
            }
            else if (typeId === 13) { // Metade Esquerda
                mapObstacles.push(createBrickTile(posX, posY, [true, false, true, false]));
            }
            else if (typeId === 14) { // Metade Direita
                mapObstacles.push(createBrickTile(posX, posY, [false, true, false, true]));
            }

            // --- QUARTOS DE TIJOLO / CANTOS (25%) ---
            else if (typeId === 15) { // Canto Superior Esquerdo
                mapObstacles.push(createBrickTile(posX, posY, [true, false, false, false]));
            }
            else if (typeId === 16) { // Canto Superior Direito
                mapObstacles.push(createBrickTile(posX, posY, [false, true, false, false]));
            }
            else if (typeId === 17) { // Canto Inferior Esquerdo
                mapObstacles.push(createBrickTile(posX, posY, [false, false, true, false]));
            }
            else if (typeId === 18) { // Canto Inferior Direito
                mapObstacles.push(createBrickTile(posX, posY, [false, false, false, true]));
            }
        }
    }
}

export function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.size &&
           rect1.x + rect1.size > rect2.x &&
           rect1.y < rect2.y + rect2.size &&
           rect1.y + rect1.size > rect2.y;
}

export function drawMapBackground(ctx, spritesheet) {
    mapObstacles.forEach(tile => {
        if (tile.type.id === 1) { // TIJOLO
            for (let i = 0; i < 4; i++) {
                if (tile.parts[i]) {
                    // Como diminuímos o bloco para 16x16, cada mini-quadrante tem 8x8 pixels
                    ctx.drawImage(
                        spritesheet,
                        tile.type.sprite.x, tile.type.sprite.y,
                        8, 8, // Corta um pedaço menor do sprite original
                        tile.x + tile.offsets[i].x, tile.y + tile.offsets[i].y,
                        8, 8
                    );
                }
            }
        } else { // Aço
            ctx.drawImage(
                spritesheet,
                tile.type.sprite.x, tile.type.sprite.y,
                16, 16,
                tile.x, tile.y,
                tile.size, tile.size
            );
        }
    });
}

export function drawMapForeground(ctx, spritesheet) {}