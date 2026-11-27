
# Especificação Técnica: EGGFIRE (3D First-Person Arena Shooter)

## 1. Visão Geral e Arquitetura
* **Gênero:** FPS (First-Person Shooter) estilo Arena Retro / Arcade em 3D.
* **Hospedagem:** GitHub Pages (100% estático, zero backend, zero etapa de build).
* **Stack:** HTML5, CSS3 (`100dvh` + `safe-area-inset-*`), JavaScript ES6 Modules nativos e Three.js (`v0.160.0`) via `importmap` CDN oficial.
* **Áudio:** 100% procedural via **Web Audio API** nativa (disparos de pistola, rajadas de fuzil, impacto na casca, coleta de power-up, escudo ativo e alerta de dano).
* **Estrutura de Arquivos:**
  ```text
  eggfire/
  ├── index.html          # Canvas WebGL, importmap, HUD FPS, Radar e telas de estado
  ├── css/
  │   └── style.css       # Layout responsivo 100dvh, crosshair, barras de vida/escudo e controles touch
  └── js/
      ├── config.js       # Constantes de escala, velocidades, dano, cadência e persistência
      ├── mapData.js      # Matriz 2D da arena, pontos de spawn e validador topológico
      ├── arena.js        # Geração procedural 3D das paredes, piso, teto/céu e pilares
      ├── player.js       # Câmera 1ª pessoa, física Circle-vs-AABB (wall-sliding) e viewmodel da arma
      ├── weapons.js      # Lógica de tiro Hitscan, tracers visuais e power-ups 3D flutuantes
      ├── enemy.js        # Ovos inimigos armados, IA com Line-of-Sight, projéteis e quebra de casca
      ├── radar.js        # Minimapa 2D dinâmico renderizado em <canvas>
      ├── audio.js        # Sintetizador de efeitos sonoros via Web Audio API
      └── main.js         # Loop principal, máquina de estados, ondas (waves) e colisões
## 2. Sistema de Coordenadas, Escala e Proporções (`config.js`)

Em 1ª pessoa, os corredores precisam ser mais largos e altos do que em 3ª pessoa para permitir movimentação lateral (_strafing_), desvio de tiros e leitura espacial confortável.

-   **Plano do Jogo:** O piso fica em `Y = 0`.
    
-   **Dimensões Base:**
    
    -   `TILE_SIZE = 3.0` unidades (largura de cada célula da matriz).
        
    -   `WALL_HEIGHT = 3.2` unidades (paredes altas fechando a visão entre corredores).
        
    -   `EYE_HEIGHT = 1.35` unidades (altura da câmera do Egg-Man em 1ª pessoa).
        
    -   `PLAYER_RADIUS = 0.55` unidades (raio cilíndrico de colisão do jogador).
        
    -   `ENEMY_RADIUS = 0.65` e `ENEMY_HEIGHT = 1.60` unidades (mesma proporção paramétrica `LatheGeometry` do universo Egg-Man).
        

## 3. Física, Movimentação e Colisão (`player.js`)

Não será utilizado motor de física rígida (Cannon/Rapier). Jogos FPS estilo arena exigem resposta instantânea e deslizamento limpo nas paredes.

### 3.1. Movimentação Livre 360° e Deslizamento (_Wall-Sliding_)

-   O jogador se desloca livremente no plano $XZ$ (Frente/Trás + _Strafe_ Esquerda/Direita) orientado pelo ângulo horizontal (`yaw`) da câmera.
    
-   **Colisão Círculo vs. AABB (Grid):**
    
    -   A posição candidata `(nextX, nextZ)` é testada **separadamente** primeiro no eixo $X$ e depois no eixo $Z$ contra as células sólidas (`GRID[row][col] === 1`) num raio `PLAYER_RADIUS`.
        
    -   Se houver colisão em $X$, apenas o deslocamento em $X$ é bloqueado/ajustado para a borda da parede, permitindo que o jogador continue deslizando suavemente ao longo do eixo $Z$ sem prender nas quinas.
        
    -   A coordenada $Y$ da colisão é travada em `0` (câmera fixa em `EYE_HEIGHT = 1.35`), aplicando apenas uma oscilação senoidal sutil (`weaponBob`) na malha da arma em primeira pessoa.
        

### 3.2. Câmera FPS e Mira

-   **Desktop:** Utiliza a **Pointer Lock API** (`requestPointerLock()`) ao clicar na área de jogo, convertendo `movementX` e `movementY` em rotação suave (`yaw` ilimitado e `pitch` limitado entre `-45°` e `+45°`).
    
-   **Mobile (Paisagem):** Controle _Dual-Touch_ — polegar esquerdo controla um joystick virtual de deslocamento e o arrasto do polegar direito rotaciona a mira, acompanhado de um botão dedicado de disparo.
    

## 4. Sistema de Armas e Power-Ups 3D (`weapons.js`)

### 4.1. Arma Base: Egg-Pistol (Munição Infinita)

-   **Modelo 3D (_Viewmodel_):** Pistola estilizada presa ao canto inferior direito da câmera com animação de recuo (_kickback_) a cada tiro.
    
-   **Mecânica:** Disparo _Hitscan_ instantâneo via `THREE.Raycaster` partindo do centro exato da tela (`NDC: 0, 0`).
    
-   **Atributos:** Cadência de `0.32s` por tiro, dano de `35 HP` (elimina um ovo inimigo padrão de `100 HP` em 3 disparos).
    
-   **Feedback Visual:** Cria um feixe luminoso rápido (_tracer_) da ponta da arma até o ponto de impacto e gera faíscas/fragmentos no local atingido.
    

### 4.2. Itens Colecionáveis na Arena (Formas 3D Temáticas, Duração: `10.0s`)

Espalhados em pedestais estratégicos da arena, rotacionando continuamente no eixo $Y$:

1.  **Moeda / Emblema de Fuzil (`RIFLE` — Mini-Fuzil Dourado Flutuante):**
    
    -   Substitui temporariamente o _viewmodel_ na mão do jogador por um fuzil automático por `10s`.
        
    -   Permite segurar o botão de tiro para rajadas rápidas (`0.10s` de intervalo,  `25 HP` de dano por projétil).
        
2.  **Moeda / Emblema de Escudo (`SHIELD` — Escudo/Cúpula Ciano Translúcida):**
    
    -   Ativa uma barreira energética por `10s` (com borda ciano sutil no HUD) que absorve 100% dos disparos inimigos.
        
3.  **Cápsula de Gema (`HEAL` — Esfera Dourada com Cruz Verde):**
    
    -   Consumo instantâneo: restaura `+40 HP` (até o teto de `100 HP`).
        

## 5. Inimigos Armados e Inteligência Artificial (`enemy.js`)

### 5.1. Visual e Dano Progressivo

-   Ovos gerados com `THREE.LatheGeometry`, equipados com viseira tática e uma pistola 3D apontada para frente.
    
-   **Dano Progressivo:** Cada ovo possui `100 HP`. Ao cair abaixo de `65 HP` e `35 HP`, exibe rachaduras escuras na casca; ao chegar a `0 HP`, explode em 15 fragmentos de casca com gravidade simulada + gema central, somando pontos no placar.
    

### 5.2. Máquina de Estados e Combate Justo

Cada inimigo opera nos estados `PATROL`,  `CHASE` e `ATTACK`:

-   **Linha de Visão (_Line of Sight_):** O inimigo dispara um _raycast_ em direção ao jogador. Se não houver parede bloqueando e a distância for menor que `22` unidades, entra em `ATTACK`.
    
-   **Tiros Desviáveis (Projéteis Visíveis):** Diferente do jogador (que usa _hitscan_ instantâneo), os inimigos disparam **esferas de energia/gema brilhantes** com velocidade moderada (`14 unidades/s`) após um breve brilho de aviso na arma (`0.35s`), permitindo que o jogador veja o tiro vindo pelo corredor e desvie usando cobertura ou movimento lateral.
    

## 6. Arena, Radar 2D e Progressão de Ondas (`mapData.js`, `radar.js`, `main.js`)

-   **Topologia da Arena (`19x19`):** Circuitos interconectados com corredores largos, pátio central com pilares de cobertura e **zero becos sem saída** (validados na inicialização por `validateArenaTopology()`).
    
-   **Minimapa Radar 2D (`radar.js`):**  `<canvas>` circular ou quadrado no canto superior esquerdo mostrando as paredes próximas ao jogador, seta de orientação, pontos de power-up ativos e inimigos detectados.
    
-   **Ondas (_Waves_):** O jogo inicia na **Onda 1** (ex: 4 ovos inimigos). Ao eliminar todos os inimigos da onda, inicia-se a próxima onda após `3s` de respiro, aumentando gradualmente o número de inimigos e reabastecendo os power-ups da arena.
    

## 7. Plano de Implementação Incremental (5 Fases)

1.  **Fase 1 — Núcleo FPS, Arena de Testes, Wall-Sliding e Pistola (Viewmodel):** Criar estrutura base (`index.html`,  `css/style.css`,  `config.js`,  `player.js`,  `main.js`), sala de testes com pilares, movimento 360° com colisão _Circle-vs-AABB_ sem travar nas quinas, Pointer Lock e pistola 3D na mão com recuo.
    
2.  **Fase 2 — Arena Completa, Tiro Hitscan com Tracers e Minimapa Radar:** Implementar `mapData.js`,  `arena.js` e `radar.js`, ativar disparos de pistola com _raycasting_, feixes visuais (_tracers_), partículas de impacto nas paredes e som sintetizado de tiro (`audio.js`).
    
3.  **Fase 3 — Power-Ups 3D Temáticos (Fuzil, Escudo, Cura) e HUD de Combate:** Implementar `weapons.js` com os modelos 3D rotativos dos 3 power-ups, troca dinâmica para o fuzil automático rápido, escudo protetor com temporizador no HUD e barra de HP do jogador.
    
4.  **Fase 4 — Inimigos Armados, IA com Linha de Visão e Quebra de Casca:** Implementar `enemy.js` com ovos inimigos patrulhando, perseguindo ao avistar o jogador, disparando projéteis desviáveis, sofrendo rachaduras progressivas e explodindo em cascas ao serem derrotados.
    
5.  **Fase 5 — Sistema de Ondas, Menu de Configurações (`⚙️`), Suporte Mobile Dual-Touch e Deploy:** Adicionar telas de Start / Game Over, progressão de ondas, menu `⚙️` (sensibilidade da mira, áudio, cor da luva/arma), controles _Dual-Touch_ em paisagem (`100dvh`) e preparação final para GitHub Pages.      