import { canvas } from '../engine/canvas.js';
import { keys } from '../engine/input.js';
import { Bullet } from './bullet.js';
import { mapObstacles, checkCollision } from '../stage/map.js'; // Importa o mapa e colisor

export const player = {
    x: 120,
    y: 350,
    speed: 2,
    size: 32,          // Tamanho do tanque na tela (escala de 16x16 para 32x32)
    direction: 'UP',   // UP, DOWN, LEFT, RIGHT
    frame: 0,          // Alterna entre 0 e 1 para animação das esteiras
    isMoving: false,
    lastAnimTime: 0,
    currentBullet: null, // Armazena o tiro ativo do jogador

    // NOVAS PROPRIEDADES PARA O COOLDOWN
    lastShotTime: 0,      // Guarda o milissegundo do último tiro dado
    shotCooldown: 300,    // Tempo de espera em milissegundos (300ms = ~1/3 de segundo)

    update(currentTime, bulletsArray) {
        this.isMoving = false;

        // Guarda as posições antigas caso precise voltar atrás na colisão
        const oldX = this.x;
        const oldY = this.y;

        // Captura os comandos das setas ou WASD
        if (keys['ArrowUp'] || keys['w']) {
            this.y -= this.speed;
            this.direction = 'UP';
            this.isMoving = true;
        } else if (keys['ArrowDown'] || keys['s']) {
            this.y += this.speed;
            this.direction = 'DOWN';
            this.isMoving = true;
        } else if (keys['ArrowLeft'] || keys['a']) {
            this.x -= this.speed;
            this.direction = 'LEFT';
            this.isMoving = true;
        } else if (keys['ArrowRight'] || keys['d']) {
            this.x += this.speed;
            this.direction = 'RIGHT';
            this.isMoving = true;
        }

        // Checa colisão com os obstáculos do mapa
        for (let tile of mapObstacles) {
            if (tile.type.blocksTank) {
                if (checkCollision(this, tile)) {
                    
                    // Se for TIJOLO, verifica se colidiu especificamente com um bloquinho ativo
                    if (tile.type.id === 1) {
                        let colidiuComAtivo = false;

                        for (let b = 0; b < 4; b++) {
                            if (tile.parts[b]) {
                                const subRect = {
                                    x: tile.x + tile.offsets[b].x,
                                    y: tile.y + tile.offsets[b].y,
                                    size: 8
                                };
                                if (checkCollision(this, subRect)) {
                                    colidiuComAtivo = true;
                                    break;
                                }
                            }
                        }

                        if (colidiuComAtivo) {
                            this.x = oldX;
                            this.y = oldY;
                            this.isMoving = false;
                            break;
                        }
                    } else {
                        // Para Aço ou Água, bloqueia o bloco inteiro normalmente
                        this.x = oldX;
                        this.y = oldY;
                        this.isMoving = false;
                        break;
                    }
                }
            }
        }

        // Restringe o movimento dentro das bordas do Canvas por enquanto
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x > canvas.width - this.size) this.x = canvas.width - this.size;
        if (this.y > canvas.height - this.size) this.y = canvas.height - this.size;

        // AÇÃO DE DISPARAR MODIFICADA
        // Só atira se o espaço for apertado, não houver tiro na tela E já tiver passado o tempo de cooldown
        if (keys[' '] && 
            (!this.currentBullet || !this.currentBullet.active) && 
            (currentTime - this.lastShotTime > this.shotCooldown)) {
            
            this.currentBullet = new Bullet(this.x, this.y, this.direction, 'PLAYER');
            bulletsArray.push(this.currentBullet);
            
            // Salva o momento exato em que esse tiro foi disparado
            this.lastShotTime = currentTime; 
        }

        if (this.currentBullet && !this.currentBullet.active) {
            this.currentBullet = null;
        }

        if (this.isMoving && currentTime - this.lastAnimTime > 100) {
            this.frame = this.frame === 0 ? 1 : 0;
            this.lastAnimTime = currentTime;
        }
    }
};