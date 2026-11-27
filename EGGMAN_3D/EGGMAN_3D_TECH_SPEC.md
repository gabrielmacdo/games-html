# Documentação Técnica: Egg-Man 3D

## 1. Visão Geral e Restrições de Infraestrutura
* **Conceito:** Jogo arcade 3D em terceira pessoa inspirado em *Pac-Man*, protagonizado por "Egg-Man" (um ovo estilizado) fugindo e caçando ovos inimigos em um labirinto.
* **Hospedagem:** GitHub Pages (100% estático, client-side, sem backend).
* **Restrições Técnicas:**
  * Zero etapa obrigatória de *build* (uso de ES6 Modules nativos + `importmap` apontando para CDN oficial do Three.js).
  * Geometrias 100% procedurais via código Three.js (dispensa arquivos `.glb`/`.gltf` pesados, mantendo o repositório abaixo de 5 MB).
  * Áudio sintetizado via Web Audio API nativa do navegador.
  * Persistência de recordes (*High Scores*) via `localStorage`.

---

## 2. Estrutura de Diretórios
```text
/
├── index.html          # Canvas WebGL, HUD (placar, vidas) e importmap
├── css/
│   └── style.css       # Estilização minimalista do HUD e tela cheia
└── js/
    ├── config.js       # Constantes globais (dimensões, velocidades, cores)
    ├── mapData.js      # Matriz 2D do labirinto e estados das células
    ├── maze.js         # Geração procedural 3D das paredes, piso e itens
    ├── player.js       # Geometria do Egg-Man, interpolação e fila de comandos
    ├── enemy.js        # IA dos ovos inimigos, estados e pathfinding
    ├── audio.js        # Sintetizador de efeitos via Web Audio API
    └── main.js         # Loop principal (requestAnimationFrame), câmera e colisões
```

---

## 3. Sistema de Coordenadas, Escala e Geometria
O universo lógico opera em **unidades de grid**, onde `1 célula da matriz = TILE_SIZE (2.0 unidades 3D)`. O plano de movimento é o eixo $XZ$, com o piso fixado em $Y = 0$.

| Elemento | Geometria Three.js | Dimensões / Parâmetros |
| :--- | :--- | :--- |
| **Célula do Grid (`TILE_SIZE`)** | Unidade lógica base | `2.0 x 2.0` unidades |
| **Paredes** | `THREE.BoxGeometry` | Largura `2.0`, Altura `1.2`, Profundidade `2.0` (altura reduzida para não obstruir a câmera) |
| **Egg-Man & Inimigos** | `THREE.LatheGeometry` | Perfil paramétrico de ovo; raio máximo `0.65`, altura `1.6` |
| **Bolinha de Ponto** | `THREE.SphereGeometry` | Raio `0.18`, posicionada em $Y = 0.4$ |
| **Moeda de Ovo (Power-Up)** | `THREE.CylinderGeometry` | Raio `0.45`, espessura `0.12`, posicionada em $Y = 0.6$ com rotação contínua no eixo $Y$ |

---

## 4. Regras de Física, Movimento e Colisão
Não utilizar motores de física rígida (Cannon.js/Ammo.js). O jogo utiliza **física determinística baseada em Grid 2D** para garantir curvas precisas sem travamentos nas quinas.

### 4.1. Travamento Vertical (Gravidade Zero / Piso Sólido)
* A posição lógica vertical é travada: `entity.position.y = 0`.
* A animação de caminhada (balanço/pulo) é aplicada apenas na malha visual interna (`mesh.children[0].position.y = Math.abs(Math.sin(walkCycle)) * 0.15`), impedindo qualquer bug de atravessar o piso ou sair voando.

### 4.2. Codificação da Matriz do Labirinto (`GRID[row][col]`)
* `0`: Corredor vazio
* `1`: Parede sólida (intransponível)
* `2`: Corredor com bolinha de ponto
* `3`: Corredor com moeda de poder (Egg Coin)
* `4`: Portão da base dos inimigos (intransponível para o jogador; transponível para inimigos)
* `5`: Túnel de teletransporte lateral (wrap-around horizontal)

### 4.3. Movimentação com Input Buffering
1. O jogador armazena `currentDir` (direção atual) e `nextDir` (última direção pressionada pelo usuário).
2. Quando o Egg-Man atinge o centro de uma célula dentro da margem de tolerância $\epsilon < 0.08$ unidades:
   * Verifica se a célula vizinha na direção `nextDir` é válida (`valor !== 1` e `valor !== 4`).
   * **Se válida:** Alinha a posição do Egg-Man ao centro exato da célula atual e atualiza `currentDir = nextDir`.
   * **Se inválida:** Verifica se `currentDir` continua livre. Se houver parede à frente, interrompe o movimento no centro exato da célula atual.

### 4.4. Colisão entre Entidades (Distância Euclidiana)
Calculada no plano $XZ$ a cada frame:
$$d = \sqrt{(x_{player} - x_{enemy})^2 + (z_{player} - z_{enemy})^2}$$
* **Gatilho de Colisão:** $d < 1.1$ unidades.
* **Resolução:**
  * Se inimigo está em `CHASE` ou `SCATTER`: Egg-Man perde 1 vida; posições são resetadas.
  * Se inimigo está em `FRIGHTENED`: Inimigo é "quebrado" (emite 15 partículas de casca com gravidade simulada por `0.8s`), soma pontos em combo (`200`, `400`, `800`, `1600`) e entra no estado `EATEN`.

---

## 5. Câmera e Controles
* **Tipo:** Câmera em terceira pessoa elevada (*Angled Chase Cam*).
* **Posicionamento:** Offset relativo ao jogador de `(x: 0, y: 11, z: 9)`, olhando para um ponto `2.0` unidades à frente do Egg-Man no eixo $Z$.
* **Comportamento de Rotação:** **Orientação fixa (sem rotação orbital automática)**. A câmera acompanha apenas a translação $(X, Z)$ via interpolação linear (`camera.position.lerp(targetPos, 0.1)`). Isso evita desorientação espacial do jogador em curvas rápidas de 90°.
* **Mapeamento de Controles:**
  * `W` / `Seta Cima`: Norte ($-Z$)
  * `S` / `Seta Baixo`: Sul ($+Z$)
  * `A` / `Seta Esquerda`: Oeste ($-X$)
  * `D` / `Seta Direita`: Leste ($+X$)

---

## 6. Inteligência Artificial dos Ovos Inimigos
Os inimigos tomam decisões de direção exclusivamente ao cruzar o centro de uma célula, escolhendo o vizinho transitável com menor distância euclidiana até sua `targetCell` (proibida inversão de 180° espontânea, exceto na transição para `FRIGHTENED`).

* **Estados Globais:** `SCATTER` (dispersão para cantos), `CHASE` (perseguição), `FRIGHTENED` (vulnerável/azul, velocidade reduzida em 40%), `EATEN` (apenas gema/casca quebrada retornando à base em velocidade 2x).
* **Personalidades:**
  1. **Ovo Vermelho (Perseguidor):** `targetCell` = célula atual do Egg-Man.
  2. **Ovo Rosa (Emboscador):** `targetCell` = 4 células à frente de `player.currentDir`.
  3. **Ovo Azul (Flanqueador):** Vetor dobrado entre a posição do Ovo Vermelho e 2 células à frente do Egg-Man.
  4. **Ovo Laranja (Tímido):** Persegue o Egg-Man se distância $> 8$ células; caso contrário, recua para o canto inferior esquerdo do mapa.

---

## 7. Roteiro de Implementação Incremental (Fases de Validação)

1. **Fase 1 — Núcleo Visual, Personagem e Câmera (Sala de Testes):**
   * Estrutura base (`index.html`, `config.js`, `player.js`, `main.js`).
   * Piso quadriculado aberto, iluminação direcional com sombras e modelo 3D procedural do Egg-Man com animação de caminhada.
   * *Critério de Aceite:* Validar escala visual, fluidez da animação e enquadramento da câmera em terceira pessoa.
2. **Fase 2 — Labirinto 3D e Física de Colisão em Grid:**
   * Implementação de `mapData.js` e `maze.js`.
   * Ativação da matriz de colisão e *input buffering*.
   * *Critério de Aceite:* Navegar por todo o labirinto validando curvas rápidas nas esquinas e confirmando que a altura das paredes (`1.2`) não bloqueia a visão dos corredores.
3. **Fase 3 — Coletáveis, Power-Up e HUD:**
   * Geração das bolinhas de pontos e moedas de ovo rotativas.
   * Placar em tempo real, condição de vitória da fase e efeitos sonoros via Web Audio API (`audio.js`).
   * *Critério de Aceite:* Coletar todos os itens do mapa com contagem precisa e feedback sonoro sincronizado.
4. **Fase 4 — Inimigos, Pathfinding e Mecânica de Quebra:**
   * Criação dos 4 ovos inimigos (`enemy.js`), máquina de estados e sistema de partículas de casca quebrando ao colidir no modo `FRIGHTENED`.
   * *Critério de Aceite:* Validar perseguição funcional, fuga ao coletar a moeda de ovo e retorno à base após serem quebrados.
5. **Fase 5 — Ciclo Completo de Jogo e Deploy:**
   * Sistema de 3 vidas, telas de *Start / Game Over / Vitória*, salvamento de recorde no `localStorage` e suporte a *swipe* touch para dispositivos móveis.
   * *Critério de Aceite:* Jogo completo rodando sem erros de console via GitHub Pages.