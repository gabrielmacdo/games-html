// script.js
const App = (() => {
    // --- Elements ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const btnSortearList = document.querySelectorAll('.btn-sortear');
    const resultModal = document.getElementById('resultModal');
    const closeModalBtn = document.getElementById('closeModal');
    const rollingDrum = document.getElementById('rollingDrum');
    const resultDisplay = document.getElementById('resultDisplay');
    const resultContent = document.getElementById('resultContent');

    // Nomes Elements
    const nomesFileInput = document.getElementById('nomesFile');
    const nomesListArea = document.getElementById('nomesList');

    let currentResultData = null; // Store result for export/share
    let pastDrawsHistory = []; // Anti-repetition engine historical (up to 3)

    const init = () => {
        bindEvents();
    };

    const bindEvents = () => {
        // Tab switching
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.target}`).classList.add('active');
            });
        });

        // Toggle Atributos config
        const checkAtributos = document.getElementById('gruposUsarAtributos');
        const configAtributos = document.getElementById('atributosConfig');
        if (checkAtributos) {
            checkAtributos.addEventListener('change', (e) => {
                if (e.target.checked) {
                    configAtributos.classList.remove('hidden');
                } else {
                    configAtributos.classList.add('hidden');
                }
            });
        }

        // Modal interactions
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', hideModal);
        }

        window.addEventListener('click', (e) => {
            if (e.target == resultModal) {
                hideModal();
            }
        });

        // File readers
        if (nomesFileInput) {
            nomesFileInput.addEventListener('change', (e) => handleFileUpload(e, nomesListArea));
        }

        const gruposFileInput = document.getElementById('gruposFile');
        const gruposListArea = document.getElementById('gruposList');
        if (gruposFileInput) {
            gruposFileInput.addEventListener('change', (e) => handleFileUpload(e, gruposListArea, analyzeGroups));
        }
        if (gruposListArea) {
            gruposListArea.addEventListener('input', analyzeGroups);
        }
        const gruposSeparadorLinha = document.getElementById('gruposSeparadorLinha');
        if (gruposSeparadorLinha) {
            gruposSeparadorLinha.addEventListener('change', analyzeGroups);
        }

        // Eventos UI Avancada de Grupos
        const gruposUsarAtributos = document.getElementById('gruposUsarAtributos');
        const atributosConfig = document.getElementById('atributosConfig');
        if (gruposUsarAtributos && atributosConfig) {
            gruposUsarAtributos.addEventListener('change', (e) => {
                atributosConfig.classList.toggle('hidden', !e.target.checked);
            });
        }

        const gruposUsarRoles = document.getElementById('gruposUsarRoles');
        const rolesConfig = document.getElementById('rolesConfig');
        if (gruposUsarRoles && rolesConfig) {
            gruposUsarRoles.addEventListener('change', (e) => {
                rolesConfig.classList.toggle('hidden', !e.target.checked);
            });
        }

        const btnAddRole = document.getElementById('btnAddRole');
        if (btnAddRole) {
            btnAddRole.addEventListener('click', addRole);
        }

        // Import Anterior Sorteio
        const importInput = document.getElementById('importSorteioInput');
        const btnImportar = document.getElementById('btnImportar');
        if (btnImportar && importInput) {
            btnImportar.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', importState);
        }

        // Main Draw Buttons
        btnSortearList.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                handleDraw(type);
            });
        });

        // Modal Actions
        document.getElementById('btnRepetir')?.addEventListener('click', () => {
            hideModal();
            const activeTabBtn = document.querySelector('.tab-btn.active');
            if (activeTabBtn) {
                setTimeout(() => handleDraw(activeTabBtn.dataset.target), 300);
            }
        });

        document.getElementById('btnDownload')?.addEventListener('click', exportResult);

        const waTitleInput = document.getElementById('waTitleInput');
        if (waTitleInput) {
            waTitleInput.addEventListener('input', updateWaPreview);
        }

        const btnCopyPreview = document.getElementById('btnCopyPreview');
        if (btnCopyPreview) {
            btnCopyPreview.addEventListener('click', copyWaPreview);
        }
    };

    const handleFileUpload = (event, textAreaElem, callback = null) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            textAreaElem.value = e.target.result;
            if (callback) callback();
        };
        reader.readAsText(file);

        // Limpa o input file para permitir selecionar o mesmo arquivo novamente
        event.target.value = '';
    };

    const showModal = () => {
        resultModal.classList.add('show');
        rollingDrum.classList.remove('hidden');
        resultDisplay.classList.add('hidden');
        currentResultData = null;
    };

    const hideModal = () => {
        resultModal.classList.remove('show');
    };

    const renderResults = () => {
        setTimeout(() => {
            rollingDrum.classList.add('hidden');
            resultDisplay.classList.remove('hidden');
            updateWaPreview();
        }, 1500);
    };

    const showError = (msg) => {
        rollingDrum.classList.add('hidden');
        resultDisplay.classList.remove('hidden');
        const preview = document.getElementById('waPreviewText');
        if (preview) preview.value = `Erro: ${msg}`;
        document.querySelector('.result-actions').style.display = 'none';
    };

    const handleDraw = (type) => {
        showModal();
        const actions = document.querySelector('.result-actions');
        if (actions) actions.style.display = 'flex';

        try {
            let resultObj = null;
            if (type === 'numeros') {
                resultObj = sortearNumeros();
            } else if (type === 'nomes') {
                resultObj = sortearNomes();
            } else if (type === 'grupos') {
                resultObj = sortearGrupos();
            }

            if (resultObj) {
                currentResultData = resultObj;
                renderResults();
            }
        } catch (error) {
            showError(error.message);
        }
    };



    // --- Módulo Sorteio de Números ---
    const sortearNumeros = () => {
        const min = parseInt(document.getElementById('numMin').value);
        const max = parseInt(document.getElementById('numMax').value);
        const qtd = parseInt(document.getElementById('numQtd').value);
        const allowRepeat = document.getElementById('numRepeticao').checked;
        const filtro = document.querySelector('input[name="numFiltro"]:checked').value;

        if (isNaN(min) || isNaN(max) || isNaN(qtd) || min >= max || qtd < 1) {
            throw new Error("Parâmetros inválidos. O Mínimo deve ser menor que o Máximo, e a quantidade maior que 0.");
        }

        let pool = [];
        for (let i = min; i <= max; i++) {
            if (filtro === 'pares' && i % 2 !== 0) continue;
            if (filtro === 'impares' && i % 2 === 0) continue;
            pool.push(i);
        }

        if (pool.length === 0) {
            throw new Error(`Nenhum número corresponde aos critérios no intervalo de ${min} a ${max}.`);
        }

        if (!allowRepeat && qtd > pool.length) {
            throw new Error(`Impossível sortear ${qtd} números distintos. Apenas ${pool.length} números disponíveis nas regras atuais.`);
        }

        let sorteados = [];
        if (allowRepeat) {
            for (let i = 0; i < qtd; i++) {
                const randomIndex = Math.floor(Math.random() * pool.length);
                sorteados.push(pool[randomIndex]);
            }
        } else {
            let tempPool = [...pool];
            for (let i = tempPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tempPool[i], tempPool[j]] = [tempPool[j], tempPool[i]];
            }
            sorteados = tempPool.slice(0, qtd);
            sorteados.sort((a, b) => a - b);
        }

        const html = sorteados.map(n => `<span class="result-item-number">${n}</span>`).join('');

        return {
            type: 'numeros',
            data: sorteados,
            html: `<div style="text-align:center; padding: 20px 0;">${html}</div>`,
            metadata: { min, max, qtd, allowRepeat, filtro }
        };
    };

    // --- Módulo Sorteio de Nomes ---
    const shuffleArray = (array) => {
        let currentIndex = array.length, randomIndex;
        while (currentIndex > 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
    };

    const sortearNomes = () => {
        const text = document.getElementById('nomesList').value.trim();
        const qtd = parseInt(document.getElementById('nomesQtd').value);
        let separadorRaw = document.getElementById('nomesSeparador').value;
        const separador = separadorRaw === '\\n' ? '\n' : separadorRaw; // Unescape newline

        if (!text || isNaN(qtd) || qtd < 1) {
            throw new Error("Preencha a lista de participantes e a quantidade de ganhadores válidos.");
        }

        let nomes = text.split(separador).map(n => n.trim()).filter(n => n.length > 0);

        if (nomes.length === 0) {
            throw new Error("A lista fornecida não contém nomes válidos após a separação.");
        }

        if (qtd > nomes.length) {
            throw new Error(`Não é possível sortear ${qtd} ganhadores entre apenas ${nomes.length} participantes.`);
        }

        // Embaralha
        const shuffled = shuffleArray([...nomes]);
        const winners = shuffled.slice(0, qtd);

        let html = '';
        winners.forEach((winner, index) => {
            html += `<div class="result-item-name"><span style="color:var(--text-muted); margin-right: 10px;">#${index + 1}</span> <strong>${winner}</strong></div>`;
        });

        return {
            type: 'nomes',
            data: winners,
            html: html,
            metadata: { list_size: nomes.length, qtd, separador: separadorRaw }
        };
    };

    // --- Módulo Formação de Grupos ---
    const analyzeGroups = () => {
        const text = document.getElementById('gruposList').value.trim();
        const analysisBox = document.getElementById('groupAnalysis');
        if (!analysisBox) return;

        const analysisResult = document.getElementById('analysisResult');
        const analysisSuggestions = document.getElementById('analysisSuggestions');

        let sepLinhaRaw = document.getElementById('gruposSeparadorLinha').value;
        const sepLinha = sepLinhaRaw === '\\n' ? '\n' : sepLinhaRaw;

        let linhas = text.split(sepLinha).map(l => l.trim()).filter(l => l.length > 0);
        const N = linhas.length;

        if (N < 3) {
            analysisBox.style.display = 'none';
            return;
        }

        analysisBox.style.display = 'block';

        let htmlRes = `<strong><i class="fa-solid fa-chart-pie"></i> Análise: ${N} participantes.</strong> `;
        let suggestHtml = '';

        // Encontrar divisores perfeitos (exceto 1 e ele mesmo)
        let divisores = [];
        for (let i = 2; i <= Math.floor(N / 2); i++) {
            if (N % i === 0) divisores.push(i);
        }

        if (divisores.length > 0) {
            htmlRes += `<span style="color:var(--whatsapp)">Divisão perfeita possível!</span> Grupos recomendados:`;

            // Sugestões de divisores perfeitos (prioriza grupos de 2 a 10 pessoas)
            let recomendados = divisores.filter(d => (N / d) >= 2 && (N / d) <= 10);
            if (recomendados.length === 0) recomendados = divisores.slice(0, 4); // fallbacks

            recomendados.forEach(d => {
                const pessoas = N / d;
                suggestHtml += `<span class="badge-btn suggestion-btn" data-val="${d}">Sugerir ${d} Grupos (de ${pessoas})</span>`;
            });
        } else {
            htmlRes += `<span style="color:var(--gold)">Número não divisível igualmente.</span> Sugestões com sobra mínima:`;

            // Sugestões de divisão não perfeita (focando em 2, 3, 4, 5 grupos ou N/4)
            let near = [2, 3, 4, 5].filter(d => N > d);
            const ceilQuart = Math.ceil(N / 4);
            if (N > 10 && !near.includes(ceilQuart)) near.push(ceilQuart);

            near.forEach(d => {
                const base = Math.floor(N / d);
                const resto = N % d;
                const minGroup = base;
                const maxGroup = base + 1;
                suggestHtml += `<span class="badge-btn suggestion-btn" data-val="${d}">Sugerir ${d} Grupos (alguns com ${minGroup}, outros ${maxGroup})</span>`;
            });
        }

        analysisResult.innerHTML = htmlRes;
        analysisSuggestions.innerHTML = suggestHtml;

        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('gruposModo').value = 'qtd_grupos';
                document.getElementById('gruposValor').value = e.currentTarget.dataset.val;

                const valInput = document.getElementById('gruposValor');
                valInput.focus();
                valInput.style.borderColor = 'var(--whatsapp)';
                valInput.style.boxShadow = '0 0 10px rgba(37, 211, 102, 0.4)';
                setTimeout(() => {
                    valInput.style.borderColor = 'var(--primary)';
                    valInput.style.boxShadow = '';
                }, 800);
            });
        });
    };

    let currentRoles = [];
    const roleEmojiList = [
        '👑', '💎', '🏆', '⭐', '🌟', '✨', '⚡', '🔥', '🛡️', '⚔️', '🎯', '📢', '🎧', '🎤', '🎬', '🎨', '🧩', '💡', '🔍', '🔑', '🛠️', '⚙️', '⚖️', '🧭', '⏱️', '💵', '💰', '💳', '📊', '📈', '📋', '📁', '📅', '📞', '📱', '💻', '🖥️', '⌨️', '🎮', '🚗', '🚀', '🚁', '⛵', '⚓', '🚨', '🛑', '🚧', '🏡', '🏢', '🏥', '☕', '🍔', '🍎', '🍉', '⚽', '🏀', '🏈', '🎾', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎈', '🎉', '🎊', '🎁', '🎀', '🪄', '🧿', '🔮', '🩺', '✅', '❌', '⚠️', 'ℹ️'
    ];

    const initEmojiPicker = () => {
        const picker = document.getElementById('emojiPicker');
        const roleEmojiInput = document.getElementById('roleEmoji');
        if (!picker || !roleEmojiInput) return;

        // Populate Picker
        roleEmojiList.forEach(emoji => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'emoji-btn';
            btn.innerText = emoji;
            btn.addEventListener('click', () => {
                roleEmojiInput.value = emoji;
                picker.classList.add('hidden');
            });
            picker.appendChild(btn);
        });

        // Toggle on click
        roleEmojiInput.addEventListener('click', (e) => {
            e.stopPropagation(); // Previne fechamento imediato
            picker.classList.toggle('hidden');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!picker.contains(e.target) && e.target !== roleEmojiInput) {
                picker.classList.add('hidden');
            }
        });
    };

    initEmojiPicker();

    const addRole = () => {
        const emojiInput = document.getElementById('roleEmoji');
        const nameInput = document.getElementById('roleName');
        const emoji = emojiInput.value.trim();
        const name = nameInput.value.trim();

        if (!emoji || !name) {
            alert('Preencha o Emoji e o Nome da função!');
            return;
        }

        currentRoles.push({ id: Date.now(), emoji, name });
        emojiInput.value = '';
        nameInput.value = '';
        renderRoles();
    };

    const removeRole = (id) => {
        currentRoles = currentRoles.filter(r => r.id !== id);
        renderRoles();
    };

    window.removeRoleHandler = removeRole; // Torna disponivel pro onClick inline

    const renderRoles = () => {
        const listContainer = document.getElementById('rolesList');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        currentRoles.forEach(r => {
            listContainer.innerHTML += `
            <div class="role-item">
                <div class="role-item-content">
                    <span style="font-size: 1.2rem;">${r.emoji}</span>
                    <span style="font-weight: 500;">${r.name}</span>
                </div>
                <button class="btn-remove-role" onclick="removeRoleHandler(${r.id})" title="Remover"><i class="fa-solid fa-xmark"></i></button>
            </div>
            `;
        });
    };

    const sortearGrupos = () => {
        const text = document.getElementById('gruposList').value.trim();
        const modo = document.getElementById('gruposModo').value; // 'qtd_grupos' ou 'pessoas_por_grupo'
        const valor = parseInt(document.getElementById('gruposValor').value);
        const usarAtributos = document.getElementById('gruposUsarAtributos').checked;
        const usarRoles = document.getElementById('gruposUsarRoles')?.checked;

        let sepLinhaRaw = document.getElementById('gruposSeparadorLinha').value;
        const sepLinha = sepLinhaRaw === '\\n' ? '\n' : sepLinhaRaw;
        const sepColuna = document.getElementById('gruposSeparadorColuna').value || ';';

        if (!text || isNaN(valor) || valor < 1) {
            throw new Error("Preencha a lista e os valores numéricos corretamente.");
        }

        let linhas = text.split(sepLinha).map(l => l.trim()).filter(l => l.length > 0);
        if (linhas.length === 0) throw new Error("A lista de grupos está vazia.");

        let participantes = [];
        linhas.forEach(linha => {
            if (usarAtributos) {
                const parts = linha.split(sepColuna);
                participantes.push({
                    nome: parts[0] ? parts[0].trim() : '',
                    atributo: parts[1] ? parts[1].trim() : 'Sem Atributo'
                });
            } else {
                participantes.push({ nome: linha, atributo: null });
            }
        });

        if (participantes.length === 0) throw new Error("A lista não possui participantes válidos.");

        let numGrupos = 1;
        if (modo === 'qtd_grupos') {
            numGrupos = valor;
        } else {
            numGrupos = Math.ceil(participantes.length / valor);
        }

        if (numGrupos > participantes.length) {
            throw new Error(`Você solicitou ${numGrupos} grupos, mas há apenas ${participantes.length} participantes.`);
        }

        const grupos = Array.from({ length: numGrupos }, () => []);

        if (usarAtributos) {
            // Bucket Sort
            const buckets = {};
            participantes.forEach(p => {
                if (!buckets[p.atributo]) buckets[p.atributo] = [];
                buckets[p.atributo].push(p);
            });

            // Randomize inside buckets
            Object.keys(buckets).forEach(key => {
                buckets[key] = shuffleArray(buckets[key]);
            });

            // Round Robin Distribution
            let currGroupIndex = 0;
            const chaves = Object.keys(buckets);
            chaves.sort((a, b) => buckets[b].length - buckets[a].length);

            chaves.forEach(atr => {
                const lista = buckets[atr];
                lista.forEach(p => {
                    grupos[currGroupIndex].push(p);
                    currGroupIndex = (currGroupIndex + 1) % numGrupos;
                });
            });

        } else {
            // Sorteio Simples Uniforme
            participantes = shuffleArray(participantes);
            participantes.forEach((p, index) => {
                grupos[index % numGrupos].push(p);
            });
        }

        // ==========================================================
        // Algoritmo de Rodizio (Anti-Repeticao) - Swapping Phase
        // ==========================================================
        const rodizioControl = document.getElementById('gruposUsarRodizio');
        const usarRodizio = rodizioControl && rodizioControl.checked && pastDrawsHistory.length > 0 && !document.getElementById('antiRepetitionConfig').classList.contains('hidden');

        if (usarRodizio) {
            const iterations = 500; // Tentativas de swap
            let currentPenalty = calculatePenalty(grupos, pastDrawsHistory);

            if (currentPenalty > 0) {
                // Tenta permutar pessoas
                for (let i = 0; i < iterations; i++) {
                    const g1 = Math.floor(Math.random() * grupos.length);
                    let g2 = Math.floor(Math.random() * grupos.length);
                    while (g1 === g2) g2 = Math.floor(Math.random() * grupos.length);

                    if (grupos[g1].length === 0 || grupos[g2].length === 0) continue;

                    const p1Index = Math.floor(Math.random() * grupos[g1].length);
                    const p2Index = Math.floor(Math.random() * grupos[g2].length);

                    const p1 = grupos[g1][p1Index];
                    const p2 = grupos[g2][p2Index];

                    // Se atributo importou, só pode trocar se for pelo mesmo atributo para não quebrar o bucket sort
                    if (usarAtributos && p1.atributo !== p2.atributo) continue;

                    // Faz o swap
                    grupos[g1][p1Index] = p2;
                    grupos[g2][p2Index] = p1;

                    const newPenalty = calculatePenalty(grupos, pastDrawsHistory);

                    if (newPenalty < currentPenalty) {
                        // Swap aceito! Traz penalidade pra baixo.
                        currentPenalty = newPenalty;
                        if (currentPenalty === 0) break; // Ja perfeito
                    } else {
                        // Undo swap
                        grupos[g1][p1Index] = p1;
                        grupos[g2][p2Index] = p2;
                    }
                }
            }
        }

        // Aplicar Roles (cargos) ao grupos, se ativado e definido
        let usedRoles = [];
        if (usarRoles && currentRoles.length > 0) {
            usedRoles = [...currentRoles];
            grupos.forEach(grupo => {
                // Sorteia a ordem das pessoas do grupo para distribuir as roles aleatoriamente
                let shuffledGrp = shuffleArray([...grupo]);

                // Atribui uma role unicamente a cada um (se a qtde de pessoas permitir)
                for (let i = 0; i < Math.min(usedRoles.length, shuffledGrp.length); i++) {
                    const funcTarget = shuffledGrp[i];
                    // Referência original da pessoa recebe a role
                    const idx = grupo.findIndex(member => member.nome === funcTarget.nome && member.atributo === funcTarget.atributo);
                    if (idx !== -1) {
                        grupo[idx].role = usedRoles[i];
                    }
                }
            });
        }

        let html = '';
        grupos.forEach((grupo, idx) => {
            html += `<div class="group-box">
                <div class="group-header">Grupo ${idx + 1} <span style="font-weight:normal; font-size:0.85em; color:var(--text-muted)">(${grupo.length} pessoas)</span></div>
                <ul class="group-members">`;

            grupo.forEach(m => {
                html += `<li>
                    <span>${m.nome}${m.role ? ` <span class="role-badge" title="${m.role.name}">${m.role.emoji}</span>` : ''}</span>
                    ${m.atributo ? `<span class="attr-badge">${m.atributo}</span>` : ''}
                </li>`;
            });

            html += `</ul></div>`;
        });

        // Adiciona legenda de roles se necessario
        if (usedRoles.length > 0) {
            html += `<div class="roles-legend">
                <strong>Legenda de Funções:</strong><br>
                ${usedRoles.map(r => `<span class="legend-item">${r.emoji} ${r.name}</span>`).join('')}
            </div>`
        }

        return {
            type: 'grupos',
            data: grupos,
            html: html,
            metadata: { modo, valor, usarAtributos, sepLinha: sepLinhaRaw, sepColuna, usarRoles, currentRoles }
        };
    };

    // Calculate penalty points of current group layout against history
    const calculatePenalty = (grupos, history) => {
        let penalty = 0;

        grupos.forEach(grupo => {
            // Verifica os pares do grupo
            for (let i = 0; i < grupo.length; i++) {
                for (let j = i + 1; j < grupo.length; j++) {
                    const pairA = grupo[i].nome;
                    const pairB = grupo[j].nome;

                    // Compara com os sorteios passados
                    // O sorteio [0] no array history é o mais recente, [1] moderado, [2] mais velho.
                    history.forEach((histDraw, hIndex) => {
                        let weight = 3 - hIndex; // [0] peso 3, [1] peso 2, [2] peso 1
                        histDraw.forEach(histGroup => {
                            const hasA = histGroup.some(m => m.nome === pairA);
                            const hasB = histGroup.some(m => m.nome === pairB);
                            if (hasA && hasB) {
                                penalty += weight; // ja cairam juntos, penaliza e pondera o stress recente
                            }
                        });
                    });
                }
            }
        });
        return penalty;
    };

    // --- Módulo Saída & Repetição ---
    const exportResult = () => {
        if (!currentResultData) return;

        let textOut = `=== RESULTADO OFICIAL - SORTEIOPRO ===\n\n`;
        const dt = new Date().toLocaleString('pt-BR');
        textOut += `Data: ${dt}\n`;
        textOut += `Tipo: ${currentResultData.type.toUpperCase()}\n\n`;

        if (currentResultData.type === 'numeros') {
            textOut += `Números Sorteados: ${currentResultData.data.join(', ')}\n`;
        } else if (currentResultData.type === 'nomes') {
            currentResultData.data.forEach((w, i) => {
                textOut += `${i + 1}º Lugar: ${w}\n`;
            });
        } else if (currentResultData.type === 'grupos') {
            currentResultData.data.forEach((g, i) => {
                textOut += `[ Grupo ${i + 1} ] - ${g.length} pessoas\n`;
                g.forEach(m => {
                    textOut += ` - ${m.nome}${m.role ? ` ${m.role.emoji}` : ''}${m.atributo ? ` (${m.atributo})` : ''}\n`;
                });
                textOut += '\n';
            });

            // Append Legend in Export
            if (currentResultData.metadata && currentResultData.metadata.usarRoles && currentResultData.metadata.currentRoles && currentResultData.metadata.currentRoles.length > 0) {
                textOut += `[ Legenda de Funções ]\n`;
                currentResultData.metadata.currentRoles.forEach(r => {
                    textOut += `${r.emoji} = ${r.name}\n`;
                });
            }
        }

        textOut += `\n======================================\n`;

        // Add JSON metadata
        const state = {
            type: currentResultData.type,
            meta: currentResultData.metadata,
            timestamp: new Date().getTime()
        };

        if (state.type === 'nomes') {
            state.originalList = document.getElementById('nomesList').value;
        } else if (state.type === 'grupos') {
            state.originalList = document.getElementById('gruposList').value;

            // Build the FIFO History
            let newHistory = [];
            // Preserve older histories
            if (pastDrawsHistory) newHistory = [...pastDrawsHistory];
            // Push active result to FIFO tracking max 3
            newHistory.unshift(currentResultData.data);
            if (newHistory.length > 3) newHistory.pop();
            state.historyArray = newHistory;
        }

        // Use base64 encode to safely write into TXT
        const stateBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
        textOut += `\n/* STATE:${stateBase64} */`;

        const blob = new Blob([textOut], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sorteio_${currentResultData.type}_${state.timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getWhatsAppText = () => {
        if (!currentResultData) return '';

        const customTitle = document.getElementById('waTitleInput').value.trim() || 'RESULTADO OFICIAL';
        let textFormated = `✨ *${customTitle}* ✨\n\n`;

        if (currentResultData.type === 'numeros') {
            textFormated += `*Números Sorteados:* ${currentResultData.data.join(', ')}\n`;
        } else if (currentResultData.type === 'nomes') {
            currentResultData.data.forEach((w, i) => {
                textFormated += `*${i + 1}º:* ${w}\n`;
            });
        } else if (currentResultData.type === 'grupos') {
            currentResultData.data.forEach((g, i) => {
                textFormated += `*Grupo ${i + 1}*\n`;
                g.forEach(m => {
                    textFormated += `• ${m.nome}${m.role ? ` ${m.role.emoji}` : ''}${m.atributo ? ` - ${m.atributo}` : ''}\n`;
                });
                textFormated += '\n';
            });

            // Append Legend 
            if (currentResultData.metadata && currentResultData.metadata.usarRoles && currentResultData.metadata.currentRoles && currentResultData.metadata.currentRoles.length > 0) {
                textFormated += `_Legenda:_\n`;
                currentResultData.metadata.currentRoles.forEach(r => {
                    textFormated += `${r.emoji} = ${r.name}\n`;
                });
            }
        }
        return textFormated;
    };

    const updateWaPreview = () => {
        const preview = document.getElementById('waPreviewText');
        if (preview) {
            preview.value = getWhatsAppText();
        }
    };

    const copyWaPreview = async () => {
        const text = getWhatsAppText();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const btn = document.getElementById('btnCopyPreview');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Copiado!`;
            btn.style.borderColor = 'var(--whatsapp)';
            btn.style.color = 'var(--whatsapp)';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.borderColor = '';
                btn.style.color = '';
            }, 2000);
        } catch (err) {
            alert("Não foi possível copiar o texto automaticamente.");
        }
    };

    const shareWhatsApp = () => {
        const textFormated = getWhatsAppText();
        if (!textFormated) return;
        const url = `https://wa.me/?text=${encodeURIComponent(textFormated)}`;
        window.open(url, '_blank');
    };

    const importState = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            try {
                const match = text.match(/\/\* STATE:(.+) \*\//);
                if (match && match[1]) {
                    const jsonStr = decodeURIComponent(escape(atob(match[1])));
                    const state = JSON.parse(jsonStr);
                    hydrateState(state);
                } else {
                    alert("Arquivo não contém metadados válidos de sorteio para importar ou está corrompido.");
                }
            } catch (err) {
                console.error(err);
                alert("Erro ao tentar ler ou converter o estado deste arquivo.");
            }
            e.target.value = ''; // Clean input
        };
        reader.readAsText(file);
    };

    const hydrateState = (state) => {
        const tabBtn = document.querySelector(`.tab-btn[data-target="${state.type}"]`);
        if (tabBtn) tabBtn.click();

        if (state.type === 'numeros') {
            document.getElementById('numMin').value = state.meta.min;
            document.getElementById('numMax').value = state.meta.max;
            document.getElementById('numQtd').value = state.meta.qtd;
            document.getElementById('numRepeticao').checked = state.meta.allowRepeat;
            const rádio = document.querySelector(`.radio-box input[value="${state.meta.filtro}"]`);
            if (rádio) rádio.checked = true;
        }
        else if (state.type === 'nomes') {
            document.getElementById('nomesQtd').value = state.meta.qtd;
            document.getElementById('nomesSeparador').value = state.meta.separador;
            if (state.originalList) document.getElementById('nomesList').value = state.originalList;
        }
        else if (state.type === 'grupos') {
            document.getElementById('gruposModo').value = state.meta.modo;
            document.getElementById('gruposValor').value = state.meta.valor;

            const checkAtr = document.getElementById('gruposUsarAtributos');
            checkAtr.checked = state.meta.usarAtributos;
            checkAtr.dispatchEvent(new Event('change'));

            const checkRoles = document.getElementById('gruposUsarRoles');
            if (checkRoles) {
                checkRoles.checked = state.meta.usarRoles || false;
                checkRoles.dispatchEvent(new Event('change'));
            }

            if (state.meta.usarRoles && state.meta.currentRoles) {
                currentRoles = state.meta.currentRoles;
                renderRoles();
            }

            document.getElementById('gruposSeparadorLinha').value = state.meta.sepLinha;
            document.getElementById('gruposSeparadorColuna').value = state.meta.sepColuna;
            if (state.originalList) document.getElementById('gruposList').value = state.originalList;

            // Load and Enable Rodizio logic
            if (state.historyArray && state.historyArray.length > 0) {
                pastDrawsHistory = state.historyArray;
                document.getElementById('antiRepetitionConfig').classList.remove('hidden');
            } else {
                pastDrawsHistory = [];
                document.getElementById('antiRepetitionConfig').classList.add('hidden');
            }
        }

        alert(`O estado para Sorteio de ${state.type.toUpperCase()} foi importado com sucesso!`);
    };

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', App.init);
