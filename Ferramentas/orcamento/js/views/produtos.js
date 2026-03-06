// js/views/produtos.js
import store from '../store.js';
import { formatCurrency, maskMoney, parseMoney } from '../utils/formatters.js';

export function template() {
    return `
        <div class="space-y-6 animate-fade-in" id="produtos-view-container">
            
            <!-- List View (Default) -->
            <div id="produtos-list-view" class="space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="relative w-full sm:w-96">
                        <input type="text" id="calc-search" placeholder="Buscar por descrição ou código..." class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                        <svg class="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <div class="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                        <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-600 font-medium whitespace-nowrap">
                            <input type="checkbox" id="chk-mostrar-inativos-prod" class="rounded text-primary-600 focus:ring-primary-500">
                            Mostrar inativos
                        </label>
                        <button id="btn-new-produto" class="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            <span>Novo Item</span>
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse responsive-table">
                            <thead>
                                <tr class="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                    <th class="p-4 font-medium w-16 text-center">Cód</th>
                                    <th class="p-4 font-medium">Descrição</th>
                                    <th class="p-4 font-medium text-center">Tipo</th>
                                    <th class="p-4 font-medium text-right">Custo Base</th>
                                    <th class="p-4 font-medium text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="produtos-table-body" class="text-sm">
                                <!-- Injetado via JS -->
                            </tbody>
                        </table>
                    </div>
                    <div id="produtos-empty-state" class="hidden p-12 text-center text-gray-500 flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        <p class="text-lg font-medium text-dark-900">Nenhum item cadastrado</p>
                        <p class="mt-1">Cadastre seus produtos e serviços para usá-los nos orçamentos.</p>
                    </div>
                </div>
            </div>

            <!-- Form View (Hidden by default) -->
            <div id="produtos-form-view" class="hidden max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div class="flex items-center gap-3">
                        <button id="btn-back-lista" class="p-2 text-gray-400 hover:text-dark-800 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <h2 class="text-xl font-bold text-dark-900" id="form-title">Novo Item</h2>
                    </div>
                </div>

                <div class="p-6 md:p-8">
                    <form id="produto-form" class="space-y-6">
                        <input type="hidden" id="prod-id">
                        
                        <!-- Header Form -->
                        <div class="flex flex-col md:flex-row gap-6">
                            <div class="w-full md:w-1/3">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Item</label>
                                <div class="flex bg-gray-100 p-1 rounded-lg">
                                    <button type="button" id="btn-tipo-venda" class="flex-1 py-2 text-sm font-medium rounded-md shadow bg-white text-dark-900 transition-all">Produto/Venda</button>
                                    <button type="button" id="btn-tipo-servico" class="flex-1 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-dark-900 transition-all">Serviço</button>
                                </div>
                                <input type="hidden" id="prod-tipo" value="Venda">
                            </div>

                            <div class="w-full md:w-2/3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Descrição Curta <span class="text-red-500">*</span></label>
                                <input type="text" id="prod-descricao" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="Nome do produto ou serviço">
                            </div>
                        </div>

                        <!-- Valores Base -->
                        <hr class="border-gray-100">
                        <h3 class="text-md font-bold text-dark-900">Precificação Base</h3>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                            <div class="md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                                <select id="prod-unidade" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                                    <!-- Options inseridas via JS baseadas no tipo -->
                                </select>
                            </div>
                            
                            <div class="md:col-span-1 border-l sm:pl-4 border-gray-200 mt-4 sm:mt-0 pt-4 sm:pt-0">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Preço de Custo (R$) <span class="text-red-500">*</span></label>
                                <input type="text" id="prod-custo" required value="0,00" inputmode="decimal" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors font-bold text-right text-primary-700" placeholder="0,00">
                            </div>

                            <div class="relative group md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Despesa Fixa (R$)
                                    <span class="text-gray-400 group relative ml-1 cursor-help z-10">
                                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-dark-900 text-white text-xs rounded shadow-lg text-center font-normal">
                                            Valor em R$ somado ao custo antes do markup. Se zerado, usa %.
                                        </div>
                                    </span>
                                </label>
                                <input type="text" id="prod-despesa-fixa" value="0,00" inputmode="decimal" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-right disabled:bg-gray-200 disabled:opacity-50" placeholder="0,00">
                            </div>

                            <div class="relative group md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Despesa (%)
                                    <span class="text-gray-400 group relative ml-1 cursor-help z-10">
                                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <div class="hidden group-hover:block absolute bottom-full right-0 mb-2 w-48 p-2 bg-dark-900 text-white text-xs rounded shadow-lg text-center font-normal">
                                            Percentual aplicado sobre o custo final. Se zerado, usa R$.
                                        </div>
                                    </span>
                                </label>
                                <input type="number" id="prod-despesa-perc" value="0" step="0.01" min="0" max="100" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-right disabled:bg-gray-200 disabled:opacity-50" placeholder="0">
                            </div>
                        </div>

                        <!-- Configurações de Desconto -->
                        <div class="p-4 bg-orange-50 rounded-lg border border-orange-100 flex flex-col md:flex-row gap-4 items-center">
                            <div class="flex-1">
                                <label class="block text-sm font-bold text-orange-800 mb-1">Desconto Máximo Permitido (%)</label>
                                <p class="text-xs text-orange-600">Para vendas que passam deste valor, será exigida a senha mestre.</p>
                            </div>
                            <div class="w-24">
                                <input type="number" id="prod-desc-maximo" value="0" step="0.01" min="0" max="100" class="w-full px-4 py-2 bg-white border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center font-bold text-orange-700">
                            </div>
                        </div>

                        <!-- Campos extras de SERVIÇO (Hidden default) -->
                        <div id="service-fields" class="hidden space-y-6">
                            <hr class="border-gray-100">
                            <h3 class="text-md font-bold text-dark-900 flex items-center gap-2">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                Detalhes de Serviço
                            </h3>

                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Responsável Técnico</label>
                                    <input type="text" id="serv-responsavel" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Nome do profissional">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Tempo Estimado</label>
                                    <input type="text" id="serv-tempo" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Ex: 4 horas, 2 dias">
                                </div>
                                <div class="relative group">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">
                                        Comissão Equipe (%)
                                        <span class="text-gray-400 group relative ml-1 cursor-help z-10">
                                            <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <div class="hidden group-hover:block absolute bottom-full right-0 mb-2 w-48 p-2 bg-dark-900 text-white text-xs rounded shadow-lg text-center font-normal">
                                                Informativo interno para controle. Não afeta o markup global.
                                            </div>
                                        </span>
                                    </label>
                                    <input type="number" id="serv-comissao" value="0" step="0.01" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-right">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Descrição Longa / Escopo</label>
                                <textarea id="serv-escopo" rows="3" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Detalhe as atividades a serem realizadas..."></textarea>
                                
                                <label class="flex items-center gap-2 mt-2 cursor-pointer w-max">
                                    <input type="checkbox" id="serv-importar" checked class="rounded text-primary-600 focus:ring-primary-500">
                                    <span class="text-sm text-gray-600 font-medium">Auto-importar esse escopo nas observações do Orçamento</span>
                                </label>
                            </div>
                        </div>

                        <div class="py-4">
                             <label class="flex items-center gap-2 cursor-pointer w-max">
                                <input type="checkbox" id="prod-inativo" class="rounded text-red-600 focus:ring-red-500">
                                <span class="text-sm text-gray-700 font-medium">Item Inativo</span>
                            </label>
                        </div>


                        <div class="pt-6 border-t border-gray-100 flex justify-between">
                            <button type="button" id="btn-excluir" class="hidden px-4 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors">
                                Excluir Item
                            </button>
                            <div class="flex gap-3 ml-auto">
                                <button type="button" id="btn-cancelar" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center gap-2">
                                    <span>Salvar Item</span>
                                </button>
                            </div>
                        </div>

                    </form>
                </div>
            </div>

        </div>
    `;
}

export function init(app) {
    const listView = document.getElementById('produtos-list-view');
    const formView = document.getElementById('produtos-form-view');
    const tbody = document.getElementById('produtos-table-body');
    const emptyState = document.getElementById('produtos-empty-state');
    const searchInput = document.getElementById('calc-search');

    // Form Elements
    const form = document.getElementById('produto-form');
    const titleForm = document.getElementById('form-title');
    const btnNovo = document.getElementById('btn-new-produto');
    const btnBack = document.getElementById('btn-back-lista');
    const btnCancel = document.getElementById('btn-cancelar');
    const btnExcluir = document.getElementById('btn-excluir');

    const iptBaseTipo = document.getElementById('prod-tipo');
    const btnVenda = document.getElementById('btn-tipo-venda');
    const btnServico = document.getElementById('btn-tipo-servico');
    const servFields = document.getElementById('service-fields');
    const selectUnidade = document.getElementById('prod-unidade');

    // Despesa Logic UI
    const iptDespesaFixa = document.getElementById('prod-despesa-fixa');
    const iptDespesaPerc = document.getElementById('prod-despesa-perc');
    const iptCusto = document.getElementById('prod-custo');

    let isEditing = false;
    let currentId = null;

    // --- Unidades options ---
    const unVenda = ['UN', 'CX', 'MT', 'LT', 'RL', 'KG', 'PCT'];
    const unServico = ['UN', 'Hora', 'Dia', 'Mês', 'Projeto', 'KM'];

    const renderUnidades = (isServico = false) => {
        const arr = isServico ? unServico : unVenda;
        selectUnidade.innerHTML = arr.map(u => `<option value="${u}">${u}</option>`).join('');
    };

    // --- Render List ---
    const renderTable = (filter = '') => {
        const produtos = store.getProdutos();
        const showInactive = document.getElementById('chk-mostrar-inativos-prod').checked;

        const filtered = produtos.filter(p => {
            if (!showInactive && p.inativo) return false;
            const searchStr = `${p.descricao} ${p.id}`.toLowerCase();
            return searchStr.includes(filter.toLowerCase());
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        tbody.innerHTML = filtered.map(p => {
            const isServico = p.tipo === 'Serviço';
            const bgClass = isServico ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';

            return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50 ${p.inativo ? 'opacity-50' : ''}">
                <td class="p-4" data-label="Cód">
                    <span class="font-medium text-gray-500">#${String(p.id).padStart(4, '0')}</span>
                </td>
                <td class="p-4" data-label="Descrição">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-dark-900">${p.descricao}</span>
                        ${p.inativo ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-red-200 text-red-600 uppercase">Inativo</span>` : ''}
                    </div>
                    <div class="text-xs text-gray-500">Unidade: ${p.unidade}</div>
                </td>
                <td class="p-4 text-center" data-label="Tipo">
                    <span class="px-2 py-1 rounded-full text-xs font-semibold ${bgClass}">
                        ${p.tipo}
                    </span>
                </td>
                <td class="p-4 text-right font-medium text-dark-900" data-label="Custo">
                    ${formatCurrency(p.custo)}
                </td>
                <td class="p-4 text-center" data-label="Ações">
                    <button class="btn-edit p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" data-id="${p.id}">
                        Editar
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        // Bind Edit buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                openEditForm(id);
            });
        });
    };

    // --- View Toggle ---
    const showForm = () => {
        listView.classList.add('hidden');
        formView.classList.remove('hidden');
    };

    const hideForm = () => {
        form.reset();
        listView.classList.remove('hidden');
        formView.classList.add('hidden');
        renderTable();
    };

    // --- Type Toggle (Venda/Servico) ---
    const setTipoItem = (tipo) => {
        iptBaseTipo.value = tipo;

        if (tipo === 'Venda') {
            btnVenda.classList.replace('bg-gray-100', 'bg-white');
            btnVenda.classList.replace('text-gray-500', 'text-dark-900');
            btnVenda.classList.add('shadow');

            btnServico.classList.replace('bg-white', 'bg-transparent');
            btnServico.classList.replace('text-dark-900', 'text-gray-500');
            btnServico.classList.remove('shadow');

            servFields.classList.add('hidden');
            renderUnidades(false);
        } else {
            btnServico.classList.replace('bg-transparent', 'bg-white');
            btnServico.classList.replace('text-gray-500', 'text-dark-900');
            btnServico.classList.add('shadow');

            btnVenda.classList.replace('bg-white', 'bg-gray-100');
            btnVenda.classList.replace('text-dark-900', 'text-gray-500');
            btnVenda.classList.remove('shadow');

            servFields.classList.remove('hidden');
            renderUnidades(true);
        }
    };

    btnVenda.addEventListener('click', () => setTipoItem('Venda'));
    btnServico.addEventListener('click', () => setTipoItem('Serviço'));

    // --- Despesa Exclusive Logic ---
    // Apenas um pode estar ativo. Se preencher R$, zera %. Se preencher %, zera R$.
    const updateDespesaState = () => {
        const valFixa = parseMoney(iptDespesaFixa.value);
        const valPerc = parseFloat(iptDespesaPerc.value) || 0;

        if (valFixa > 0) {
            iptDespesaPerc.value = '0';
            iptDespesaPerc.disabled = true;
        } else {
            iptDespesaPerc.disabled = false;
        }

        if (valPerc > 0) {
            iptDespesaFixa.value = '0,00';
            iptDespesaFixa.disabled = true;
        } else {
            iptDespesaFixa.disabled = false;
        }
    };

    iptDespesaFixa.addEventListener('input', (e) => {
        e.target.value = maskMoney(e.target.value);
        updateDespesaState();
    });

    iptDespesaPerc.addEventListener('input', updateDespesaState);
    iptCusto.addEventListener('input', (e) => e.target.value = maskMoney(e.target.value));

    // --- Actions ---
    btnNovo.addEventListener('click', () => {
        isEditing = false;
        currentId = null;
        form.reset();

        iptCusto.value = '0,00';
        iptDespesaFixa.value = '0,00';
        updateDespesaState();

        setTipoItem('Venda');
        document.getElementById('prod-inativo').checked = false;
        titleForm.textContent = 'Novo Item';
        btnExcluir.classList.add('hidden');
        showForm();
    });

    document.getElementById('chk-mostrar-inativos-prod').addEventListener('change', () => {
        renderTable(searchInput.value);
    });

    searchInput.addEventListener('input', (e) => renderTable(e.target.value));
    btnBack.addEventListener('click', hideForm);
    btnCancel.addEventListener('click', hideForm);

    // --- Form Management ---
    const openEditForm = (id) => {
        isEditing = true;
        currentId = id;
        const p = store.getProdutoById(id);
        if (!p) return;

        setTipoItem(p.tipo || 'Venda');
        selectUnidade.value = p.unidade; // set explicit

        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-descricao').value = p.descricao;

        // Custo e Despesas
        iptCusto.value = maskMoney(p.custo.toFixed(2));
        iptDespesaFixa.value = maskMoney((p.despesaFixa || 0).toFixed(2));
        iptDespesaPerc.value = p.despesaPerc || 0;
        updateDespesaState();

        document.getElementById('prod-desc-maximo').value = p.descontoMaximo || 0;
        document.getElementById('prod-inativo').checked = p.inativo || false;

        // Servico
        if (p.tipo === 'Serviço') {
            document.getElementById('serv-responsavel').value = p.responsavel || '';
            document.getElementById('serv-tempo').value = p.tempoEstimado || '';
            document.getElementById('serv-comissao').value = p.comissao || 0;
            document.getElementById('serv-escopo').value = p.escopo || '';
            document.getElementById('serv-importar').checked = p.importarEscopo !== false;
        }

        titleForm.textContent = `Editar ${p.tipo} #${String(p.id).padStart(4, '0')}`;
        btnExcluir.classList.remove('hidden');
        showForm();
    };

    // --- Save Logic ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const tipo = iptBaseTipo.value;

        // Validacao simples. Permite criar item com custo zero para caso de brindes
        const custo = parseMoney(iptCusto.value);

        let data = {
            tipo: tipo,
            descricao: document.getElementById('prod-descricao').value.trim(),
            unidade: selectUnidade.value,
            custo: custo,
            despesaFixa: parseMoney(iptDespesaFixa.value),
            despesaPerc: parseFloat(iptDespesaPerc.value) || 0,
            descontoMaximo: parseFloat(document.getElementById('prod-desc-maximo').value) || 0,
            inativo: document.getElementById('prod-inativo').checked
        };

        if (tipo === 'Serviço') {
            data = {
                ...data,
                responsavel: document.getElementById('serv-responsavel').value.trim(),
                tempoEstimado: document.getElementById('serv-tempo').value.trim(),
                comissao: parseFloat(document.getElementById('serv-comissao').value) || 0,
                escopo: document.getElementById('serv-escopo').value.trim(),
                importarEscopo: document.getElementById('serv-importar').checked
            };
        }

        // Senha check para salvar configuracao de desconto acima de x% (Business rule request)
        // Se isEditing e alterou o desconto, talvez pedir senha aqui, ou somente lá no Orçamento.
        // O escopo diz "exige prompt com a senha das configurações para salvar" se o check estiver marcado.
        // A regra é se o desc > 0, perguntar. Vamos simplificar implementando a regra exata:

        const config = store.getConfig();
        const executeSave = () => {
            if (isEditing) {
                store.updateProduto(currentId, data);
                app.showToast('Item atualizado com sucesso!', 'success');
            } else {
                store.addProduto(data);
                app.showToast('Item cadastrado com sucesso!', 'success');
            }
            hideForm();
        };

        if (data.descontoMaximo > 0 &&
            (!isEditing || (isEditing && data.descontoMaximo !== store.getProdutoById(currentId).descontoMaximo))) {

            const pX = window.prompt("Esse Desconto Máximo exige a senha de liberação:");
            if (pX === config.senhaLiberacao) {
                executeSave();
            } else {
                app.showToast('Senha incorreta. Item não salvo.', 'error');
            }
        } else {
            executeSave();
        }
    });

    // --- Delete Logic ---
    btnExcluir.addEventListener('click', () => {
        const emUso = store.getOrcamentos().some(o => o.itens && o.itens.some(i => parseInt(i.produtoId) === parseInt(currentId)));
        if (emUso) {
            app.showToast('Este item possui orçamentos vinculados e não pode ser excluído. Utilize a opção Inativar.', 'error');
            return;
        }

        const config = store.getConfig();
        const pX = window.prompt("Para excluir, insira a senha de liberação:");
        if (pX === config.senhaLiberacao) {
            store.deleteProduto(currentId);
            app.showToast('Item excluído com sucesso.', 'info');
            hideForm();
        } else if (pX !== null) {
            app.showToast('Senha incorreta.', 'error');
        }
    });

    // Initial config
    renderUnidades(false);
    renderTable();
}
