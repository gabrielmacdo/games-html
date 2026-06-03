/**
 * GERENCIADOR DE ÁUDIO NATIVO
 */
const SoundManager = (() => {
    let audioCtx = null;

    function init() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playTone(freq, type, duration, vol = 0.1) {
        init();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }

    return {
        buzzer: () => { playTone(180, 'sawtooth', 0.4, 0.2); },
        acerto: () => { 
            playTone(523.25, 'sine', 0.15, 0.2); 
            setTimeout(() => playTone(659.25, 'sine', 0.3, 0.2), 120);
        },
        erro: () => { 
            playTone(220, 'triangle', 0.25, 0.2); 
            setTimeout(() => playTone(196, 'triangle', 0.4, 0.2), 180);
        },
        ticTac: () => { playTone(880, 'square', 0.03, 0.03); }
    };
})();

/**
 * LÓGICA DO JOGO E CAMADA DE REDE (QUIZ KIDS INTERATIVO)
 */
const GameNetwork = (() => {
    // Variáveis Globais de Estado
    let bancoDePerguntas = [];
    let perguntaAtual = null;
    let metaDePontos = 30;
    let gameType = 'full'; // 'full' ou 'simples'
    let myRole = null; // 'host' ou 'player'
    let currentOptions = [];
    let opcaoSelecionadaTemporaria = null;

    // Conexões P2P (Modo Full)
    let peer = null;
    let hostConnections = {};
    let roomCode = "";
    let isBuzzerLocked = true;
    let teamScores = {};
    let currentAnsweringTeam = null;
    let hostConnection = null;
    let myTeamName = "";

    // Prevenção contra saída acidental da página
    window.addEventListener('beforeunload', function (e) {
        if (myRole !== null) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // --- ENTRADA NO MODO SIMPLES (1 Aparelho) ---
    function startSimplesMode() {
        gameType = 'simples';
        myRole = 'host';
        
        metaDePontos = parseInt(prompt("🏆 Quantos pontos para ganhar o jogo?", "30")) || 30;
        
        teamScores = { "Time Azul": 0, "Time Amarelo": 0 };
        
        document.getElementById('host-team1-name').textContent = "Time Azul";
        document.getElementById('host-team2-name').textContent = "Time Amarelo";
        document.getElementById('host-team1-score').textContent = "0";
        document.getElementById('host-team2-score').textContent = "0";

        // Ajusta a interface escondendo controles de rede e exibindo o botão local
        document.getElementById('host-controls-full').style.display = 'none';
        document.getElementById('btn-liberar-rodada-local').style.display = 'block';

        showScreen('screen-game-host');
        exibirProximaPergunta();
    }

    // --- INICIALIZAÇÃO DO HOST (Modo Full) ---
    function initHost() {
        gameType = 'full';
        myRole = 'host';
        
        roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const customPeerId = 'QUIZMASTER-' + roomCode;

        peer = new Peer(customPeerId);

        peer.on('open', () => {
            document.getElementById('lbl-room-code').textContent = roomCode;
            showScreen('screen-lobby-host');
        });

        peer.on('connection', (conn) => {
            conn.on('open', () => {
                hostConnections[conn.peer] = conn;
            });

            conn.on('data', (data) => {
                handleIncomingData(data, conn);
            });

            conn.on('close', () => {
                delete hostConnections[conn.peer];
                atualizarListaDeTimesNoLobby();
            });
        });

        peer.on('error', (err) => {
            console.error(err);
            alert("Erro na conexão: " + err.type);
        });
    }

    // --- INICIALIZAÇÃO DO JOGADOR (Modo Full) ---
    function initPlayer(inputRoomCode, teamName) {
        myTeamName = teamName;
        myRole = 'player';

        sessionStorage.setItem('quizRoomCache', inputRoomCode);
        sessionStorage.setItem('quizTeamCache', teamName);

        peer = new Peer();

        peer.on('open', () => {
            const targetHostId = 'QUIZMASTER-' + inputRoomCode.toUpperCase();
            hostConnection = peer.connect(targetHostId, { reliable: true });

            hostConnection.on('open', () => {
                document.getElementById('player-team-name').textContent = "Time: " + teamName;
                showScreen('screen-game-player');

                sendToHost({
                    type: 'JOIN_ROOM',
                    payload: { nome_time: teamName }
                });
            });

            hostConnection.on('data', (data) => {
                handleIncomingData(data);
            });

            hostConnection.on('close', () => {
                alert('A conexão com o Apresentador terminou.');
                showScreen('screen-home');
            });
        });

        peer.on('error', (err) => {
            if (err.type === 'peer-unavailable') {
                alert("Sala não encontrada! Verifique o código.");
            }
        });
    }

    function atualizarListaDeTimesNoLobby() {
        const ul = document.getElementById('host-teams-list');
        const btnStart = document.getElementById('btn-start-game');
        const times = Object.values(hostConnections).map(c => c.teamName).filter(nome => nome); 
        
        ul.innerHTML = '';
        if (times.length > 0) {
            ul.innerHTML += `<li style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: var(--success);">✅ <strong>${times[0]}</strong> conectado!</li>`;
        } else {
            ul.innerHTML += `<li style="padding: 10px; border-bottom: 1px solid #e2e8f0;">⏳ Aguardando Time 1...</li>`;
        }
        
        if (times.length > 1) {
            ul.innerHTML += `<li style="padding: 10px; color: var(--success);">✅ <strong>${times[1]}</strong> conectado!</li>`;
            btnStart.classList.remove('disabled');
        } else {
            ul.innerHTML += `<li style="padding: 10px;">⏳ Aguardando Time 2...</li>`;
            btnStart.classList.add('disabled');
        }
    }

    function startGame() {
        if (myRole === 'host') {
            const times = Object.values(hostConnections).map(c => c.teamName).filter(nome => nome);
            if (times.length < 2) return;

            teamScores[times[0]] = 0;
            teamScores[times[1]] = 0;

            document.getElementById('host-team1-name').textContent = times[0];
            document.getElementById('host-team2-name').textContent = times[1];

            metaDePontos = parseInt(document.getElementById('config-target-score').value) || 30;
            showScreen('screen-game-host');

            broadcastToPlayers({
                type: 'GAME_STARTED',
                payload: { times: times }
            });
            exibirProximaPergunta();
        }
    }

    // --- FLUXO E CONTROLADORES LOCAIS (MODO SIMPLES) ---
    function liberarRodadaLocal() {
        document.getElementById('host-view-presenter').style.display = 'none';
        document.getElementById('host-view-kids').style.display = 'flex';
    }

    function selecionarOpcaoKids(index) {
        opcaoSelecionadaTemporaria = index;
        for(let i = 0; i < 4; i++) {
            document.getElementById('btn-kid-' + i).className = "btn btn-outline";
        }
        document.getElementById('btn-kid-' + index).className = "btn btn-primary";
        document.getElementById('area-confirmacao-apresentador').style.display = 'flex';
    }

    function confirmarRespostaLocal(timeGanhador) {
        if (opcaoSelecionadaTemporaria === null) return;

        document.getElementById('host-view-kids').style.display = 'none';
        document.getElementById('host-view-presenter').style.display = 'flex';

        const textoEscolhido = perguntaAtual.opcoes[opcaoSelecionadaTemporaria];
        const isCorreta = (textoEscolhido === perguntaAtual.resposta_correta);

        if (timeGanhador !== 'Nenhum') {
            currentAnsweringTeam = timeGanhador;
            evaluateAnswer(isCorreta);
        } else {
            SoundManager.erro();
            const questionBox = document.getElementById('presenter-question-box');
            questionBox.innerHTML += `<div style="margin-top: 15px; color: var(--danger); font-weight: bold; font-size: 1.3rem;">💀 Ninguém acertou essa rodada!</div>`;
            setTimeout(() => { checkWinCondition(); }, 2500);
        }
    }

    // --- EXIBIÇÃO DE PERGUNTAS COMPARTILHADA ---
    function exibirProximaPergunta() {
        if (bancoDePerguntas.length === 0) {
            alert("O jogo acabou! Não há mais perguntas disponíveis.");
            return;
        }

        perguntaAtual = bancoDePerguntas.pop();
        opcaoSelecionadaTemporaria = null;

        // Reset visual do Host
        document.getElementById('host-view-presenter').style.display = 'flex';
        document.getElementById('host-view-kids').style.display = 'none';
        document.getElementById('area-confirmacao-apresentador').style.display = 'none';

        document.getElementById('presenter-question-box').innerHTML = `
            <span style="font-size: 0.9rem; color: var(--text-muted); display: block; margin-bottom: 10px;">
                🎈 Categoria: ${perguntaAtual.categoria}
            </span>
            <div style="font-size: 1.6rem;">${perguntaAtual.pergunta}</div>
        `;
        document.getElementById('txt-resposta-correta').textContent = perguntaAtual.resposta_correta;

        // Monta botões das crianças (Modo Simples)
        const letras = ['A', 'B', 'C', 'D'];
        for(let i = 0; i < 4; i++) {
            const btnKid = document.getElementById('btn-kid-' + i);
            btnKid.className = "btn btn-outline";
            btnKid.textContent = `${letras[i]}) ${perguntaAtual.opcoes[i]}`;
        }

        if (gameType === 'full') {
            isBuzzerLocked = true;
            broadcastToPlayers({
                type: 'NOVA_PERGUNTA',
                payload: { pergunta: perguntaAtual, modo: 2 } // Forçado Modo Múltipla Escolha
            });
        }
    }

    // --- ROTEADOR CENTRAL DE MENSAGENS P2P ---
    function handleIncomingData(message, conn = null) {
        console.log("Recebido:", message);

        switch (message.type) {
            case 'JOIN_ROOM':
                if (myRole === 'host') {
                    conn.teamName = message.payload.nome_time; 
                    atualizarListaDeTimesNoLobby();
                }
                break;

            case 'BUZZER_HIT':
                if (myRole === 'host' && !isBuzzerLocked) {
                    isBuzzerLocked = true; 
                    SoundManager.buzzer();
                    currentAnsweringTeam = message.payload.time;
                    
                    document.getElementById('presenter-question-box').innerHTML += `<div style="margin-top: 10px; color: var(--danger); font-weight: bold;">🚨 ${currentAnsweringTeam} BATEU PRIMEIRO!</div>`;
                    
                    broadcastToPlayers({
                        type: 'BUZZER_RESULT',
                        payload: { vencedor: currentAnsweringTeam }
                    });
                }
                break;

            case 'UNLOCK_BUZZER':
                if (myRole === 'player') {
                    const btnBuzzer = document.getElementById('btn-buzzer');
                    btnBuzzer.classList.remove('disabled');
                    btnBuzzer.textContent = "BATER!";
                    btnBuzzer.style.backgroundColor = "var(--danger)";
                    document.getElementById('player-actions-area').style.display = 'none';
                }
                break;

            case 'BUZZER_RESULT':
                if (myRole === 'player') {
                    const ganhadorDaVez = message.payload.vencedor;
                    const btnBuzzer = document.getElementById('btn-buzzer');
                    btnBuzzer.classList.add('disabled');

                    if (ganhadorDaVez === myTeamName) {
                        btnBuzzer.textContent = "SUA VEZ!";
                        btnBuzzer.style.backgroundColor = "var(--success)";
                        document.getElementById('player-actions-area').style.display = 'flex';
                        
                        document.getElementById('player-options-area').style.display = 'grid';
                        const letras = ['A', 'B', 'C', 'D'];
                        for(let i = 0; i < 4; i++) {
                            const btn = document.getElementById('btn-opt-'+i);
                            if(currentOptions[i]) {
                                btn.textContent = `${letras[i]}) ${currentOptions[i]}`;
                                btn.style.display = 'block';
                            } else {
                                btn.style.display = 'none';
                            }
                        }
                    } else {
                        btnBuzzer.textContent = "BLOQUEADO!";
                        btnBuzzer.style.backgroundColor = "#94a3b8";
                        document.getElementById('player-actions-area').style.display = 'none';
                    }
                }
                break;
            
            case 'GAME_STARTED':
                if (myRole === 'player') {
                    const btnBuzzer = document.getElementById('btn-buzzer');
                    btnBuzzer.classList.add('disabled');
                    btnBuzzer.textContent = "AGUARDE...";
                    btnBuzzer.style.backgroundColor = "#94a3b8";
                    if (navigator.vibrate) navigator.vibrate(200);
                }
                break;

            case 'NOVA_PERGUNTA':
                if (myRole === 'player') {
                    currentOptions = message.payload.pergunta.opcoes || [];
                    document.getElementById('player-actions-area').style.display = 'none';
                    document.getElementById('player-options-area').style.display = 'none';

                    const btnBuzzer = document.getElementById('btn-buzzer');
                    btnBuzzer.classList.add('disabled');
                    btnBuzzer.textContent = "AGUARDE...";
                    btnBuzzer.style.backgroundColor = "#94a3b8";
                }
                break;

            case 'SUBMIT_ANSWER':
                if (myRole === 'host') {
                    const respostaRecebida = message.payload.resposta;
                    const timeRespondeu = message.payload.time;
                    const isCorreta = (respostaRecebida === perguntaAtual.resposta_correta);
                    
                    const questionBox = document.getElementById('presenter-question-box');
                    questionBox.innerHTML += `<div style="margin-top: 10px; color: var(--secondary); font-weight: bold; font-size: 1.2rem; background: #f1f5f9; padding: 8px; border-radius: 8px;">📱 O ${timeRespondeu} escolheu: "${respostaRecebida}"</div>`;
                    
                    let ticks = 0;
                    const suspenseInterval = setInterval(() => {
                        SoundManager.ticTac();
                        ticks++;
                        if(ticks >= 5) clearInterval(suspenseInterval);
                    }, 400);

                    setTimeout(() => { evaluateAnswer(isCorreta); }, 2500);
                }
                break;

            case 'ROUND_RESULT':
                if (myRole === 'player') {
                    document.getElementById('player-actions-area').style.display = 'none';
                    const btnBuzzer = document.getElementById('btn-buzzer');
                    btnBuzzer.classList.add('disabled');
                    
                    if (message.payload.isCorrect) {
                        btnBuzzer.textContent = "CORRETO!";
                        btnBuzzer.style.backgroundColor = "var(--success)";
                    } else {
                        btnBuzzer.textContent = "ERROU!";
                        btnBuzzer.style.backgroundColor = "var(--danger)";
                    }
                }
                break;

            case 'GAME_OVER':
                if (myRole === 'player') {
                    const ranking = message.payload.ranking;
                    const scores = message.payload.scores;
                    document.getElementById('screen-game-player').innerHTML = `
                        <h1 style="margin-top: 50px; font-size: 2.3rem;">🏆 Fim de Jogo!</h1>
                        <div class="card" style="margin-top: 30px;">
                            <h2 style="color: var(--warning); font-size: 2rem;">🥇 Campeão:<br>${ranking[0]}</h2>
                            <p style="font-size: 1.6rem; font-weight: bold; color: var(--text-muted);">${scores[ranking[0]]} Pontos</p>
                        </div>
                    `;
                }
                break;
        }
    }

    // --- SISTEMA DE PONTUAÇÃO E VALIDAÇÃO ---
    function evaluateAnswer(isCorrect) {
        if (myRole === 'host') {
            if (!currentAnsweringTeam) return;

            const questionBox = document.getElementById('presenter-question-box');
            if (teamScores[currentAnsweringTeam] === undefined) teamScores[currentAnsweringTeam] = 0;

            if (isCorrect) {
                SoundManager.acerto();
                teamScores[currentAnsweringTeam] += 10;
                questionBox.innerHTML += `<div style="margin-top: 15px; color: var(--success); font-weight: bold; font-size: 1.4rem; animation: fadeIn 0.3s;">🎉 ${currentAnsweringTeam} ACERTOU! (+10 pts)</div>`;
            } else {
                SoundManager.erro();
                teamScores[currentAnsweringTeam] = Math.max(0, teamScores[currentAnsweringTeam] - 5);
                questionBox.innerHTML += `<div style="margin-top: 15px; color: var(--danger); font-weight: bold; font-size: 1.4rem; animation: fadeIn 0.3s;">💀 ${currentAnsweringTeam} ERROU! (-5 pts)</div>`;
            }

            // Atualização dinâmica do placar visual
            const timesConectados = Object.keys(teamScores);
            if(timesConectados[0]) document.getElementById('host-team1-score').textContent = teamScores[timesConectados[0]];
            if(timesConectados[1]) document.getElementById('host-team2-score').textContent = teamScores[timesConectados[1]];

            if (gameType === 'full') {
                broadcastToPlayers({
                    type: 'ROUND_RESULT',
                    payload: { isCorrect: isCorrect }
                });
            }

            currentAnsweringTeam = null; 
            setTimeout(() => { checkWinCondition(); }, 2500);
        }
    }

    function checkWinCondition() {
        if (myRole === 'host') {
            const times = Object.keys(teamScores);
            let temosUmVencedor = false;

            for (let time of times) {
                if (teamScores[time] >= metaDePontos) temosUmVencedor = true;
            }

            if (temosUmVencedor || bancoDePerguntas.length === 0) {
                const ranking = times.sort((a, b) => teamScores[b] - teamScores[a]);
                
                document.getElementById('podium-results').innerHTML = `
                    <div style="color: var(--primary-dark); font-weight: 900; font-size: 2.2rem; animation: fadeIn 0.5s;">🥇 1º Plugar ${ranking[0]} <br><span style="font-size: 1.4rem; color: var(--text-muted);">(${teamScores[ranking[0]]} pts)</span></div>
                    <div style="color: var(--text-muted); font-weight: bold; margin-top: 15px; font-size: 1.5rem;">🥈 2º Lugar ${ranking[1]} <br><span style="font-size: 1.1rem;">(${teamScores[ranking[1]]} pts)</span></div>
                `;
                
                showScreen('screen-results');
                SoundManager.acerto();

                if (gameType === 'full') {
                    broadcastToPlayers({
                        type: 'GAME_OVER',
                        payload: { ranking: ranking, scores: teamScores }
                    });
                }
            } else {
                exibirProximaPergunta();
            }
        }
    }

    function hostUnlockBuzzer() {
        if (myRole === 'host') {
            isBuzzerLocked = false;
            broadcastToPlayers({ type: 'UNLOCK_BUZZER' });
        }
    }

    function playerHitBuzzer() {
        if (myRole === 'player') {
            const btnBuzzer = document.getElementById('btn-buzzer');
            if (!btnBuzzer.classList.contains('disabled')) {
                btnBuzzer.classList.add('disabled');
                btnBuzzer.textContent = "AGUARDE...";
                sendToHost({
                    type: 'BUZZER_HIT',
                    payload: { time: myTeamName, timestamp: Date.now() }
                });
            }
        }
    }

    function sendAnswer(indice) {
        if (myRole === 'player') {
            document.getElementById('player-actions-area').style.display = 'none';
            const btnBuzzer = document.getElementById('btn-buzzer');
            btnBuzzer.textContent = "ENVIANDO...";
            btnBuzzer.style.backgroundColor = "var(--warning)";

            sendToHost({
                type: 'SUBMIT_ANSWER',
                payload: { resposta: currentOptions[indice], time: myTeamName }
            });
        }
    }

    function sendToHost(data) {
        if (hostConnection && hostConnection.open) hostConnection.send(data);
    }

    function broadcastToPlayers(data) {
        Object.values(hostConnections).forEach(conn => {
            if (conn.open) conn.send(data);
        });
    }

    async function carregarBancoDePerguntas() {
        try {
            const response = await fetch('perguntas.json');
            bancoDePerguntas = await response.json();
            bancoDePerguntas.sort(() => Math.random() - 0.5);
            console.log(`Sucesso: ${bancoDePerguntas.length} perguntas Kids carregadas!`);
        } catch (error) {
            console.error(error);
            alert("Não foi possível ler as perguntas. Certifique-se de usar um servidor local (Live Server, por exemplo).");
        }
    }

    return { 
        startSimplesMode, initHost, initPlayer, hostUnlockBuzzer, playerHitBuzzer, 
        startGame, carregarBancoDePerguntas, exibirProximaPergunta, evaluateAnswer, 
        sendAnswer, liberarRodadaLocal, selecionarOpcaoKids, confirmarRespostaLocal,
        set currentAnsweringTeam(val) { currentAnsweringTeam = val; }
    };
})();

// Inicializador da página
document.addEventListener('DOMContentLoaded', () => {
    GameNetwork.carregarBancoDePerguntas();

    const cachedRoom = sessionStorage.getItem('quizRoomCache');
    const cachedTeam = sessionStorage.getItem('quizTeamCache');

    if (cachedRoom && cachedTeam) {
        document.getElementById('input-room-code').value = cachedRoom;
        document.getElementById('input-team-name').value = cachedTeam;
        showScreen('screen-lobby-player');
    }
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function conectarJogador() {
    const codigo = document.getElementById('input-room-code').value;
    const time = document.getElementById('input-team-name').value;

    if(!codigo || !time) {
        alert("Por favor, digite o código da sala e o nome do seu time!");
        return;
    }

    event.target.textContent = "Conectando..."; 
    GameNetwork.initPlayer(codigo, time);
}