// js/views/configuracoes.js
import store from '../store.js';
import { maskCPF_CNPJ, maskPhone } from '../utils/formatters.js';

export function template() {
    return `
        <div class="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50">
                    <div class="flex items-center gap-4">
                        <div class="p-3 bg-primary-100 text-primary-600 rounded-xl shadow-inner">
                            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <div>
                            <h2 class="text-xl md:text-2xl font-bold text-dark-900 tracking-tight">Configurações Base</h2>
                            <p class="text-gray-500 text-sm mt-1">Dados da sua empresa que aparecerão nos orçamentos gerados.</p>
                        </div>
                    </div>
                </div>

                <div class="p-6 md:p-8">
                    <form id="config-form" class="space-y-6">
                        
                        <!-- Logo Upload Section -->
                        <div class="flex flex-col sm:flex-row gap-6 items-start">
                            <div class="w-full sm:w-1/3">
                                <label class="block text-sm font-medium text-gray-700 mb-2">Logo da Empresa</label>
                                <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-primary-500 transition-colors bg-gray-50 group relative">
                                    <div class="space-y-1 text-center" id="logo-preview-container">
                                        <svg class="mx-auto h-12 w-12 text-gray-400 group-hover:text-primary-500 transition-colors" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                        <div class="flex text-sm text-gray-600 justify-center">
                                            <label for="logo-upload" class="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                                <span>Upload de um arquivo</span>
                                                <input id="logo-upload" name="logo-upload" type="file" class="sr-only" accept="image/*">
                                            </label>
                                        </div>
                                        <p class="text-xs text-gray-500">PNG, JPG até 2MB</p>
                                    </div>
                                    <img id="logo-img" src="" class="hidden max-h-32 object-contain rounded z-10">
                                    <button type="button" id="remove-logo" class="hidden absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 z-20" title="Remover Logo">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            </div>

                            <div class="w-full sm:w-2/3 space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Nome Fantasia <span class="text-red-500">*</span></label>
                                    <input type="text" id="config-nome" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="Nome da sua empresa">
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">CPF ou CNPJ</label>
                                        <input type="text" id="config-documento" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="00.000.000/0000-00">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                        <input type="text" id="config-telefone" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="(00) 00000-0000">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr class="border-gray-100">

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="md:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                                <input type="text" id="config-endereco" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="Rua, Número, Bairro, Cidade - UF">
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">E-mail Profissional</label>
                                <input type="email" id="config-email" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="contato@empresa.com.br">
                            </div>

                            <div class="relative">
                                <label class="block text-sm font-medium text-gray-700 mb-1">
                                    Senha de Liberação de Descontos
                                    <span class="text-gray-400 group relative ml-1 cursor-help">
                                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <div class="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-dark-900 text-white text-xs rounded shadow-lg z-10 text-center">
                                            Senha usada para autorizar exclusão de itens e descontos acima do teto. Padrão: 123
                                        </div>
                                    </span>
                                </label>
                                <input type="password" id="config-senha" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="***">
                            </div>

                            <div class="md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                                <h3 class="text-md font-bold text-dark-900 mb-4 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"></path></svg>
                                    Integração WhatsApp
                                </h3>
                                
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="md:col-span-2">
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Chave PIX e/ou Link de Pagamento</label>
                                        <input type="text" id="config-pix" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors" placeholder="chave@pix.com ou https://link.pagamento">
                                        <p class="text-xs text-gray-500 mt-1">Será exibido no final da mensagem do WhatsApp.</p>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Cabeçalho Padrão</label>
                                        <textarea id="config-wa-cabecalho" rows="3" class="w-full px-4 py-2.5 bg-green-50/30 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm font-mono"></textarea>
                                        <p class="text-xs text-gray-500 mt-1">Variáveis úteis: {nome}</p>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Rodapé Padrão</label>
                                        <textarea id="config-wa-rodape" rows="3" class="w-full px-4 py-2.5 bg-green-50/30 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-sm font-mono"></textarea>
                                        <p class="text-xs text-gray-500 mt-1">Variáveis úteis: {empresa}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="pt-6 border-t border-gray-100 flex justify-end">
                            <button type="submit" class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm shadow-primary-500/30 transition-all flex items-center gap-2">
                                <span>Salvar Configurações</span>
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    `;
}

export function init(app) {
    const form = document.getElementById('config-form');

    // Inputs
    const inputNome = document.getElementById('config-nome');
    const inputDoc = document.getElementById('config-documento');
    const inputEnd = document.getElementById('config-endereco');
    const inputTel = document.getElementById('config-telefone');
    const inputEmail = document.getElementById('config-email');
    const inputSenha = document.getElementById('config-senha');

    // WA Inputs
    const inputPix = document.getElementById('config-pix');
    const inputWaCab = document.getElementById('config-wa-cabecalho');
    const inputWaRod = document.getElementById('config-wa-rodape');

    // Logo elements
    const logoUpload = document.getElementById('logo-upload');
    const logoImg = document.getElementById('logo-img');
    const logoPreviewContainer = document.getElementById('logo-preview-container');
    const removeLogoBtn = document.getElementById('remove-logo');

    let currentLogoBase64 = '';

    // Load initial data
    const config = store.getConfig();
    inputNome.value = config.nomeFantasia || '';
    inputDoc.value = maskCPF_CNPJ(config.cpfCnpj || '');
    inputEnd.value = config.endereco || '';
    inputTel.value = maskPhone(config.telefone || '');
    inputEmail.value = config.email || '';
    inputSenha.value = config.senhaLiberacao || '123';

    inputPix.value = config.chavePix || '';
    inputWaCab.value = config.whatsappCabecalho || 'Olá, *{nome}* 👋\nSegue abaixo o resumo do seu orçamento solicitado:';
    inputWaRod.value = config.whatsappRodape || 'Qualquer dúvida, estamos à disposição!\nAtenciosamente, *{empresa}*';

    if (config.logoBase64) {
        currentLogoBase64 = config.logoBase64;
        showLogo(currentLogoBase64);
    }

    // Masks bindings
    inputDoc.addEventListener('input', (e) => e.target.value = maskCPF_CNPJ(e.target.value));
    inputTel.addEventListener('input', (e) => e.target.value = maskPhone(e.target.value));

    // Logo Upload Logic
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            app.showToast('A imagem deve ter no máximo 2MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            currentLogoBase64 = event.target.result;
            showLogo(currentLogoBase64);
        };
        reader.readAsDataURL(file);
    });

    removeLogoBtn.addEventListener('click', () => {
        currentLogoBase64 = '';
        logoImg.src = '';
        logoImg.classList.add('hidden');
        logoPreviewContainer.classList.remove('hidden');
        removeLogoBtn.classList.add('hidden');
        logoUpload.value = '';
    });

    function showLogo(src) {
        logoImg.src = src;
        logoImg.classList.remove('hidden');
        logoPreviewContainer.classList.add('hidden');
        removeLogoBtn.classList.remove('hidden');
    }

    // Save Data
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        store.setConfig({
            nomeFantasia: inputNome.value.trim(),
            cpfCnpj: inputDoc.value.trim(),
            endereco: inputEnd.value.trim(),
            telefone: inputTel.value.trim(),
            email: inputEmail.value.trim(),
            logoBase64: currentLogoBase64,
            senhaLiberacao: inputSenha.value || '123',
            chavePix: inputPix.value.trim(),
            whatsappCabecalho: inputWaCab.value.trim(),
            whatsappRodape: inputWaRod.value.trim()
        });

        // Update the app shell UI (sidebar logo/name)
        app.initDataBindings();

        app.showToast('Configurações salvas com sucesso!', 'success');
    });
}
