// js/views/orcamentos.js
import store from '../store.js';
import { formatCurrency, maskMoney, parseMoney, maskCPF_CNPJ } from '../utils/formatters.js';

export function template() {
    return `
        <div class="space-y-6 animate-fade-in" id="orcamentos-view-container">
            
            <!-- List View (Default) -->
            <div id="orcamentos-list-view" class="space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div class="relative w-full sm:w-96">
                        <input type="text" id="calc-search" placeholder="Buscar por código ou cliente..." class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors">
                        <svg class="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <button id="btn-new-orcamento" class="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        <span>Novo Orçamento</span>
                    </button>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse responsive-table">
                            <thead>
                                <tr class="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                    <th class="p-4 font-medium w-16 text-center">Cód</th>
                                    <th class="p-4 font-medium">Data</th>
                                    <th class="p-4 font-medium">Cliente</th>
                                    <th class="p-4 font-medium text-center">Status</th>
                                    <th class="p-4 font-medium text-right">Valor Líquido</th>
                                    <th class="p-4 font-medium w-24 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="orcamentos-table-body" class="text-sm">
                                <!-- JS -->
                            </tbody>
                        </table>
                    </div>
                    <div id="orcamentos-empty-state" class="hidden p-12 text-center text-gray-500 flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <p class="text-lg font-medium text-dark-900">Nenhum orçamento encontrado</p>
                    </div>
                </div>
            </div>

            <!-- Form View -->
            <div id="orcamentos-form-view" class="hidden max-w-6xl mx-auto space-y-4">
                
                <!-- Toolbar -->
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4 sticky top-0 md:top-4 z-40 bg-opacity-90 backdrop-blur-md">
                    <div class="flex items-center gap-3">
                        <button id="btn-back-lista" class="p-2 text-gray-400 hover:text-dark-800 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <div>
                            <h2 class="text-lg md:text-xl font-bold text-dark-900" id="form-title">Novo Orçamento</h2>
                            <p class="text-xs text-gray-500" id="form-subtitle">--</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <select id="orc-status" class="w-full sm:w-auto px-4 py-2 border border-gray-300 font-semibold rounded-lg focus:ring-2 focus:ring-primary-500 text-sm appearance-none pr-8">
                            <option value="Orçamento">Orçamento</option>
                            <option value="Pedido Aprovado">Pedido Aprovado</option>
                            <option value="Fechado">Fechado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                        <button type="button" id="btn-print-orcamento" class="hidden w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all flex items-center justify-center gap-2" title="Imprimir PDF">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        </button>
                        <button type="button" id="btn-wa-orcamento" class="hidden w-full sm:w-auto px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition-all flex items-center justify-center gap-2" title="Enviar pelo WhatsApp">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path></svg>
                        </button>
                        <button type="button" id="btn-salvar-orcamento" class="w-full sm:w-auto px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <span class="hidden sm:inline">Salvar</span>
                        </button>
                    </div>
                </div>

                <!-- Main Layout Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    <!-- Left Column (Infos) -->
                    <div class="lg:col-span-1 space-y-4">
                        
                        <!-- Panel: Cliente -->
                        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 class="text-sm font-bold text-dark-900 mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                1. Selecione o Cliente
                            </h3>
                            <div class="relative">
                                <select id="orc-cliente" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500">
                                    <option value="">Selecione...</option>
                                    <!-- Injetado via JS -->
                                </select>
                            </div>
                        </div>

                        <!-- Panel: Negociação -->
                        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
                            <h3 class="text-sm font-bold text-dark-900 mb-3 flex items-center gap-2">
                                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                2. Negociação Base
                            </h3>
                            
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Tabela de Preço / Markup (%)</label>
                                <div class="relative">
                                    <input type="number" id="orc-markup" value="50" step="0.1" class="w-full pl-4 pr-10 py-2 bg-blue-50 border border-blue-200 text-blue-900 font-bold rounded-lg focus:ring-2 focus:ring-blue-500 text-right">
                                    <span class="absolute right-3 top-2.5 font-bold text-blue-600">%</span>
                                </div>
                                <p class="text-[10px] text-gray-400 mt-1 leading-tight">Margem de lucro aplicada automaticamente sobre o custo e despesa dos itens inseridos.</p>
                            </div>

                            <div class="pt-2 border-t border-gray-100">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Pagamento</label>
                                <select id="orc-condicao" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm mb-2">
                                    <option value="A Vista">À vista</option>
                                    <option value="A Prazo">A Prazo</option>
                                </select>
                                
                                <div id="orc-box-prazo" class="hidden grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Parcelas</label>
                                        <input type="number" id="orc-parcelas" value="1" min="1" class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-center">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-medium text-gray-500 mb-0.5">Prazo (Dias)</label>
                                        <input type="text" id="orc-prazo-dias" placeholder="30/60/90" class="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-sm text-center">
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Right Column (Cart & Totals) -->
                    <div class="lg:col-span-2 space-y-4">
                        
                        <!-- Panel: Inserção de Itens -->
                        <div class="bg-dark-800 p-1 rounded-xl shadow-lg border border-dark-900 text-white relative">
                            <div class="p-4 bg-dark-900 rounded-lg">
                                <h3 class="text-sm font-bold text-white mb-3">3. Adicionar Produto / Serviço</h3>
                                
                                <form id="form-add-item" class="flex flex-wrap gap-3 items-end">
                                    <div class="flex-grow min-w-[200px]">
                                        <label class="block text-xs font-medium text-gray-400 mb-1">Item</label>
                                        <select id="item-produto" required class="w-full px-3 py-2 bg-dark-800 border-none rounded text-white text-sm focus:ring-2 focus:ring-primary-500">
                                            <option value="">Selecione ou busque...</option>
                                            <!-- JS -->
                                        </select>
                                    </div>
                                    
                                    <div class="w-16">
                                        <label class="block text-xs font-medium text-gray-400 mb-1">Qtd</label>
                                        <input type="number" id="item-qtd" value="1" min="0.01" step="0.01" required class="w-full px-2 py-2 bg-dark-800 border-none rounded text-white text-sm text-center focus:ring-2 focus:ring-primary-500">
                                    </div>

                                    <div class="w-28 relative group">
                                        <label class="block text-xs font-medium text-gray-400 mb-1">P. Venda (R$)</label>
                                        <input type="text" id="item-preco" required class="w-full px-2 py-2 bg-dark-800 border-none rounded text-blue-400 font-bold text-sm text-right focus:ring-2 focus:ring-primary-500">
                                    </div>
                                    
                                    <div class="w-20">
                                        <label class="block text-xs font-medium text-gray-400 mb-1">Desc.%</label>
                                        <input type="number" id="item-desc-perc" value="0" min="0" step="0.1" class="w-full px-2 py-2 bg-dark-800 border-none rounded text-orange-400 text-sm text-center focus:ring-2 focus:ring-orange-500">
                                    </div>

                                    <button type="submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded text-sm transition-colors shadow flex gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                        Incluir
                                    </button>
                                </form>
                                <div class="mt-2 text-[10px] text-gray-500 text-right" id="item-hints">
                                    Aguardando seleção de item...
                                </div>
                            </div>
                        </div>

                        <!-- Panel: Carrinho -->
                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div class="p-3 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 flex justify-between">
                                <span>Itens do Pedido</span>
                                <span id="cart-count">0 itens</span>
                            </div>
                            <div class="overflow-x-auto min-h-[200px] max-h-[300px] overflow-y-auto">
                                <table class="w-full text-left border-collapse responsive-table text-sm">
                                    <thead class="sticky top-0 bg-white shadow-sm z-10 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th class="p-3 font-medium">Item</th>
                                            <th class="p-3 font-medium text-center">Un</th>
                                            <th class="p-3 font-medium text-center">Qtd</th>
                                            <th class="p-3 font-medium text-right">V. Unit</th>
                                            <th class="p-3 font-medium text-right text-orange-600">Desc R$</th>
                                            <th class="p-3 font-medium text-right text-green-700">V. Líq</th>
                                            <th class="p-3 font-medium text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="cart-table-body">
                                        <!-- JS -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Panel: Resumo / Totais e Fechamento -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Extras & Obs -->
                            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col space-y-3">
                                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Outros Valores</h3>
                                <div class="flex items-center justify-between gap-4">
                                    <label class="text-sm font-medium text-gray-700">Frete (R$)</label>
                                    <input type="text" id="orc-frete" value="0,00" class="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-sm">
                                </div>
                                <div class="flex items-center justify-between gap-4">
                                    <label class="text-sm font-medium text-gray-700">Acréscimos (R$)</label>
                                    <input type="text" id="orc-acrescimo" value="0,00" class="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-right text-sm">
                                </div>
                                <div class="flex-1 mt-2 flex flex-col">
                                    <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Observações Internas (Pedido/NF)</label>
                                    <textarea id="orc-obs" class="w-full flex-1 min-h-[60px] p-2 bg-amber-50 border border-amber-100 rounded text-sm text-gray-800 resize-none font-mono"></textarea>
                                </div>
                            </div>

                            <!-- Totals -->
                            <div class="bg-dark-900 rounded-xl shadow-lg border border-dark-900 p-5 flex flex-col justify-between text-white relative overflow-hidden">
                                <div class="absolute -right-6 top-6 w-32 h-32 bg-dark-800 rounded-full blur-2xl opacity-50"></div>
                                
                                <div class="space-y-2 relative z-10 text-sm">
                                    <div class="flex justify-between text-gray-400">
                                        <span>Subtotal Bruto</span>
                                        <span id="res-subtotal">R$ 0,00</span>
                                    </div>
                                    <div class="flex justify-between text-orange-400">
                                        <span>Total Descontos</span>
                                        <span id="res-descontos">R$ 0,00</span>
                                    </div>
                                    <div class="flex justify-between text-blue-400">
                                        <span>Frete + Acréscimos</span>
                                        <span id="res-extras">R$ 0,00</span>
                                    </div>
                                    <div class="pt-3 border-t border-dark-700 mt-2 flex justify-between items-end">
                                        <span class="text-gray-300 font-medium">Total Líquido</span>
                                        <span class="text-3xl font-bold text-green-400" id="res-total">R$ 0,00</span>
                                    </div>
                                    <div class="flex justify-between text-xs text-gray-500 mt-4 border-t border-dark-800 pt-2">
                                        <span>Rentabilidade. Markup Médio Real:</span>
                                        <span class="font-bold" id="res-markup-real">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Footer Delete -->
                <div class="flex justify-end pt-4">
                    <button type="button" id="btn-excluir-orc" class="hidden px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium underline">
                        Excluir permanentemente este orçamento
                    </button>
                </div>

            </div>

            <!-- Modal WhatsApp -->
            <div id="modal-whatsapp" class="fixed inset-0 z-50 hidden">
                <div class="fixed inset-0 bg-dark-900/60 backdrop-blur-sm transition-opacity" id="modal-wa-backdrop"></div>
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                    <div class="relative bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-xl w-full flex flex-col max-h-[90vh]">
                        
                        <!-- Modal Header -->
                        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 class="text-lg leading-6 font-bold text-dark-900 flex items-center gap-2">
                                <svg class="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path></svg>
                                Enviar por WhatsApp
                            </h3>
                            <button type="button" id="btn-close-modal-wa" class="text-gray-400 hover:text-gray-500 focus:outline-none">
                                <span class="sr-only">Fechar</span>
                                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Modal Body -->
                        <div class="p-6 overflow-y-auto flex-1 bg-white">
                            
                            <!-- Control Panel -->
                            <div class="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 class="text-xs font-bold text-gray-500 uppercase mb-3">O que incluir na mensagem?</h4>
                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="wa-chk-cabecalho" checked class="rounded text-green-600 focus:ring-green-500 w-4 h-4">
                                        <span class="text-gray-700 font-medium">Cabeçalho & Saudação</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="wa-chk-totais" checked class="rounded text-green-600 focus:ring-green-500 w-4 h-4">
                                        <span class="text-gray-700 font-medium">Resumo de Totais</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="wa-chk-condicao" checked class="rounded text-green-600 focus:ring-green-500 w-4 h-4">
                                        <span class="text-gray-700 font-medium">Condições de Pagamento</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="wa-chk-obs" checked class="rounded text-green-600 focus:ring-green-500 w-4 h-4">
                                        <span class="text-gray-700 font-medium">Observações</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="wa-chk-pix" checked class="rounded text-green-600 focus:ring-green-500 w-4 h-4">
                                        <span class="text-gray-700 font-medium">Chave PIX (se config)</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="wa-chk-rodape" checked class="rounded text-green-600 focus:ring-green-500 w-4 h-4">
                                        <span class="text-gray-700 font-medium">Rodapé / Assinatura</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Preview Textarea -->
                            <div class="flex flex-col flex-1 min-h-[250px]">
                                <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Pré-visualização da Mensagem</label>
                                <textarea id="wa-preview-text" class="w-full flex-1 p-4 bg-[#efeae2] border border-gray-200 rounded-xl text-sm text-[#111b21] resize-none font-mono focus:ring-2 focus:ring-green-500" style="background-image: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23dcd2c6\\' fill-opacity=\\'0.4\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></textarea>
                                <p class="text-[10px] text-gray-400 mt-2 italic text-center">* Você pode editar este texto manualmente antes de enviar/copiar se desejar.</p>
                            </div>

                        </div>
                        
                        <!-- Modal Footer -->
                        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end rounded-b-xl">
                            <button type="button" id="btn-wa-copy" class="w-full sm:w-auto px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm">
                                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                Copiar Texto
                            </button>
                            <button type="button" id="btn-wa-send" class="w-full sm:w-auto px-6 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#25D366]/30">
                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path></svg>
                                Enviar WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
}

export function init(app) {
    const listView = document.getElementById('orcamentos-list-view');
    const formView = document.getElementById('orcamentos-form-view');
    const tbody = document.getElementById('orcamentos-table-body');
    const emptyState = document.getElementById('orcamentos-empty-state');
    const searchInput = document.getElementById('calc-search');

    // Header & Toolbars
    const titleForm = document.getElementById('form-title');
    const subtitleForm = document.getElementById('form-subtitle');
    const btnNovo = document.getElementById('btn-new-orcamento');
    const btnBack = document.getElementById('btn-back-lista');
    const selStatus = document.getElementById('orc-status');
    const btnSalvar = document.getElementById('btn-salvar-orcamento');
    const btnPrint = document.getElementById('btn-print-orcamento');
    const btnWa = document.getElementById('btn-wa-orcamento');
    const btnExcluir = document.getElementById('btn-excluir-orc');

    // WhatsApp Modal Elements
    const modalWa = document.getElementById('modal-whatsapp');
    const btnCloseWa = document.getElementById('btn-close-modal-wa');
    const btnWaCopy = document.getElementById('btn-wa-copy');
    const btnWaSend = document.getElementById('btn-wa-send');
    const waPreview = document.getElementById('wa-preview-text');
    const chkWaCabecalho = document.getElementById('wa-chk-cabecalho');
    const chkWaTotais = document.getElementById('wa-chk-totais');
    const chkWaCondicao = document.getElementById('wa-chk-condicao');
    const chkWaObs = document.getElementById('wa-chk-obs');
    const chkWaPix = document.getElementById('wa-chk-pix');
    const chkWaRodape = document.getElementById('wa-chk-rodape');

    // Negociacao 
    const selCliente = document.getElementById('orc-cliente');
    const iptMarkupGlobal = document.getElementById('orc-markup');
    const selCondicao = document.getElementById('orc-condicao');
    const boxPrazo = document.getElementById('orc-box-prazo');
    const iptParcelas = document.getElementById('orc-parcelas');
    const iptPrazoDias = document.getElementById('orc-prazo-dias');

    // Add Item Tool
    const formAddItem = document.getElementById('form-add-item');
    const selProduto = document.getElementById('item-produto');
    const iptQtd = document.getElementById('item-qtd');
    const iptPreco = document.getElementById('item-preco');
    const iptDescPerc = document.getElementById('item-desc-perc');
    const hintText = document.getElementById('item-hints');

    // Carrinho e Totais
    const cartBody = document.getElementById('cart-table-body');
    const iptFrete = document.getElementById('orc-frete');
    const iptAcrescimo = document.getElementById('orc-acrescimo');
    const iptObs = document.getElementById('orc-obs');

    // State
    let isEditing = false;
    let currentId = null;
    let currentCart = []; // array de obj item: { idProd, desc, un, qtd, custoTotalItem, precoVendaSugerido, precoVendaAplicado, descR, valLiq }
    let cacheProdutosMap = {};

    // --- Load Data for Selects ---
    const loadSelects = () => {
        const o = isEditing ? store.getOrcamentoById(currentId) : null;
        const currentClienteId = o && o.clienteId ? parseInt(o.clienteId) : null;

        const clientes = store.getClientes();
        selCliente.innerHTML = '<option value="">Selecione o Cliente...</option>' +
            clientes
                .filter(c => !c.inativo || c.id === currentClienteId)
                .map(c => `<option value="${c.id}">${c.nome} ${c.doc ? `(${maskCPF_CNPJ(c.doc)})` : ''}</option>`).join('');

        const produtos = store.getProdutos();
        cacheProdutosMap = {};
        selProduto.innerHTML = '<option value="">Selecione ou busque o item...</option>' +
            produtos.map(p => {
                cacheProdutosMap[p.id] = p;
                if (p.inativo) return '';
                return `<option value="${p.id}">#${p.id} - ${p.descricao} (${p.unidade}) - R$ ${p.custo.toFixed(2)} [${p.tipo}]</option>`;
            }).join('');
    };

    // --- Core Math Logic ---
    const calculatePrecoSugerido = (produtoId, markup) => {
        const p = cacheProdutosMap[produtoId];
        if (!p) return 0;

        let custoBase = p.custo;
        let valorDespesa = 0;

        if (p.despesaFixa > 0) {
            valorDespesa = p.despesaFixa;
        } else if (p.despesaPerc > 0) {
            valorDespesa = custoBase * (p.despesaPerc / 100);
        }

        const custoTotal = custoBase + valorDespesa;
        const coefMarkup = 1 + (markup / 100);

        return custoTotal * coefMarkup; // Preco Sugerido Venda (Unitário)
    };

    const getCustoRealItem = (produtoId) => {
        const p = cacheProdutosMap[produtoId];
        if (!p) return 0;
        let custoBase = p.custo;
        if (p.despesaFixa > 0) return custoBase + p.despesaFixa;
        if (p.despesaPerc > 0) return custoBase + (custoBase * (p.despesaPerc / 100));
        return custoBase;
    };

    // --- Item Select Listener ---
    selProduto.addEventListener('change', (e) => {
        const id = e.target.value;
        if (!id) {
            iptPreco.value = '';
            hintText.innerHTML = 'Aguardando seleção de item...';
            return;
        }

        const markup = parseFloat(iptMarkupGlobal.value) || 0;
        const sugerido = calculatePrecoSugerido(id, markup);
        const p = cacheProdutosMap[id];
        const custoReal = getCustoRealItem(id);

        iptPreco.value = maskMoney(sugerido.toFixed(2));
        iptDescPerc.value = 0;
        iptQtd.value = 1;

        hintText.innerHTML = `<span class="text-blue-400">Custo+Desp: R$ ${custoReal.toFixed(2)}</span> | Markup Base: ${markup}% | Max Desc: <span class="text-orange-400">${p.descontoMaximo}%</span>`;
    });

    // Re-calc sugereço se o markup global mudar (se o input preco não foi alterado hardcoded)
    iptMarkupGlobal.addEventListener('blur', () => {
        if (selProduto.value) {
            selProduto.dispatchEvent(new Event('change'));
        }
    });

    // --- Add to Cart Logic ---
    formAddItem.addEventListener('submit', (e) => {
        e.preventDefault();

        const idProd = selProduto.value;
        if (!idProd) {
            app.showToast('Selecione um produto/serviço', 'error');
            return;
        }

        const p = cacheProdutosMap[idProd];
        const qtd = parseFloat(iptQtd.value) || 1;
        const precoDigitadoStr = iptPreco.value;
        let precoUnitarioTabela = parseMoney(precoDigitadoStr); // R$
        const descPerc = parseFloat(iptDescPerc.value) || 0;

        // Calcula Desconto R$ unitário
        let valDescUnitario = 0;
        if (descPerc > 0) {
            valDescUnitario = precoUnitarioTabela * (descPerc / 100);
        }

        const valLiqUnitario = precoUnitarioTabela - valDescUnitario;

        // Validação Desconto Máximo Teto (Business Rule)
        // Desc. total real dado vs preco sugerido (pq o usuario pode baixar o "Preço de venda" digitando)
        const sugestaoOriginal = calculatePrecoSugerido(idProd, parseFloat(iptMarkupGlobal.value) || 0);
        const descRealDadoPerc = sugestaoOriginal > 0 ? (1 - (valLiqUnitario / sugestaoOriginal)) * 100 : 0;

        if (descRealDadoPerc > p.descontoMaximo && p.descontoMaximo > 0) {
            const pwd = prompt(`Atenção: Você está dando um desconto real de ${descRealDadoPerc.toFixed(1)}% em relação à tabela (Teto: ${p.descontoMaximo}%). Digite a senha:`);
            const conf = store.getConfig();
            if (pwd !== conf.senhaLiberacao) {
                app.showToast('Senha inválida, inclusão cancelada.', 'error');
                return;
            }
        }

        // Monta Objeto Carrinho
        const item = {
            idItem: Date.now().toString(), // local id unique to cart array
            produtoId: p.id,
            descricao: p.descricao,
            unidade: p.unidade,
            tipo: p.tipo,
            qtd: qtd,
            custoUnitBase: getCustoRealItem(p.id),
            precoUnitTabela: precoUnitarioTabela, // antes do desc% da box
            descontoPerc: descPerc,
            descontoRSUnit: valDescUnitario,
            valLiqUnitario: valLiqUnitario,
            valTotalLiquido: valLiqUnitario * qtd,
            importarEscopo: p.importarEscopo,
            escopo: p.escopo
        };

        currentCart.push(item);

        // Trata escopo padrao
        if (item.tipo === 'Serviço' && item.importarEscopo && item.escopo) {
            let obs = iptObs.value;
            obs += obs ? `\n\n>> Escopo ${item.descricao}:\n${item.escopo}` : `>> Escopo ${item.descricao}:\n${item.escopo}`;
            iptObs.value = obs;
        }

        formAddItem.reset();
        hintText.innerHTML = 'Item adicionado!';
        renderCart();
    });

    // --- Render Cart & Update Totals ---
    window.removeItemCart = (idItem) => {
        currentCart = currentCart.filter(i => i.idItem !== idItem);
        renderCart();
    };

    const renderCart = () => {
        cartBody.innerHTML = currentCart.map(i => {
            const descTotalRS = i.descontoRSUnit * i.qtd;
            const subGross = i.precoUnitTabela * i.qtd;

            return `
            <tr class="border-b border-gray-100 last:border-none group">
                <td class="p-3">
                    <div class="font-bold text-dark-900 leading-tight">${i.descricao}</div>
                    <div class="text-[10px] text-gray-400">Cod ${i.produtoId}</div>
                </td>
                <td class="p-3 text-center text-xs text-gray-600">${i.unidade}</td>
                <td class="p-3 text-center font-medium">${i.qtd}</td>
                <td class="p-3 text-right text-gray-700">${formatCurrency(subGross)}</td>
                <td class="p-3 text-right text-orange-600 font-medium">
                    ${descTotalRS > 0 ? formatCurrency(descTotalRS) : '-'}
                    ${i.descontoPerc > 0 ? `<br><span class="text-[9px]">(${i.descontoPerc}%)</span>` : ''}
                </td>
                <td class="p-3 text-right font-bold text-green-700">${formatCurrency(i.valTotalLiquido)}</td>
                <td class="p-3 text-center">
                    <button type="button" onclick="window.removeItemCart('${i.idItem}')" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        document.getElementById('cart-count').textContent = `${currentCart.length} item(ns)`;

        updateTotals();
    };

    const updateTotals = () => {
        let subtotalBruto = 0;
        let descontos = 0;
        let totalValLiqItens = 0;
        let custoTotalRealItens = 0;

        currentCart.forEach(i => {
            subtotalBruto += (i.precoUnitTabela * i.qtd);
            descontos += (i.descontoRSUnit * i.qtd);
            totalValLiqItens += i.valTotalLiquido;
            custoTotalRealItens += (i.custoUnitBase * i.qtd);
        });

        const frete = parseMoney(iptFrete.value);
        const acresc = parseMoney(iptAcrescimo.value);
        const extras = frete + acresc;

        const totalGeralLiq = totalValLiqItens + extras;

        // Calc Markup Real. Se o custoTotal = 100, TotalGeralLiq = 150, Markup = 50%
        // Formula: (Venda / Custo) - 1
        let markupReal = 0;
        if (custoTotalRealItens > 0) {
            markupReal = ((totalGeralLiq / custoTotalRealItens) - 1) * 100;
        }

        document.getElementById('res-subtotal').textContent = formatCurrency(subtotalBruto);
        document.getElementById('res-descontos').textContent = formatCurrency(descontos);
        document.getElementById('res-extras').textContent = formatCurrency(extras);
        document.getElementById('res-total').textContent = formatCurrency(totalGeralLiq);

        const markupEl = document.getElementById('res-markup-real');
        markupEl.textContent = markupReal.toFixed(2) + '%';
        if (markupReal < 0) {
            markupEl.classList.remove('text-dark-900', 'text-green-500');
            markupEl.classList.add('text-red-500');
        } else {
            markupEl.classList.remove('text-dark-900', 'text-red-500');
            markupEl.classList.add('text-green-500');
        }
    };

    // Auto update totals on extra fields
    [iptFrete, iptAcrescimo].forEach(el => {
        el.addEventListener('input', (e) => {
            e.target.value = maskMoney(e.target.value);
            updateTotals();
        });
    });

    // --- Condicao Pagamento UX ---
    selCondicao.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'A Prazo') {
            boxPrazo.classList.remove('hidden');
        } else {
            boxPrazo.classList.add('hidden');
        }
        buildCondicaoString();
    });

    [iptParcelas, iptPrazoDias].forEach(el => el.addEventListener('input', () => buildCondicaoString()));

    const buildCondicaoString = () => {
        // Gera um texto e tenta injetar na OBS se houver mudanca, mas previnir sobrescrever.
        // Será injetado silenciosamente via o save object
    };


    // --- Views Toggles ---
    const orcamentosFormView = document.getElementById('orcamentos-form-view');

    const showFormView = () => {
        listView.classList.add('hidden');
        orcamentosFormView.classList.remove('hidden');
        loadSelects();
    };

    const hideFormView = () => {
        currentCart = [];
        cartBody.innerHTML = '';
        listView.classList.remove('hidden');
        orcamentosFormView.classList.add('hidden');
        renderMainTable();
        // check Hash
        if (window.location.hash.includes('?id=')) window.location.hash = '#/orcamentos';
    };


    // --- Main List Grid ---
    const renderMainTable = (filter = '') => {
        const orcamentos = store.getOrcamentos();
        const clientesMap = store.getClientes().reduce((acc, c) => ({ ...acc, [c.id]: c }), {}); // map id->client

        const filtered = orcamentos.filter(o => {
            const clienteNome = o.clienteNome || clientesMap[o.clienteId]?.nome || '';
            const searchStr = `${clienteNome} ${o.id}`.toLowerCase();
            return searchStr.includes(filter.toLowerCase());
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        const statusColors = {
            'Orçamento': 'bg-blue-100 text-blue-800',
            'Pedido Aprovado': 'bg-yellow-100 text-yellow-800',
            'Fechado': 'bg-green-100 text-green-800',
            'Cancelado': 'bg-red-100 text-red-800'
        };

        tbody.innerHTML = filtered.sort((a, b) => b.id - a.id).map(o => {
            const dt = new Date(o.dataCriacao).toLocaleDateString();
            const clienteNm = o.clienteNome || clientesMap[o.clienteId]?.nome || 'Cliente Excluído';
            const isWa = clientesMap[o.clienteId]?.isWhatsapp;
            return `
            <tr class="hover:bg-gray-50 transition-colors border-b border-gray-50 cursor-pointer" onclick="window.openEditOrcamento('${o.id}')">
                <td class="p-4 font-bold text-gray-500 text-center" data-label="Cód">#${String(o.id).padStart(4, '0')}</td>
                <td class="p-4 text-gray-600" data-label="Data">${dt}</td>
                <td class="p-4 font-medium text-dark-900" data-label="Cliente">${clienteNm}</td>
                <td class="p-4 text-center" data-label="Status">
                     <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[o.status] || 'bg-gray-100'}">
                        ${o.status}
                    </span>
                </td>
                <td class="p-4 text-right font-bold text-green-600" data-label="Valor">
                    ${formatCurrency(o.valorTotalLiquido)}
                </td>
                <td class="p-4 text-center" data-label="Ações">
                    <div class="flex items-center justify-center gap-2">
                        <button class="p-1 px-2 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors">Editar</button>
                        ${isWa ? `
                        <button class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 shadow-sm" title="Enviar WhatsApp" onclick="event.stopPropagation(); window.openWaOrcamento('${o.id}')">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path></svg>
                        </button>
                        ` : ''}
                        <button class="p-1.5 text-gray-400 hover:text-dark-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm" title="Imprimir" onclick="event.stopPropagation(); window.printOrcamento('${o.id}')">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    };

    // --- Save Orçamento ---
    btnSalvar.addEventListener('click', () => {
        if (!selCliente.value) {
            app.showToast('Selecione um cliente para o orçamento.', 'error');
            return;
        }
        if (currentCart.length === 0) {
            app.showToast('Adicione ao menos 1 item.', 'error');
            return;
        }

        const clienteObj = store.getClienteById(selCliente.value);
        let condPagTxt = selCondicao.value;
        if (condPagTxt === 'A Prazo') {
            condPagTxt += ` - ${iptParcelas.value}x (${iptPrazoDias.value} dias)`;
        }

        // recalculate one last time to get text variables
        let subTrabalho = 0; let custoTotalReq = 0; let extrasReq = parseMoney(iptFrete.value) + parseMoney(iptAcrescimo.value);
        currentCart.forEach(i => {
            subTrabalho += i.valTotalLiquido;
            custoTotalReq += (i.custoUnitBase * i.qtd);
        });
        const valTotalLiq = subTrabalho + extrasReq;
        const mkpReal = custoTotalReq > 0 ? ((valTotalLiq / custoTotalReq) - 1) * 100 : 0;

        const pData = {
            status: selStatus.value,
            clienteId: parseInt(selCliente.value),
            clienteNome: clienteObj.nome,
            clienteDoc: clienteObj.doc,
            markupGlobalBase: parseFloat(iptMarkupGlobal.value),
            condicaoPgto: selCondicao.value,
            condicaoParcelas: iptParcelas.value,
            condicaoPrazo: iptPrazoDias.value,
            condicaoTxtLong: condPagTxt,
            itens: currentCart,
            frete: parseMoney(iptFrete.value),
            acrescimos: parseMoney(iptAcrescimo.value),
            observacoes: iptObs.value,
            valorTotalLiquido: valTotalLiq,
            markupGeralReal: mkpReal
        };

        if (isEditing) {
            store.updateOrcamento(currentId, pData);
            app.showToast('Orçamento/Pedido atualizado!', 'success');
        } else {
            store.addOrcamento(pData);
            app.showToast('Orçamento/Pedido criado!', 'success');
        }

        hideFormView();
    });

    // --- Delete ---
    btnExcluir.addEventListener('click', () => {
        // Se status Fechado, precisa de senha.
        const o = store.getOrcamentoById(currentId);
        if (o && o.status === 'Fechado') {
            const conf = store.getConfig();
            const pwd = window.prompt("Pedidos FECHADOS exigem a senha de liberação para exclusão:");
            if (pwd !== conf.senhaLiberacao) {
                app.showToast('Senha inválida.', 'error');
                return;
            }
        } else {
            if (!confirm('Deseja excluir este orçamento?')) return;
        }

        store.deleteOrcamento(currentId);
        app.showToast('Orçamento excluído.', 'info');
        hideFormView();
    });

    // --- Gerar PDF / Template ---
    window.printOrcamento = (id) => {
        const o = store.getOrcamentoById(parseInt(id));
        if (!o) return;
        const config = store.getConfig();
        const clienteObj = store.getClienteById(o.clienteId) || {};

        const printContainer = document.getElementById('print-view-container');

        const logoHtml = config.logoBase64 ?
            `<img src="${config.logoBase64}" class="max-w-[150px] max-h-[100px] object-contain">` :
            `<div class="font-bold text-2xl text-gray-800">${config.nomeFantasia || 'MINHA EMPRESA'}</div>`;

        const formatDoc = (doc) => doc ? maskCPF_CNPJ(doc) : '';
        const formatPhone = (phone) => {
            if (!phone) return '';
            const un = phone.replace(/\D/g, '');
            if (un.length === 11) return `(${un.substring(0, 2)}) ${un.substring(2, 7)}-${un.substring(7)}`;
            if (un.length === 10) return `(${un.substring(0, 2)}) ${un.substring(2, 6)}-${un.substring(6)}`;
            return phone;
        };

        const dtEmissao = new Date(o.dataCriacao);
        const dtValidade = new Date(dtEmissao);
        dtValidade.setDate(dtValidade.getDate() + 15); // 15 dias de validade padrão

        const itemsRows = o.itens.map((item, idx) => `
            <tr class="border-b border-black text-xs">
                <td class="p-1.5 border-r border-black text-center">${String(idx + 1).padStart(2, '0')}</td>
                <td class="p-1.5 border-r border-black text-left font-medium">
                    ${item.descricao}
                    ${item.tipo === 'Serviço' && item.escopo ? `<div class="text-[10px] text-gray-600 mt-1 whitespace-pre-wrap">${item.escopo}</div>` : ''}
                </td>
                <td class="p-1.5 border-r border-black text-center">${item.qtd} ${item.unidade}</td>
                <td class="p-1.5 border-r border-black text-right">${formatCurrency(item.precoUnitTabela)}</td>
                <td class="p-1.5 text-right font-medium">${formatCurrency(item.valTotalLiquido)}</td>
            </tr>
        `).join('');

        let obsFinais = o.observacoes || '';

        // Custo total / totais
        const extras = (o.frete || 0) + (o.acrescimos || 0);
        let descontosTotais = 0;
        let subtotalFloat = 0;
        o.itens.forEach(i => {
            subtotalFloat += (i.precoUnitTabela * i.qtd);
            descontosTotais += (i.descontoRSUnit * i.qtd);
        });

        // Extras vs descontos exibicao
        let descExtrasText = `-`;
        if (descontosTotais > 0) descExtrasText = `- ${formatCurrency(descontosTotais)} (Desc)`;
        if (extras > 0) descExtrasText += ` / + ${formatCurrency(extras)} (Acres/Frete)`;

        const html = `
        <div class="print-wrapper mx-auto text-black font-sans text-xs w-full max-w-[210mm] bg-white">
            
            <!-- HEADER -->
            <div class="flex justify-between items-center border border-black p-4 mb-2">
                <div class="w-1/3 flex justify-center items-center">
                    ${logoHtml}
                </div>
                <div class="w-2/3 text-right text-[11px] leading-snug flex flex-col items-end">
                    <h1 class="text-sm font-bold uppercase mb-1">${config.nomeFantasia || 'MINHA EMPRESA'}</h1>
                    <p>CNPJ/CPF: ${formatDoc(config.cnpj)}</p>
                    <p>Endereço: ${config.logradouro ? config.logradouro + ' - ' + config.cidade + '/' + config.uf : '--'}</p>
                    <p>Contato: ${formatPhone(config.telefone) || '--'}</p>
                    <p>Email: ${config.email || '--'}</p>
                </div>
            </div>

            <!-- META INFO -->
            <div class="flex border border-black mb-2 text-center font-medium bg-gray-50 uppercase text-[10px]">
                <div class="flex-1 p-2 border-r border-black">Orçamento N°: ${String(o.id).padStart(4, '0')}</div>
                <div class="flex-1 p-2 border-r border-black">Emitido em: ${dtEmissao.toLocaleDateString()}</div>
                <div class="flex-1 p-2">Válido até: ${dtValidade.toLocaleDateString()}</div>
            </div>

            <!-- CLIENT DATA -->
            <div class="border border-black mb-2 text-[10px]">
                <div class="bg-gray-100 text-center font-bold p-1 border-b border-black uppercase text-xs">Dados do Cliente</div>
                
                <div class="flex border-b border-black">
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center shrink-0">CLIENTE</div>
                    <div class="flex-1 p-1 uppercase font-medium">${o.clienteNome}</div>
                </div>
                
                <div class="flex border-b border-black">
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center shrink-0">TELEFONE</div>
                    <div class="flex-1 p-1 border-r border-black">${formatPhone(clienteObj.telefone) || '--'}</div>
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center pl-2 shrink-0">EMAIL</div>
                    <div class="flex-1 p-1">${clienteObj.email || '--'}</div>
                </div>
                
                <div class="flex border-b border-black">
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center shrink-0">CPF/CNPJ</div>
                    <div class="flex-1 p-1 border-r border-black">${formatDoc(clienteObj.doc) || '--'}</div>
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center pl-2 shrink-0">RG/IE</div>
                    <div class="flex-1 p-1">--</div>
                </div>
                
                <div class="flex border-b border-black">
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center shrink-0">ENDEREÇO</div>
                    <div class="flex-1 p-1 border-r border-black">${clienteObj.logradouro || ''}${clienteObj.numero ? ', ' + clienteObj.numero : ''}</div>
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center pl-2 shrink-0">BAIRRO</div>
                    <div class="flex-1 p-1">${clienteObj.bairro || '--'}</div>
                </div>
                
                <div class="flex">
                    <div class="w-24 p-1 font-bold border-r border-black flex items-center shrink-0">CIDADE</div>
                    <div class="flex-1 p-1 border-r border-black">${clienteObj.cidade || '--'}</div>
                    <div class="w-16 p-1 font-bold border-r border-black flex items-center pl-2 shrink-0">ESTADO</div>
                    <div class="w-12 p-1 border-r border-black text-center">${clienteObj.uf || '--'}</div>
                    <div class="w-12 p-1 font-bold border-r border-black flex items-center justify-center shrink-0">CEP</div>
                    <div class="flex-1 p-1 text-center">${clienteObj.cep ? clienteObj.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : '--'}</div>
                </div>
            </div>

            <!-- ITEMS TABLE -->
            <div class="border border-black mb-2">
                <div class="bg-gray-100 text-center font-bold p-1 border-b border-black uppercase text-xs">Orçamento</div>
                
                <table class="w-full text-center border-collapse">
                    <thead>
                        <tr class="border-b border-black font-bold text-[10px] uppercase bg-gray-50">
                            <th class="p-1.5 border-r border-black w-10 text-center">Item</th>
                            <th class="p-1.5 border-r border-black text-left">Produto/Serviço</th>
                            <th class="p-1.5 border-r border-black w-14 text-center">Quant.</th>
                            <th class="p-1.5 border-r border-black w-24 text-right">Valor Unit.</th>
                            <th class="p-1.5 w-24 text-right">Sub-Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
            </div>

            <!-- TOTALS -->
            <div class="flex border border-black mb-2 divide-x divide-black h-16 items-center print-keep-together">
                <div class="flex-1 p-2 flex flex-col items-center justify-center">
                    <span class="font-bold text-[10px] uppercase text-gray-800">Sub-Total Geral:</span>
                    <span class="font-bold text-sm">${formatCurrency(subtotalFloat)}</span>
                </div>
                <div class="flex-[1.5] p-2 flex flex-col items-center justify-center">
                    <span class="font-bold text-[9px] uppercase text-gray-600">Descontos / Acréscimos:</span>
                    <span class="font-medium text-[11px] text-gray-700">${descExtrasText}</span>
                </div>
                <div class="flex-1 p-2 flex flex-col items-center justify-center bg-gray-100 text-dark-900 border-l border-black">
                    <span class="font-bold text-[11px] uppercase">Total Geral:</span>
                    <span class="font-bold text-base">${formatCurrency(o.valorTotalLiquido)}</span>
                </div>
            </div>

            <!-- OBSERVATIONS -->
            <div class="border border-black mb-12 print-keep-together">
                <div class="bg-gray-100 text-left font-bold p-1 border-b border-black uppercase text-xs pl-3">Observações</div>
                <div class="p-3 min-h-[80px] text-[11px]">
                    <p class="font-bold uppercase text-[10px] mb-2">Forma de Pagamento: <span class="font-medium">${o.condicaoTxtLong || o.condicaoPgto}</span></p>
                    <p class="font-bold uppercase text-[10px] mb-1">Outras Observações:</p>
                    <div class="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">${obsFinais}</div>
                </div>
            </div>

            <!-- SIGNATURES -->
            <div class="flex justify-between mt-16 px-8 print-keep-together pb-6">
                <div class="w-64 text-center border-t border-black pt-1 text-[11px]">${config.nomeFantasia || 'Minha Empresa'}</div>
                <div class="w-64 text-center border-t border-black pt-1 text-[11px]">${o.clienteNome}</div>
            </div>
            
        </div>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            // Se o navegador bloquear o popup
            alert('Por favor, permita pop-ups neste site para visualizar a impressão.');
            return;
        }

        const docTitle = `Orçamento_${String(o.id).padStart(4, '0')}`;

        printWindow.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${docTitle}</title>
    <!-- Tailwind CSS (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Google Fonts: Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #fff; line-height: 1.5; padding: 20px; }
        .print-keep-together { break-inside: avoid; }
        @media print {
            body { padding: 0; }
        }
    </style>
</head>
<body class="bg-white">
    ${html}
    <script>
        // Aguarda CSS carregar e renderizar
        setTimeout(() => {
            window.print();
            // Apenas no mobile a tela pode ficar aberta após imprimir. O close evita deixar 200 guias abertas, mas opcionalmente pode ser testado por quem usa.
            // window.close(); 
        }, 800);
    </script>
</body>
</html>
        `);
        printWindow.document.close();
    };

    // Global hook for list row clicks
    window.openEditOrcamento = (id) => {
        isEditing = true;
        currentId = parseInt(id);
        const o = store.getOrcamentoById(currentId);
        if (!o) return;

        showFormView();

        titleForm.textContent = `Orçamento #${String(o.id).padStart(4, '0')} `;
        subtitleForm.textContent = `Criado em: ${new Date(o.dataCriacao).toLocaleString()} `;

        selStatus.value = o.status;
        selCliente.value = o.clienteId;
        iptMarkupGlobal.value = o.markupGlobalBase;

        selCondicao.value = o.condicaoPgto;
        selCondicao.dispatchEvent(new Event('change'));
        iptParcelas.value = o.condicaoParcelas || 1;
        iptPrazoDias.value = o.condicaoPrazo || '';

        currentCart = o.itens || [];
        iptFrete.value = maskMoney((o.frete || 0).toFixed(2));
        iptAcrescimo.value = maskMoney((o.acrescimos || 0).toFixed(2));
        iptObs.value = o.observacoes || '';

        btnPrint.classList.remove('hidden');

        const clienteObj = store.getClienteById(o.clienteId);
        if (clienteObj && clienteObj.isWhatsapp) {
            btnWa.classList.remove('hidden');
        } else {
            btnWa.classList.add('hidden');
        }

        btnExcluir.classList.remove('hidden');
        renderCart();
    };

    btnPrint.addEventListener('click', () => {
        if (currentId) window.printOrcamento(currentId);
    });

    window.openWaOrcamento = (id) => {
        currentId = parseInt(id);
        updateWaPreview();
        modalWa.classList.remove('hidden');
    };

    // Actions Binds Defaults

    // --- WhatsApp Logic ---
    const generateWaMessage = () => {
        if (!currentId) return '';
        const o = store.getOrcamentoById(currentId);
        if (!o) return '';
        const config = store.getConfig();
        const clienteObj = store.getClienteById(o.clienteId) || {};

        let msg = '';

        if (chkWaCabecalho.checked) {
            let cabecalho = config.whatsappCabecalho !== undefined && config.whatsappCabecalho !== '' ? config.whatsappCabecalho : 'Olá, *{nome}* 👋\nSegue abaixo o resumo do seu orçamento solicitado:';
            cabecalho = cabecalho.replace(/{nome}/g, clienteObj.nome || 'Cliente');
            msg += cabecalho + '\n\n';
        }

        msg += `*Orçamento N°:* ${String(o.id).padStart(4, '0')}\n`;
        msg += `*Data:* ${new Date(o.dataCriacao).toLocaleDateString()}\n\n`;

        msg += `*ITENS DO PEDIDO:*\n`;
        o.itens.forEach(i => {
            msg += `▫️ ${i.qtd}x ${i.descricao} - ${formatCurrency(i.valTotalLiquido)}\n`;
        });
        msg += '\n';

        if (chkWaTotais.checked) {
            let subtotalBruto = 0;
            let descontos = 0;
            o.itens.forEach(i => {
                subtotalBruto += (i.precoUnitTabela * i.qtd);
                descontos += (i.descontoRSUnit * i.qtd);
            });
            const frete = o.frete || 0;
            const acrescimos = o.acrescimos || 0;

            msg += `*RESUMO*\n`;
            if (descontos > 0) msg += `Subtotal: ${formatCurrency(subtotalBruto)}\nDescontos: -${formatCurrency(descontos)}\n`;
            if (frete > 0) msg += `Frete: ${formatCurrency(frete)}\n`;
            if (acrescimos > 0) msg += `Acréscimos: ${formatCurrency(acrescimos)}\n`;

            msg += `*Total Líquido: ${formatCurrency(o.valorTotalLiquido)}*\n\n`;
        } else {
            msg += `*Total Geral: ${formatCurrency(o.valorTotalLiquido)}*\n\n`;
        }

        if (chkWaCondicao.checked) {
            msg += `*Condição de Pagamento:*\n${o.condicaoTxtLong || o.condicaoPgto}\n\n`;
        }

        if (chkWaObs.checked && o.observacoes) {
            msg += `*Observações:*\n${o.observacoes}\n\n`;
        }

        if (chkWaPix.checked && config.chavePix) {
            msg += `*Pagamento PIX:*\nChave: ${config.chavePix}\n\n`;
        }

        if (chkWaRodape.checked) {
            let rodape = config.whatsappRodape !== undefined && config.whatsappRodape !== '' ? config.whatsappRodape : 'Qualquer dúvida, estamos à disposição!\nAtenciosamente, *{empresa}*';
            rodape = rodape.replace(/{empresa}/g, config.nomeFantasia || 'Nossa Empresa');
            msg += rodape;
        }

        return msg.trim();
    };

    const updateWaPreview = () => {
        waPreview.value = generateWaMessage();
    };

    // Bind checkboxes to live update
    [chkWaCabecalho, chkWaTotais, chkWaCondicao, chkWaObs, chkWaPix, chkWaRodape]
        .forEach(chk => chk.addEventListener('change', updateWaPreview));

    btnWa.addEventListener('click', () => {
        if (!currentId) return;
        updateWaPreview();
        modalWa.classList.remove('hidden');
    });

    const closeWaModal = () => {
        modalWa.classList.add('hidden');
    };

    btnCloseWa.addEventListener('click', closeWaModal);
    document.getElementById('modal-wa-backdrop').addEventListener('click', closeWaModal);

    btnWaCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(waPreview.value)
            .then(() => app.showToast('Mensagem copiada para a área de transferência!', 'success'))
            .catch(() => app.showToast('Erro ao copiar', 'error'));
    });

    btnWaSend.addEventListener('click', () => {
        const o = store.getOrcamentoById(currentId);
        if (!o) return;
        const clienteObj = store.getClienteById(o.clienteId) || {};

        let phone = clienteObj.telefone ? clienteObj.telefone.replace(/\D/g, '') : '';
        if (phone.length === 10 || phone.length === 11) {
            phone = '55' + phone; // Assumindo Brasil
        }

        const text = encodeURIComponent(waPreview.value);
        let url = `https://wa.me/?text=${text}`;

        if (phone) {
            url = `https://wa.me/${phone}?text=${text}`;
        }

        window.open(url, '_blank');
        closeWaModal();
    });

    // --- Actions Binds Defaults ---
    btnNovo.addEventListener('click', () => {
        isEditing = false;
        currentId = null;

        showFormView();

        titleForm.textContent = `Novo Orçamento`;
        subtitleForm.textContent = `Pendente`;

        selStatus.value = 'Orçamento';
        selCliente.value = '';
        selCondicao.value = 'A Vista';
        selCondicao.dispatchEvent(new Event('change'));
        iptFrete.value = '0,00';
        iptAcrescimo.value = '0,00';
        iptObs.value = '';
        currentCart = [];

        btnPrint.classList.add('hidden');
        btnWa.classList.add('hidden');
        btnExcluir.classList.add('hidden');
        renderCart();
    });

    btnBack.addEventListener('click', hideFormView);
    searchInput.addEventListener('input', (e) => renderMainTable(e.target.value));

    // Initialize list
    renderMainTable();

    // Check if entered with hash param ?id=X (From Dashboard click)
    const urlParams = window.location.hash.split('?id=')[1];
    if (urlParams) {
        // Wait a small tick so cache is populated
        setTimeout(() => window.app.currentViewModule.openEdit(urlParams), 100);
    }
}
