// js/views/clientes.js
import store from '../store.js';
import { maskCPF_CNPJ, maskCEP, maskPhone, unmask } from '../utils/formatters.js';
import { fetchEnderecoPorCEP, fetchDadosPorCNPJ } from '../utils/api.js';

export function template() {
    return `
        <div class="space-y-6 animate-fade-in" id="clientes-view-container">
            
            <!-- List View (Default) -->
            <div id="clientes-list-view" class="space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="relative w-full sm:w-96">
                        <input type="text" id="calc-search" placeholder="Buscar por nome, CPF/CNPJ..." class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                        <svg class="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <div class="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                        <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-600 font-medium whitespace-nowrap">
                            <input type="checkbox" id="chk-mostrar-inativos-cli" class="rounded text-primary-600 focus:ring-primary-500">
                            Mostrar inativos
                        </label>
                        <button id="btn-new-cliente" class="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            <span>Novo Cliente</span>
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse responsive-table">
                            <thead>
                                <tr class="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                    <th class="p-4 font-medium w-16 text-center">Cód</th>
                                    <th class="p-4 font-medium">Nome / Razão Social</th>
                                    <th class="p-4 font-medium">CPF / CNPJ</th>
                                    <th class="p-4 font-medium">Cidade / UF</th>
                                    <th class="p-4 font-medium text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="clientes-table-body" class="text-sm">
                                <!-- Injetado via JS -->
                            </tbody>
                        </table>
                    </div>
                    <div id="clientes-empty-state" class="hidden p-12 text-center text-gray-500 flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                        <p class="text-lg font-medium text-dark-900">Nenhum cliente cadastrado</p>
                        <p class="mt-1">Clique em "Novo Cliente" para começar a adicionar.</p>
                    </div>
                </div>
            </div>

            <!-- Form View (Hidden by default) -->
            <div id="clientes-form-view" class="hidden max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div class="flex items-center gap-3">
                        <button id="btn-back-lista" class="p-2 text-gray-400 hover:text-dark-800 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <h2 class="text-xl font-bold text-dark-900" id="form-title">Novo Cliente</h2>
                    </div>
                </div>

                <div class="p-6 md:p-8">
                    <form id="cliente-form" class="space-y-6">
                        <input type="hidden" id="cli-id">
                        
                        <!-- Header Form -->
                        <div class="flex flex-col md:flex-row gap-6">
                            <div class="w-full md:w-1/3">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Pessoa</label>
                                <div class="flex bg-gray-100 p-1 rounded-lg">
                                    <button type="button" id="btn-pf" class="flex-1 py-2 text-sm font-medium rounded-md shadow bg-white text-dark-900 transition-all">Pública/Física</button>
                                    <button type="button" id="btn-pj" class="flex-1 py-2 text-sm font-medium rounded-md text-gray-500 hover:text-dark-900 transition-all">Jurídica</button>
                                </div>
                                <input type="hidden" id="cli-tipo-pessoa" value="F">
                            </div>
                            
                            <div class="w-full md:w-2/3">
                                <label class="block text-sm font-medium text-gray-700 mb-1" id="lbl-doc">CPF <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <input type="text" id="cli-doc" required inputmode="numeric" class="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="000.000.000-00">
                                    <div id="cnjp-loader" class="hidden absolute right-3 top-3">
                                        <svg class="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    </div>
                                </div>
                                <p class="text-xs text-primary-600 mt-1 hidden" id="cnpj-helper">Busque os dados automaticamente pelo CNPJ</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1" id="lbl-nome">Nome Completo <span class="text-red-500">*</span></label>
                                <input type="text" id="cli-nome" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                            </div>

                            <div class="md:col-span-2 hidden" id="box-fantasia">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia</label>
                                <input type="text" id="cli-fantasia" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                            </div>
                        </div>

                        <hr class="border-gray-100">
                        <h3 class="text-md font-bold text-dark-900">Contato</h3>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                <input type="text" id="cli-telefone" inputmode="numeric" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="(00) 00000-0000">
                                <label class="flex items-center gap-2 mt-2 cursor-pointer">
                                    <input type="checkbox" id="cli-is-whatsapp" class="rounded text-primary-600 focus:ring-primary-500">
                                    <span class="text-sm text-gray-600 flex items-center gap-1">
                                        <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path></svg>
                                        É WhatsApp
                                    </span>
                                </label>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input type="email" id="cli-email" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="contato@cliente.com">
                            </div>
                        </div>

                        <hr class="border-gray-100">
                        <h3 class="text-md font-bold text-dark-900">Endereço</h3>

                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                            <div class="md:col-span-1 relative">
                                <label class="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                                <input type="text" id="cli-cep" inputmode="numeric" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="00000-000">
                                <div id="cep-loader" class="hidden absolute right-3 top-9">
                                    <svg class="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            </div>
                            <div class="md:col-span-3">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Logradouro / Rua</label>
                                <input type="text" id="cli-logradouro" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                            </div>
                            
                            <div class="md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Número</label>
                                <input type="text" id="cli-numero" inputmode="numeric" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                            </div>
                            <div class="md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                <input type="text" id="cli-bairro" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                            </div>
                            <div class="md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                <input type="text" id="cli-cidade" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                            </div>
                            <div class="md:col-span-1">
                                <label class="block text-sm font-medium text-gray-700 mb-1">UF</label>
                                <input type="text" id="cli-uf" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" maxlength="2" placeholder="SP">
                            </div>
                        </div>

                        <hr class="border-gray-100">
                        
                        <div class="py-2 flex flex-col md:flex-row gap-4 md:items-center">
                             <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="cli-contribuinte" class="rounded text-primary-600 focus:ring-primary-500">
                                <span class="text-sm text-gray-700 font-medium">Cliente é Contribuinte de ICMS</span>
                            </label>
                             <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="cli-inativo" class="rounded text-red-600 focus:ring-red-500">
                                <span class="text-sm text-gray-700 font-medium">Cadastro Inativo</span>
                            </label>
                        </div>

                        <div class="pt-6 border-t border-gray-100 flex justify-between">
                            <button type="button" id="btn-excluir" class="hidden px-4 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors">
                                Excluir Cliente
                            </button>
                            <div class="flex gap-3 ml-auto">
                                <button type="button" id="btn-cancelar" class="px-6 py-2.5 text-gray-600 hover:bg-gray-100 font-medium rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center gap-2">
                                    <span>Salvar Cliente</span>
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
    const listView = document.getElementById('clientes-list-view');
    const formView = document.getElementById('clientes-form-view');
    const tbody = document.getElementById('clientes-table-body');
    const emptyState = document.getElementById('clientes-empty-state');
    const searchInput = document.getElementById('calc-search');

    // Form Elements
    const form = document.getElementById('cliente-form');
    const titleForm = document.getElementById('form-title');
    const btnNovo = document.getElementById('btn-new-cliente');
    const btnBack = document.getElementById('btn-back-lista');
    const btnCancel = document.getElementById('btn-cancelar');
    const btnExcluir = document.getElementById('btn-excluir');

    const iptIsPf = document.getElementById('btn-pf');
    const iptIsPj = document.getElementById('btn-pj');
    const iptTipo = document.getElementById('cli-tipo-pessoa');

    // API Loaders & Helpers
    const cnpjLoader = document.getElementById('cnjp-loader');
    const cnpjHelper = document.getElementById('cnpj-helper');
    const cepLoader = document.getElementById('cep-loader');

    let isEditing = false;
    let currentId = null;

    // --- Render List ---
    const renderTable = (filter = '') => {
        const clientes = store.getClientes();
        const showInactive = document.getElementById('chk-mostrar-inativos-cli').checked;

        const filtered = clientes.filter(c => {
            if (!showInactive && c.inativo) return false;
            const searchStr = `${c.nome} ${c.fantasia || ''} ${unmask(c.doc)}`.toLowerCase();
            return searchStr.includes(filter.toLowerCase());
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        tbody.innerHTML = filtered.map(c => `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50 ${c.inativo ? 'opacity-50' : ''}">
                <td class="p-4" data-label="Cód">
                    <span class="font-medium text-gray-500">#${String(c.id).padStart(4, '0')}</span>
                </td>
                <td class="p-4" data-label="Nome">
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-dark-900">${c.nome}</span>
                        ${c.inativo ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-red-200 text-red-600 uppercase">Inativo</span>` : ''}
                    </div>
                    ${c.fantasia ? `<div class="text-xs text-gray-500">${c.fantasia}</div>` : ''}
                </td>
                <td class="p-4 text-gray-600" data-label="Documento">
                    ${c.doc ? maskCPF_CNPJ(c.doc) : '-'}
                </td>
                <td class="p-4 text-gray-600" data-label="Local">
                    ${c.cidade ? `${c.cidade} / ${c.uf}` : '-'}
                </td>
                <td class="p-4 text-center" data-label="Ações">
                    <button class="btn-edit p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" data-id="${c.id}">
                        Editar
                    </button>
                </td>
            </tr>
        `).join('');

        // Bind Edit buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                openEditForm(id);
            });
        });
    };

    // --- Search ---
    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

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

    // --- Type Toggle (PF/PJ) ---
    const setTipoPessoa = (tipo) => {
        iptTipo.value = tipo;
        const boxFantasia = document.getElementById('box-fantasia');
        const lblNome = document.getElementById('lbl-nome');
        const lblDoc = document.getElementById('lbl-doc');
        const docInput = document.getElementById('cli-doc');

        if (tipo === 'F') {
            iptIsPf.classList.replace('bg-gray-100', 'bg-white');
            iptIsPf.classList.replace('text-gray-500', 'text-dark-900');
            iptIsPf.classList.add('shadow');

            iptIsPj.classList.replace('bg-white', 'bg-transparent');
            iptIsPj.classList.replace('text-dark-900', 'text-gray-500');
            iptIsPj.classList.remove('shadow');

            boxFantasia.classList.add('hidden');
            lblNome.innerHTML = 'Nome Completo <span class="text-red-500">*</span>';
            lblDoc.innerHTML = 'CPF <span class="text-red-500">*</span>';
            docInput.placeholder = '000.000.000-00';
            cnpjHelper.classList.add('hidden');
        } else {
            iptIsPj.classList.replace('bg-transparent', 'bg-white');
            iptIsPj.classList.replace('text-gray-500', 'text-dark-900');
            iptIsPj.classList.add('shadow');

            iptIsPf.classList.replace('bg-white', 'bg-gray-100');
            iptIsPf.classList.replace('text-dark-900', 'text-gray-500');
            iptIsPf.classList.remove('shadow');

            boxFantasia.classList.remove('hidden');
            lblNome.innerHTML = 'Razão Social <span class="text-red-500">*</span>';
            lblDoc.innerHTML = 'CNPJ <span class="text-red-500">*</span>';
            docInput.placeholder = '00.000.000/0000-00';
            cnpjHelper.classList.remove('hidden');
        }
        docInput.value = maskCPF_CNPJ(docInput.value);
    };

    iptIsPf.addEventListener('click', () => setTipoPessoa('F'));
    iptIsPj.addEventListener('click', () => setTipoPessoa('J'));

    // --- Actions ---
    btnNovo.addEventListener('click', () => {
        isEditing = false;
        currentId = null;
        form.reset();
        setTipoPessoa('F');
        document.getElementById('cli-inativo').checked = false;
        titleForm.textContent = 'Novo Cliente';
        btnExcluir.classList.add('hidden');
        showForm();
    });

    document.getElementById('chk-mostrar-inativos-cli').addEventListener('change', () => {
        renderTable(searchInput.value);
    });

    btnBack.addEventListener('click', hideForm);
    btnCancel.addEventListener('click', hideForm);

    // --- Form Management ---
    const openEditForm = (id) => {
        isEditing = true;
        currentId = id;
        const c = store.getClienteById(id);
        if (!c) return;

        setTipoPessoa(c.tipo || 'F');

        document.getElementById('cli-id').value = c.id;
        document.getElementById('cli-doc').value = maskCPF_CNPJ(c.doc);
        document.getElementById('cli-nome').value = c.nome;
        document.getElementById('cli-fantasia').value = c.fantasia || '';
        document.getElementById('cli-telefone').value = maskPhone(c.telefone || '');
        document.getElementById('cli-is-whatsapp').checked = c.isWhatsapp || false;
        document.getElementById('cli-email').value = c.email || '';

        document.getElementById('cli-cep').value = maskCEP(c.cep || '');
        document.getElementById('cli-logradouro').value = c.logradouro || '';
        document.getElementById('cli-numero').value = c.numero || '';
        document.getElementById('cli-bairro').value = c.bairro || '';
        document.getElementById('cli-cidade').value = c.cidade || '';
        document.getElementById('cli-uf').value = c.uf || '';
        document.getElementById('cli-contribuinte').checked = c.contribuinte || false;
        document.getElementById('cli-inativo').checked = c.inativo || false;

        titleForm.textContent = `Editar Cliente #${String(c.id).padStart(4, '0')}`;
        btnExcluir.classList.remove('hidden');
        showForm();
    };

    // Masks in real time
    document.getElementById('cli-doc').addEventListener('input', (e) => e.target.value = maskCPF_CNPJ(e.target.value));
    document.getElementById('cli-telefone').addEventListener('input', (e) => e.target.value = maskPhone(e.target.value));
    document.getElementById('cli-cep').addEventListener('input', (e) => e.target.value = maskCEP(e.target.value));

    // --- CNPJ API Integration ---
    document.getElementById('cli-doc').addEventListener('blur', async (e) => {
        if (iptTipo.value !== 'J') return;

        const cnpj = unmask(e.target.value);
        if (cnpj.length === 14) {
            cnpjLoader.classList.remove('hidden');

            const dados = await fetchDadosPorCNPJ(cnpj);
            if (dados) {
                document.getElementById('cli-nome').value = dados.razaoSocial || '';
                document.getElementById('cli-fantasia').value = dados.nomeFantasia || '';
                if (dados.cep) {
                    document.getElementById('cli-cep').value = maskCEP(dados.cep);
                    // trigger CEP lookup as well
                    document.getElementById('cli-cep').dispatchEvent(new Event('blur'));
                }
                if (dados.telefone) document.getElementById('cli-telefone').value = maskPhone(dados.telefone);

                app.showToast('Dados do CNPJ preenchidos automaticamente.', 'success');
            } else {
                app.showToast('CNPJ não encontrado ou ocorreu um erro na busca.', 'error');
            }

            cnpjLoader.classList.add('hidden');
        }
    });

    // --- CEP API Integration ---
    document.getElementById('cli-cep').addEventListener('blur', async (e) => {
        const cep = unmask(e.target.value);
        if (cep.length === 8) {
            cepLoader.classList.remove('hidden');

            const addr = await fetchEnderecoPorCEP(cep);

            if (addr) {
                document.getElementById('cli-logradouro').value = addr.endereco || '';
                document.getElementById('cli-bairro').value = addr.bairro || '';
                document.getElementById('cli-cidade').value = addr.cidade || '';
                document.getElementById('cli-uf').value = addr.uf || '';
                document.getElementById('cli-numero').focus(); // Move ux forward
            } else {
                app.showToast('CEP não encontrado.', 'error');
            }

            cepLoader.classList.add('hidden');
        }
    });


    // --- Save Logic ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = {
            tipo: iptTipo.value,
            doc: unmask(document.getElementById('cli-doc').value),
            nome: document.getElementById('cli-nome').value.trim(),
            fantasia: document.getElementById('cli-fantasia').value.trim(),
            telefone: unmask(document.getElementById('cli-telefone').value),
            isWhatsapp: document.getElementById('cli-is-whatsapp').checked,
            email: document.getElementById('cli-email').value.trim(),
            cep: unmask(document.getElementById('cli-cep').value),
            logradouro: document.getElementById('cli-logradouro').value.trim(),
            numero: document.getElementById('cli-numero').value.trim(),
            bairro: document.getElementById('cli-bairro').value.trim(),
            cidade: document.getElementById('cli-cidade').value.trim(),
            uf: document.getElementById('cli-uf').value.trim().toUpperCase(),
            contribuinte: document.getElementById('cli-contribuinte').checked,
            inativo: document.getElementById('cli-inativo').checked
        };

        if (isEditing) {
            store.updateCliente(currentId, data);
            app.showToast('Cliente atualizado com sucesso!', 'success');
        } else {
            store.addCliente(data);
            app.showToast('Cliente cadastrado com sucesso!', 'success');
        }

        hideForm();
    });

    // --- Delete Logic ---
    btnExcluir.addEventListener('click', () => {
        const emUso = store.getOrcamentos().some(o => parseInt(o.clienteId) === parseInt(currentId));
        if (emUso) {
            app.showToast('Este cliente possui orçamentos vinculados e não pode ser excluído. Utilize a opção Inativar.', 'error');
            return;
        }

        if (confirm('Tem certeza que deseja excluir esse cliente? (Esta ação não pode ser desfeita)')) {
            store.deleteCliente(currentId);
            app.showToast('Cliente excluído.', 'info');
            hideForm();
        }
    });

    // Initial render
    renderTable();
}
