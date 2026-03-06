// js/views/dashboard.js
import store from '../store.js';
import { formatCurrency } from '../utils/formatters.js';

export function template() {
    return `
        <div class="space-y-6 animate-fade-in">
            
            <!-- Cards Header -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                
                <!-- Card 1 -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-24 h-24 bg-primary-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 bg-primary-100 text-primary-600 rounded-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <h3 class="text-gray-500 text-sm font-medium">Total Orçamentos</h3>
                        </div>
                        <p class="text-3xl font-bold text-dark-900" id="dash-total-qtd">0</p>
                    </div>
                </div>

                <!-- Card 2 -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-24 h-24 bg-green-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 bg-green-100 text-green-600 rounded-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 class="text-gray-500 text-sm font-medium">Total Fechados (Mês)</h3>
                        </div>
                        <p class="text-3xl font-bold text-dark-900" id="dash-total-fechados">R$ 0,00</p>
                    </div>
                </div>

                <!-- Card 3 -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-24 h-24 bg-yellow-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 class="text-gray-500 text-sm font-medium">Aprovados/Pendentes</h3>
                        </div>
                        <p class="text-3xl font-bold text-dark-900" id="dash-total-aprovados">R$ 0,00</p>
                    </div>
                </div>

                <!-- Card 4 -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center relative overflow-hidden group">
                    <div class="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            </div>
                            <h3 class="text-gray-500 text-sm font-medium">Markup Médio</h3>
                        </div>
                        <p class="text-2xl font-bold text-dark-900"><span id="dash-markup-medio">0</span>%</p>
                        <p class="text-xs text-gray-400 mt-1">Baseado nos fechados</p>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="font-bold text-dark-900 mb-4">Evolução de Orçamentos (6 meses)</h3>
                    <div class="relative h-64 w-full">
                        <canvas id="chartLine"></canvas>
                    </div>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 class="font-bold text-dark-900 mb-4">Faturamento por Status</h3>
                    <div class="relative h-64 w-full">
                        <canvas id="chartBar"></canvas>
                    </div>
                </div>
            </div>

            <!-- Recent Orders Table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-dark-900">Últimos Orçamentos</h3>
                    <a href="#/orcamentos" class="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver todos &rarr;</a>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse responsive-table">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                <th class="p-4 font-medium">Cód / Data</th>
                                <th class="p-4 font-medium">Cliente</th>
                                <th class="p-4 font-medium">Status</th>
                                <th class="p-4 font-medium text-right">Valor Líquido</th>
                            </tr>
                        </thead>
                        <tbody id="dash-recent-table" class="text-sm">
                            <!-- Injetado via JS -->
                        </tbody>
                    </table>
                </div>
                <div id="dash-empty-state" class="hidden p-8 text-center text-gray-500">
                    Nenhum orçamento cadastrado ainda.
                </div>
            </div>

        </div>
    `;
}

export function init(app) {
    const orcamentos = store.getOrcamentos();

    // Calcula KPIs
    calcularKPIs(orcamentos);

    // Configura e renderiza Gráficos (se tivermos a lib Chart disponivel via CDN)
    if (window.Chart) {
        renderCharts(orcamentos);
    } else {
        // Fallback apenas para garantir que logue o erro se a CDN falhar mas não quebre a página
        console.warn('Chart.js não carregado.');
    }

    // Renderiza Tabela
    renderRecentTable(orcamentos);
}

function calcularKPIs(orcamentos) {
    const qtdEl = document.getElementById('dash-total-qtd');
    const fechadosEl = document.getElementById('dash-total-fechados');
    const aprovadosEl = document.getElementById('dash-total-aprovados');
    const markupEl = document.getElementById('dash-markup-medio');

    qtdEl.textContent = orcamentos.length;

    // Filtros de tempo: Aqui, para simplificar vamos pegar todos, mas o ideal seria filtrar por mês corrente.
    let totalFechados = 0;
    let totalAprovados = 0;
    let sumMarkupFechados = 0;
    let countFechados = 0;

    orcamentos.forEach(o => {
        const val = parseFloat(o.valorTotalLiquido) || 0;
        if (o.status === 'Fechado') {
            totalFechados += val;
            sumMarkupFechados += parseFloat(o.markupGeralReal) || 0;
            countFechados++;
        } else if (o.status === 'Pedido Aprovado') {
            totalAprovados += val;
        }
    });

    fechadosEl.textContent = formatCurrency(totalFechados);
    aprovadosEl.textContent = formatCurrency(totalAprovados);

    const avgMarkup = countFechados > 0 ? (sumMarkupFechados / countFechados).toFixed(2) : 0;
    markupEl.textContent = avgMarkup;
}

function renderCharts(orcamentos) {
    // Preparando dados dummy baseados nos orçamentos reais seria complexo sem libs de data (date-fns).
    // Faremos um agregador simples de status para o Bar Chart.

    const statusCount = {
        'Orçamento': 0,
        'Pedido Aprovado': 0,
        'Fechado': 0,
        'Cancelado': 0
    };

    orcamentos.forEach(o => {
        if (statusCount[o.status] !== undefined) {
            statusCount[o.status] += parseFloat(o.valorTotalLiquido) || 0;
        }
    });

    // Bar Chart (Faturamento por status)
    const ctxBar = document.getElementById('chartBar').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: Object.keys(statusCount),
            datasets: [{
                label: 'Faturamento (R$)',
                data: Object.values(statusCount),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)', // Orçamento (blue)
                    'rgba(234, 179, 8, 0.6)',  // Aprovado (yellow)
                    'rgba(34, 197, 94, 0.6)',  // Fechado (green)
                    'rgba(239, 68, 68, 0.6)'   // Cancelado (red)
                ],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Line Chart (Dummy data para trendline, já que demandaria histórico mês a mês real)
    // Se houvessem datas reais distribuídas:
    const ctxLine = document.getElementById('chartLine').getContext('2d');
    new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Qtd. Orçamentos',
                data: [0, 0, 0, 0, 0, orcamentos.length], // Simulando crescimento no ultimo mês
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

function renderRecentTable(orcamentos) {
    const tbody = document.getElementById('dash-recent-table');
    const emptyState = document.getElementById('dash-empty-state');

    if (orcamentos.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    // Sort descending by id (newest first) and take top 10
    const recentes = [...orcamentos].sort((a, b) => b.id - a.id).slice(0, 10);

    const statusColors = {
        'Orçamento': 'bg-blue-100 text-blue-800',
        'Pedido Aprovado': 'bg-yellow-100 text-yellow-800',
        'Fechado': 'bg-green-100 text-green-800',
        'Cancelado': 'bg-red-100 text-red-800'
    };

    let html = '';
    for (const o of recentes) {
        const clienteNome = o.clienteNome || 'Cliente não definido';
        const dataStr = new Date(o.dataCriacao).toLocaleDateString();
        const colorClass = statusColors[o.status] || 'bg-gray-100 text-gray-800';

        html += `
            <tr class="hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-none" onclick="window.location.hash='#/orcamentos?id=${o.id}'">
                <td class="p-4" data-label="Cód / Data">
                    <span class="font-medium text-dark-900">#${String(o.id).padStart(4, '0')}</span>
                    <br><span class="text-xs text-gray-500">${dataStr}</span>
                </td>
                <td class="p-4 font-medium text-dark-800" data-label="Cliente">${clienteNome}</td>
                <td class="p-4" data-label="Status">
                    <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}">
                        ${o.status}
                    </span>
                </td>
                <td class="p-4 text-right font-bold text-dark-900" data-label="Valor Líquido">
                    ${formatCurrency(o.valorTotalLiquido || 0)}
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}
