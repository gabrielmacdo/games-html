/* ==== CONFIGURAÇÕES GERAIS ==== */
const BOARD_SIZE = 10;
const TURN_TIME = 30; // Segundos

// Tamanho dos navios para cada modo de jogo (em quadrados)
const MODES = {
    1: [4, 3, 2, 1], // 4 navios
    2: [4, 3, 2, 2, 1, 1], // 6 navios
    3: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] // 10 navios
};

/* ==== ESTADO DA APLICAÇÃO ==== */
const state = {
    player: {
        name: '',
        isHost: false,
        ready: false,
        board: [], // 10x10 Matriz. 0=água, 1=navio, 2=miss, 3=hit
        ships: [], // array com { id, squares: [[r,c],...], isSunk }
        shipsLeft: 0
    },
    enemy: {
        name: '',
        ready: false,
        board: [], // 10x10 Matriz para tiros. 0=desconhecido, 2=miss, 3=hit
        shipsLeft: 0
    },
    mode: 1, // Padrão
    myTurn: false,
    timerInterval: null,
    timeRemaining: TURN_TIME,
    peer: null,
    conn: null,

    // UI de Preparação da Frota
    shipHorizontal: true,
    selectedShip: null, // { size, elementId, index }
    shipsPlaced: 0,
    totalShips: 0,

    gameStarted: false
};

/* ==== INICIALIZAÇÃO DA UI ==== */
document.addEventListener('DOMContentLoaded', () => {

    // Inicializar Matrizes com 0
    state.player.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    state.enemy.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));

    /* === EVENTOS LOBBY === */
    document.getElementById('btn-create').addEventListener('click', () => {
        const name = document.getElementById('player-name').value.trim();
        if (!name) return alert("Por favor, digite seu nome!");

        state.player.name = name;
        state.player.isHost = true;
        state.mode = parseInt(document.getElementById('game-mode').value);

        document.getElementById('host-info').classList.remove('hidden');
        document.getElementById('share-code').innerText = "Gerando ID...";
        initPeerJS(true);
    });

    document.getElementById('btn-join').addEventListener('click', () => {
        const name = document.getElementById('player-name').value.trim();
        const hostId = document.getElementById('join-id').value.trim();
        if (!name) return alert("Por favor, digite seu nome!");
        if (!hostId) return alert("Por favor, digite o ID da partida!");

        state.player.name = name;
        state.player.isHost = false;
        initPeerJS(false, hostId);
    });

    /* === EVENTOS PREPARAÇÃO === */
    document.getElementById('btn-rotate').addEventListener('click', () => {
        state.shipHorizontal = !state.shipHorizontal;
        document.getElementById('rotate-status').innerText = state.shipHorizontal ? "Horizontal" : "Vertical";
    });

    document.getElementById('btn-ready').addEventListener('click', () => {
        if (state.shipsPlaced < state.totalShips) {
            return alert("Posicione todos os navios antes de confirmar!");
        }

        state.player.ready = true;
        document.getElementById('btn-ready').disabled = true;
        document.getElementById('btn-ready').innerText = "Aguardando Inimigo...";
        document.getElementById('ready-status').classList.remove('hidden');

        // Avisar o inimigo via P2P que estou pronto
        sendMessage({ type: 'READY' });

        checkBothReady();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
        window.location.reload();
    });

    // Resetar Frogta (Limpar Mapa)
    document.getElementById('btn-reset').addEventListener('click', () => {
        // Limpar matriz
        state.player.board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
        state.player.ships = [];
        state.shipsPlaced = 0;
        state.selectedShip = null;

        // Limpar UI Grid
        document.querySelectorAll('#prep-grid .cell.ship').forEach(cell => {
            cell.classList.remove('ship');
            cell.classList.add('water');
        });

        // Resetar fila visual
        document.querySelectorAll('.ship-item').forEach(item => {
            item.classList.remove('placed', 'selected');
        });

        document.getElementById('btn-ready').disabled = true;
        document.getElementById('btn-ready').innerText = "Iniciar Combate";
        showToast("Seu mapa foi limpo.");
    });

    // Espalhar Navios Aleatoriamente
    document.getElementById('btn-random').addEventListener('click', () => {
        document.getElementById('btn-reset').click(); // Limpa tudo primeiro

        const ships = MODES[state.mode];

        ships.forEach((size, index) => {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const isHon = Math.random() >= 0.5;
                const r = Math.floor(Math.random() * BOARD_SIZE);
                const c = Math.floor(Math.random() * BOARD_SIZE);

                if (isValidPlacement(r, c, size, isHon)) {
                    state.selectedShip = { size, elementId: `ship-item-${index}`, index };
                    state.shipHorizontal = isHon;
                    placeShip(r, c, size, isHon);
                    placed = true;
                }
                attempts++;
            }
        });
        showToast("Frota posicionada aleatoriamente!");
    });

    /* === EVENTO COPIAR ID === */
    document.getElementById('btn-copy').addEventListener('click', async () => {
        const code = document.getElementById('share-code').innerText;
        if (code && code !== "Gerando ID...") {
            try {
                await navigator.clipboard.writeText(code);
                const btn = document.getElementById('btn-copy');
                const originalHTML = btn.innerHTML;

                // Ícone de check de sucesso
                btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                btn.style.backgroundColor = 'var(--accent)';

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.backgroundColor = '';
                }, 2000);
            } catch (err) {
                console.error('Falha ao copiar:', err);
                alert('Não foi possível copiar o código automaticamente. Tente selecionar e copiar manualmente.');
            }
        }
    });

    /* === PROTEÇÃO CONTRA SAÍDA ACIDENTAL === */
    window.addEventListener('beforeunload', (e) => {
        // Só exibe o aviso se o jogador já estiver conectado a uma sala ou jogando
        if (state.peer && !state.peer.disconnected) {
            const confirmationMessage = 'Você está em uma partida! Se sair agora, você perderá seu progresso e o adversário será desconectado.';
            e.returnValue = confirmationMessage; // Padrão antigo
            return confirmationMessage; // Padrão novo (embora modernos substituam o texto)
        }
    });
});

/* ==== FUNÇÕES PEERJS (WEB RTC / REDE P2P) ==== 
 * Esta seção gerencia a comunicação P2P entre os navegadores.
 * Usamos a núvem do PeerJS para handshakes e WebRTC para enviar JSON com payloads state.
 */
function initPeerJS(isHost, hostId = null) {
    updateStatus("Conectando ao servidor...", false);

    state.peer = new Peer();

    state.peer.on('open', (id) => {
        if (isHost) {
            updateStatus("Aguardando adversário...", false);
            document.getElementById('share-code').innerText = id;

            // Host aguarda conexão de um Client
            state.peer.on('connection', (conn) => {
                setupConnection(conn);
            });
        } else {
            updateStatus("Conectando ao Host...", false);
            // Client conecta ao Host inserido no campo
            const conn = state.peer.connect(hostId);
            setupConnection(conn);
        }
    });

    state.peer.on('error', (err) => {
        console.error(err);
        updateStatus("Erro na conexão: " + err.type, true);
        alert("Erro no PeerJS: Você pode ter digitado o ID errado ou perdido conexão.");
    });
}

// Configura os ouvintes de ambos os lados da conexão
function setupConnection(conn) {
    state.conn = conn;

    conn.on('open', () => {
        updateStatus("Conectado! Sincronizando...", false);

        // Se eu for client, envio meu JOIN com nome
        if (!state.player.isHost) {
            sendMessage({
                type: 'JOIN',
                name: state.player.name
            });
        } else {
            // Se eu for Host, aviso qual é o modo de jogo e envio meu nome
            sendMessage({
                type: 'INIT',
                name: state.player.name,
                mode: state.mode
            });
        }
    });

    conn.on('data', handleData);

    conn.on('close', () => {
        updateStatus("Adversário desconectou.", true);
        alert("O adversário se desconectou inesperadamente da partida.");
    });
}

function sendMessage(data) {
    if (state.conn && state.conn.open) {
        state.conn.send(data);
    }
}

// Protocolo de interpretação de mensagens recebidas
function handleData(data) {
    // console.log("Recebido via WebRTC:", data); // Para debug, manter escondido

    switch (data.type) {
        case 'JOIN':
            // Host recebeu JOIN
            state.enemy.name = data.name;
            updateStatus(`Conectado com ${state.enemy.name}!`, false);
            transitionToPrep();
            break;

        case 'INIT':
            // Client recebeu INIT (força sincronização do modo de jogo)
            state.enemy.name = data.name;
            state.mode = data.mode;
            updateStatus(`Conectado com ${state.enemy.name}!`, false);
            transitionToPrep();
            break;

        case 'READY':
            // Adversário confirmou o layout do mapa
            state.enemy.ready = true;
            checkBothReady();
            break;

        case 'GAME_START':
            // Inicia o jogo formalmente
            state.myTurn = data.firstTurnIsHost === state.player.isHost;
            startCombat();
            break;

        case 'SHOOT':
            // Inimigo clicou no meu mapa (r, c)
            handleIncomingShot(data.row, data.col);
            break;

        case 'RESULT':
            // Resultados do meu tiro em mapa inimigo
            handleShotResult(data.row, data.col, data.status, data.sunkInfo);
            break;

        case 'TIME_SYNC':
            // Sincronizando o tempo (se sou Client)
            if (!state.player.isHost) {
                state.timeRemaining = data.time;
                updateTimerDisplay();
            }
            break;

        case 'TURN_PASS':
            // Tempo acabou comandado pelo Host
            passTurn(false);
            break;

        case 'GAME_OVER':
            // Adversário admite que perdeu (não tem navios)
            showGameOver(true);
            break;
    }
}

function updateStatus(msg, isError) {
    const el = document.getElementById('connection-status');
    el.innerText = msg;
    if (isError) {
        el.className = 'error';
    } else if (msg.includes("Conectado") || msg.includes("Batalha")) {
        el.className = 'connected';
    } else {
        el.className = '';
    }
}

/* ==== PREPARAÇÃO DA FROTA ==== */
function transitionToPrep() {
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('hidden');

    document.getElementById('prep-screen').classList.remove('hidden');
    document.getElementById('prep-screen').classList.add('active');

    document.getElementById('prep-player-name').innerText = state.player.name;

    state.totalShips = MODES[state.mode].length;
    state.player.shipsLeft = state.totalShips;
    state.enemy.shipsLeft = state.totalShips;

    renderPrepGrid();
    renderFleetSelection();
}

// Renderiza a tabela do jogador para por os barcos nela.
function renderPrepGrid() {
    const grid = document.getElementById('prep-grid');
    grid.innerHTML = '';

    // Rótulos Horizontais (Coordenada C)
    grid.appendChild(createCell('', 'label'));
    for (let c = 0; c < BOARD_SIZE; c++) {
        grid.appendChild(createCell(String.fromCharCode(65 + c), 'label'));
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
        // Rótulos Verticais (Coordenada R)
        grid.appendChild(createCell(r + 1, 'label'));

        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = createCell('', 'water');
            cell.dataset.r = r;
            cell.dataset.c = c;

            // Configurar interatividade apenas na Preparação
            cell.addEventListener('mouseenter', handleGridHover);
            cell.addEventListener('mouseleave', clearGridHover);
            cell.addEventListener('click', handleGridClick);

            grid.appendChild(cell);
        }
    }
}

function createCell(text, className) {
    const d = document.createElement('div');
    d.className = `cell ${className}`;
    d.innerText = text;
    return d;
}

// Gera a interface dos barcos que faltam para posicionar
function renderFleetSelection() {
    const list = document.getElementById('fleet-list');
    list.innerHTML = '';
    const ships = MODES[state.mode];

    ships.forEach((size, index) => {
        const item = document.createElement('div');
        item.className = 'ship-item';
        item.id = `ship-item-${index}`;
        item.dataset.size = size;

        // Criar UI com vários blocos (visual da length)
        for (let i = 0; i < size; i++) {
            const seg = document.createElement('div');
            seg.className = 'ship-segment';
            item.appendChild(seg);
        }

        item.addEventListener('click', () => {
            if (item.classList.contains('placed')) return;

            document.querySelectorAll('.ship-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');

            state.selectedShip = { size, elementId: item.id, index };
        });

        list.appendChild(item);
    });
}

/* 
 * Lógica de Validação de Colisão do Grid
 * Verifica se um navio pode ser posicionado nas coordenadas (r, c).
 * 1. Verifica limites do mapa.
 * 2. Verifica se a célula já está ocupada.
 */
function isValidPlacement(r, c, size, isHorizontal) {
    if (isHorizontal) {
        if (c + size > BOARD_SIZE) return false;
    } else {
        if (r + size > BOARD_SIZE) return false;
    }

    for (let i = 0; i < size; i++) {
        const checkR = isHorizontal ? r : r + i;
        const checkC = isHorizontal ? c + i : c;
        if (state.player.board[checkR][checkC] !== 0) { // Célula já ocupada
            return false;
        }
    }
    return true;
}

// Hover sobre o Grid (Visualização em Verde/Vermelho)
function handleGridHover(e) {
    if (!state.selectedShip) return;

    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    const size = state.selectedShip.size;
    const isHon = state.shipHorizontal;

    const valid = isValidPlacement(r, c, size, isHon);
    const clazz = valid ? 'hover-valid' : 'hover-invalid';

    for (let i = 0; i < size; i++) {
        const drawR = isHon ? r : r + i;
        const drawC = isHon ? c + i : c;

        if (drawR < BOARD_SIZE && drawC < BOARD_SIZE) {
            const cell = document.querySelector(`#prep-grid .cell[data-r="${drawR}"][data-c="${drawC}"]`);
            if (cell) cell.classList.add(clazz);
        }
    }
}

function clearGridHover() {
    document.querySelectorAll('#prep-grid .cell').forEach(c => {
        c.classList.remove('hover-valid', 'hover-invalid');
    });
}

// Clicar e Posicionar ou Remover
function handleGridClick(e) {
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);

    // Se clicou em um navio já posicionado -> REMOVER NAVIO
    if (state.player.board[r][c] === 1) {
        removeShipAt(r, c);
        return;
    }

    if (!state.selectedShip) return;

    const size = state.selectedShip.size;
    const isHon = state.shipHorizontal;

    if (isValidPlacement(r, c, size, isHon)) {
        placeShip(r, c, size, isHon);
    }
}

// Remove o navio que contém a coordenada (r, c)
function removeShipAt(r, c) {
    // 1. Encontrar qual navio possui essa coordenada
    const shipIndex = state.player.ships.findIndex(s => s.squares.some(sq => sq[0] === r && sq[1] === c));
    if (shipIndex === -1) return;

    const ship = state.player.ships[shipIndex];

    // 2. Limpar a matriz e a UI
    ship.squares.forEach(sq => {
        state.player.board[sq[0]][sq[1]] = 0;
        const cell = document.querySelector(`#prep-grid .cell[data-r="${sq[0]}"][data-c="${sq[1]}"]`);
        cell.classList.remove('ship');
        cell.classList.add('water');
    });

    // 3. Devolver o item para a lista lateral (habilitar clique de novo)
    const fleetItem = document.getElementById(`ship-item-${ship.id}`);
    if (fleetItem) fleetItem.classList.remove('placed');

    // 4. Remover da array de navios posicionados
    state.player.ships.splice(shipIndex, 1);

    state.shipsPlaced--;

    // 5. Desabilitar botão Pronto
    document.getElementById('btn-ready').disabled = true;
    document.getElementById('btn-ready').innerText = "Iniciar Combate";

    showToast("Navio retornado à frota.");
}

// Efetua posicionamento nos bytes e na UI
function placeShip(r, c, size, isHon) {
    const squares = [];

    for (let i = 0; i < size; i++) {
        const drawR = isHon ? r : r + i;
        const drawC = isHon ? c + i : c;

        state.player.board[drawR][drawC] = 1; // 1 = Navio Ocupado
        squares.push([drawR, drawC]);

        const cell = document.querySelector(`#prep-grid .cell[data-r="${drawR}"][data-c="${drawC}"]`);
        cell.classList.remove('water', 'hover-valid', 'hover-invalid');
        cell.classList.add('ship');
    }

    state.player.ships.push({
        id: state.selectedShip.index,
        squares: squares,
        isSunk: false
    });

    const fleetItem = document.getElementById(state.selectedShip.elementId);
    fleetItem.classList.remove('selected');
    fleetItem.classList.add('placed'); // Fica bloqueado na lista visual

    state.selectedShip = null;
    clearGridHover();
    state.shipsPlaced++;

    if (state.shipsPlaced === state.totalShips) {
        document.getElementById('btn-ready').disabled = false;
        document.getElementById('btn-ready').innerText = "Iniciar Combate";
    }
}

// Acionador do início do game
function checkBothReady() {
    if (state.player.ready && state.enemy.ready) {
        if (state.player.isHost) {
            // Sendo HOST, decide aleatóriamente quem inicia.
            const firstTurnIsHost = Math.random() >= 0.5;
            state.myTurn = firstTurnIsHost;

            sendMessage({
                type: 'GAME_START',
                firstTurnIsHost: firstTurnIsHost
            });

            startCombat();
        } else if (state.gameStarted) {
            // Em caso de falha transitória (o host mandou Start e o Ready do client esbarrou).
        }
    }
}

/* ==== COMBATE ==== */
function startCombat() {
    if (state.gameStarted) return;
    state.gameStarted = true;

    document.getElementById('prep-screen').classList.remove('active');
    document.getElementById('prep-screen').classList.add('hidden');

    document.getElementById('combat-screen').classList.remove('hidden');
    document.getElementById('combat-screen').classList.add('active');

    updateStatus("Batalha em Andamento!", false);
    document.getElementById('ships-left').innerText = state.player.shipsLeft;
    document.getElementById('enemy-ships-left').innerText = state.enemy.shipsLeft;

    renderCombatGrids();
    updateTurnUI(); // Prepara cronômetro
}

function renderCombatGrids() {
    // 1. Grid do Inimigo: Onde vamos atirar (inicialmente tudo água/coberto)
    const targetGrid = document.getElementById('target-grid');
    targetGrid.innerHTML = '';

    targetGrid.appendChild(createCell('', 'label'));
    for (let c = 0; c < BOARD_SIZE; c++) targetGrid.appendChild(createCell(String.fromCharCode(65 + c), 'label'));
    for (let r = 0; r < BOARD_SIZE; r++) {
        targetGrid.appendChild(createCell(r + 1, 'label'));
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = createCell('', 'water');
            cell.dataset.r = r;
            cell.dataset.c = c;

            // Só ouve clique pra disparo
            cell.addEventListener('click', () => handleShotFire(r, c));
            targetGrid.appendChild(cell);
        }
    }

    // 2. Nosso Mapa para Receber Tiros: Cópia estática visual do prep-grid
    const playerGrid = document.getElementById('player-grid');
    playerGrid.innerHTML = '';

    playerGrid.appendChild(createCell('', 'label'));
    for (let c = 0; c < BOARD_SIZE; c++) playerGrid.appendChild(createCell(String.fromCharCode(65 + c), 'label'));
    for (let r = 0; r < BOARD_SIZE; r++) {
        playerGrid.appendChild(createCell(r + 1, 'label'));
        for (let c = 0; c < BOARD_SIZE; c++) {
            const val = state.player.board[r][c];
            const className = val === 1 ? 'ship' : 'water';
            const cell = createCell('', className);
            cell.id = `my-cell-${r}-${c}`; // Marca id pra manipular visual dps (hit/miss)
            playerGrid.appendChild(cell);
        }
    }
}

/* === LÓGICA DE TURNOS E CRONÔMETRO === */
function updateTurnUI() {
    const indicator = document.getElementById('turn-indicator');
    const header = document.querySelector('.combat-header');

    // Reseta Timer p/ 30s
    clearInterval(state.timerInterval);
    state.timeRemaining = TURN_TIME;
    updateTimerDisplay();

    // Troca UI
    if (state.myTurn) {
        indicator.innerText = "Seu Turno! (Atire / Tempo correndo)";
        indicator.style.color = "var(--accent)";
        header.classList.add('my-turn');
        header.classList.remove('enemy-turn');

        // Desbloqueia grid de target
        document.getElementById('target-grid').style.pointerEvents = 'auto';
    } else {
        indicator.innerText = `Turno de ${state.enemy.name}...`;
        indicator.style.color = "var(--danger)";
        header.classList.remove('my-turn');
        header.classList.add('enemy-turn');

        // Bloqueia target
        document.getElementById('target-grid').style.pointerEvents = 'none';
    }

    startTimer(); // Liga o countdown regreassivo
}

function startTimer() {
    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();

        // Host sincroniza com Client a cada segundo para ser a fonte da verdade
        if (state.player.isHost) {
            sendMessage({ type: 'TIME_SYNC', time: state.timeRemaining });

            // Timeout -> força repasse automático do turno
            if (state.timeRemaining <= 0) {
                forceTurnChange();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    el.innerText = `Tempo: ${state.timeRemaining}s`;

    if (state.timeRemaining <= 10) el.classList.add('warning'); // Fica vermelho/pulsando
    else el.classList.remove('warning');
}

// Timeout gerenciado pelo Host
function forceTurnChange() {
    passTurn(true);
}

// Disparar o canhão (Ação manual do player no grid)
function handleShotFire(r, c) {
    if (!state.myTurn) return;
    if (state.enemy.board[r][c] !== 0) return; // Ja atirou ali

    // Trava instantaneamente pra não clicar 2x
    document.getElementById('target-grid').style.pointerEvents = 'none';
    clearInterval(state.timerInterval); // Pára o relógio imediatamente ao atirar

    sendMessage({
        type: 'SHOOT',
        row: r,
        col: c
    });
}

// Recebi o pacote "SHOOT" (Inimigo atirou no MEU NAVIO)
function handleIncomingShot(r, c) {
    let status = 'miss';
    let sunkInfo = null; // Guardará info se foi Fatal praquele Navio Inteiro

    if (state.player.board[r][c] === 1) {
        // HIT (Colisão)
        state.player.board[r][c] = 3;
        status = 'hit';

        // Altera Visual da minha Célula para Vermelho com [X] (Hit)
        const myCell = document.getElementById(`my-cell-${r}-${c}`);
        myCell.className = "cell hit";

        // Checar Morte do Barco
        sunkInfo = checkMyShipSunk(r, c);

        if (sunkInfo) {
            state.player.shipsLeft--; // Se o navio inteiro foi hitado, contabiliza destruído
            document.getElementById('ships-left').innerText = state.player.shipsLeft;
        }
    } else {
        // MISS (Caiu na Água)
        state.player.board[r][c] = 2; // Estado visual (Mar azul com [•])
        const myCell = document.getElementById(`my-cell-${r}-${c}`);
        myCell.className = "cell water miss";
    }

    // Devolve Payload WebRTC Result p/ Atirador renderizar lá a resposta
    sendMessage({
        type: 'RESULT',
        row: r,
        col: c,
        status: status,
        sunkInfo: sunkInfo
    });

    // Confere GameOver!
    verifyWinCondition();

    // Só passa turno se o jogo fluir
    if (state.player.shipsLeft > 0) {
        passTurn(false);
    }
}

// Validando dano aos módulos inteiros do mesmo navio
function checkMyShipSunk(r, c) {
    const ship = state.player.ships.find(s => s.squares.some(sq => sq[0] === r && sq[1] === c));
    if (!ship) return null;

    // Array com todas partes foi varrido para ver se todas elas valem '3' (Atingido)
    const allHit = ship.squares.every(sq => state.player.board[sq[0]][sq[1]] === 3);

    if (allHit && !ship.isSunk) {
        ship.isSunk = true;

        // Efeito Visual de Afundado no nosso próprio mapa (Player)
        ship.squares.forEach(sq => {
            const cell = document.getElementById(`my-cell-${sq[0]}-${sq[1]}`);
            if (cell) cell.classList.add('sunk');
        });

        return { squares: ship.squares }; // Retorna pra mostrar visual no inimigo
    }

    return null;
}

// Tratando a Resposta (Atirador recebe o Payload do Result do Inimigo)
function handleShotResult(r, c, status, sunkInfo) {
    const cell = document.querySelector(`#target-grid .cell[data-r="${r}"][data-c="${c}"]`);

    if (status === 'hit') {
        state.enemy.board[r][c] = 3;

        // Rigor no feedback exigido: célula vira vermelha. A classe .hit em style.css traz bg red e flex c/ [X]
        cell.className = "cell hit";

        if (sunkInfo) {
            state.enemy.shipsLeft--;
            document.getElementById('enemy-ships-left').innerText = state.enemy.shipsLeft;

            // Suco Visual Extremo: Borda e brilho em navios Inimigos Afundados
            sunkInfo.squares.forEach(sq => {
                const affectedCell = document.querySelector(`#target-grid .cell[data-r="${sq[0]}"][data-c="${sq[1]}"]`);
                if (affectedCell) {
                    affectedCell.classList.add('sunk', 'ship'); // add ship pra puxar styles em comum se precisar
                }
            });

            showToast("Navio inimigo afundado! 🎯");
        }
    } else {
        state.enemy.board[r][c] = 2;
        // Rigor no feedback: erro fica class 'miss' (Azul mar profundo com •)
        cell.className = "cell water miss";
    }

    verifyWinCondition();

    if (state.enemy.shipsLeft > 0) {
        passTurn(false);
    }
}

// Modificador Central de Troca de Turnos
function passTurn(isForcedHost) {
    state.myTurn = !state.myTurn;
    updateTurnUI();

    // Se o evento foi disparado pelo Host via Estouro de 30s, manda forçar pro adversário
    if (isForcedHost && state.player.isHost) {
        sendMessage({ type: 'TURN_PASS' });
    }
}

/* ==== CONDIÇÃO DE VITÓRIA E GAMEOVER ==== */
function verifyWinCondition() {
    if (state.player.shipsLeft <= 0) {
        // Eu declaro que perdi porque todas minhas naves afundaram
        showGameOver(false);
        sendMessage({ type: 'GAME_OVER' });
    } else if (state.enemy.shipsLeft <= 0) {
        // O inimigo perdeu
        showGameOver(true);
    }
}

function showGameOver(iWon) {
    clearInterval(state.timerInterval);
    document.getElementById('target-grid').style.pointerEvents = 'none';

    const modal = document.getElementById('game-over-modal');
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-msg');

    if (iWon) {
        title.innerText = "VITÓRIA!";
        title.style.color = "var(--accent)";
        msg.innerText = `Parabéns Almirante ${state.player.name}, você destruiu a frota de ${state.enemy.name}!`;
    } else {
        title.innerText = "DERROTA!";
        title.style.color = "var(--danger)";
        msg.innerText = `Sua frota foi aniquilada pelo Almirante ${state.enemy.name}.`;
    }

    modal.classList.remove('hidden');
}

/* ==== UTILITÁRIOS & QoL ==== */
function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;

    container.appendChild(toast);

    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Tempo de exibição e remoção
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300); // 300ms do CSS transition
    }, 3000);
}
