import { ctx, canvas } from './engine/canvas.js';
import { SPRITE_MAP } from './engine/spriteMap.js';
import { player } from './entities/player.js';
import { initMenu } from './menu.js';
import { drawMapBackground, drawMapForeground, mapObstacles, generateStage } from './stage/map.js';

const SPRITE_SRC = "./assets/sprites/general-sprites.png"; 

const spritesheet = new Image();
spritesheet.src = SPRITE_SRC;

let isGameRunning = false;
let bullets = []; // Matriz global que armazena os tiros em cena

initMenu((mode) => {
    isGameRunning = true;
    bullets = []; 
    
    generateStage(); // 2. CHAMA A GERAÇÃO DO MAPA COMPLETO AQUI
    
    // Reposiciona o player para o local de spawn clássico (lado esquerdo inferior da Águia)
    player.x = 160;
    player.y = 350;
    
    if (spritesheet.complete) {
        requestAnimationFrame(gameLoop);
    } else {
        spritesheet.onload = () => {
            requestAnimationFrame(gameLoop);
        };
    }
});
function update(currentTime) {
    if (!isGameRunning) return;
    
    // Atualiza o player passando a lista global de tiros
    player.update(currentTime, bullets);

    // Atualiza todos os tiros ativos e remove da lista os que saíram da tela
    // Passa os obstáculos do mapa para a lógica de cada bala
    bullets.forEach(bullet => bullet.update(mapObstacles));
    
    // Filtra e mantém apenas as balas que continuam ativas
    bullets = bullets.filter(bullet => bullet.active);
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isGameRunning) return;

    // DESENHAR O MAPA (Deve vir antes do player para o Arbusto cobrir o tanque se necessário)
    
    // CAMADA 1: Cenário de fundo (Tijolos, Aço, Água)
    drawMapBackground(ctx, spritesheet);

    // CAMADA 2: Projéteis (Balas)
    bullets.forEach(bullet => bullet.draw(ctx, spritesheet));

    // CAMADA 3: Entidades (Tanque do jogador)
    // Desenha o Tanque do Jogador
    const spriteCoords = SPRITE_MAP.TANK_P1[player.direction][player.frame];
    ctx.drawImage(
        spritesheet,
        spriteCoords.x, spriteCoords.y,
        16, 16,
        player.x, player.y,
        player.size, player.size
    );

    // CAMADA 4: Elementos de primeiro plano (Arbusto/Folhas cobrindo o tanque)
    drawMapForeground(ctx, spritesheet);
}

function gameLoop(currentTime) {
    update(currentTime);
    draw();
    if (isGameRunning) {
        requestAnimationFrame(gameLoop);
    }
}