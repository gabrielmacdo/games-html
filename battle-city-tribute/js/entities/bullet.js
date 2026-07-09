import { canvas } from '../engine/canvas.js';
import { SPRITE_MAP } from '../engine/spriteMap.js';
import { checkCollision } from '../stage/map.js'; // Importa a função de colisão

export class Bullet {
    constructor(x, y, direction, owner) {
        this.size = 8; 
        this.speed = 5;
        this.direction = direction;
        this.owner = owner; 
        this.active = true;

        // Centraliza o tiro na ponta do canhão
        //if (direction === 'UP') {
        //    this.x = x + 16 - (this.size / 2);
        //    this.y = y;
        //} else if (direction === 'DOWN') {
        //    this.x = x + 16 - (this.size / 2);
        //    this.y = y + 32 - this.size;
        //} else if (direction === 'LEFT') {
        //    this.x = x;
        //    this.y = y + 16 - (this.size / 2);
        //} else if (direction === 'RIGHT') {
        //    this.x = x + 32 - this.size;
        //    this.y = y + 16 - (this.size / 2);
        //}

        // AJUSTE CIRÚRGICO: Afasta o ponto de nascimento da bala para FORA do tanque
        // Evita que a bala nasça já dentro do bloco quando o tanque está colado
        if (direction === 'UP') {
            this.x = x + 16 - (this.size / 2);
            this.y = y - this.size; // Nasce logo acima do topo do tanque
        } else if (direction === 'DOWN') {
            this.x = x + 16 - (this.size / 2);
            this.y = y + 32;        // Nasce logo abaixo do fundo do tanque
        } else if (direction === 'LEFT') {
            this.x = x - this.size; // Nasce logo à esquerda do tanque
            this.y = y + 16 - (this.size / 2);
        } else if (direction === 'RIGHT') {
            this.x = x + 32;        // Nasce logo à direita do tanque
            this.y = y + 16 - (this.size / 2);
        }
    }

    // Agora o update recebe o array de obstáculos do mapa para checar colisões
    update(mapObstacles) {
        if (!this.active) return;

        if (this.direction === 'UP') this.y -= this.speed;
        else if (this.direction === 'DOWN') this.y += this.speed;
        else if (this.direction === 'LEFT') this.x -= this.speed;
        else if (this.direction === 'RIGHT') this.x += this.speed;

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
            return;
        }

        // Sistema de Colisão por Quadrantes (4 bloquinhos)
        for (let i = mapObstacles.length - 1; i >= 0; i--) {
            const tile = mapObstacles[i];

            if (tile.type.blocksBullet) {
                if (checkCollision(this, tile)) {
                    if (!this.active) continue;

                    // 1. Tratamento focado no bloco de TIJOLO de 4 partes
                    if (tile.type.id === 1) {
                        let hitSomething = false;

                        // Checa qual dos 4 bloquinhos a bala atingiu de fato
                        for (let b = 0; b < 4; b++) {
                            if (tile.parts[b]) {
                                const subRect = {
                                    x: tile.x + tile.offsets[b].x,
                                    y: tile.y + tile.offsets[b].y,
                                    size: 8
                                };

                                if (checkCollision(this, subRect)) {
                                    tile.parts[b] = false; // Destrói o bloquinho específico!
                                    hitSomething = true;
                                    break; // Para de checar outros bloquinhos neste frame
                                }
                            }
                        }

                        if (hitSomething) {
                            this.active = false; // Desativa a bala na hora

                            // Se todos os 4 bloquinhos sumirem, remove o bloco do mapa
                            const isAlive = tile.parts.some(p => p === true);
                            if (!isAlive) {
                                mapObstacles.splice(i, 1);
                            }
                            break;
                        }
                    } 
                    // 2. Tratamento para bloco de AÇO (apenas desativa a bala)
                    else {
                        this.active = false;
                        break;
                    }
                }
            }
        }
    }

    draw(ctx, spritesheet) {
        if (!this.active) return;
        
        const coords = SPRITE_MAP.BULLET[this.direction];

        ctx.drawImage(
            spritesheet,
            coords.x, coords.y,   
            4, 4,                 
            this.x, this.y,       
            this.size, this.size  
        );
    }
}