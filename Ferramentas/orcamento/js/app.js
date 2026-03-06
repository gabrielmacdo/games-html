// js/app.js
import store from './store.js';

class App {
    constructor() {
        this.appContent = document.getElementById('app-content');
        this.pageTitle = document.getElementById('page-title');
        this.currentViewModule = null;

        this.initSidebar();
        this.initDataBindings();
        this.initRouting();
        this.initBackupRestore();

        // Load initial hash
        window.dispatchEvent(new Event('hashchange'));
    }

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const navLinks = document.querySelectorAll('.nav-link');

        const toggleSidebar = () => {
            const isClosed = sidebar.classList.contains('-translate-x-full');
            if (isClosed) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden', 'opacity-0');
                overlay.classList.add('opacity-100');
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.remove('opacity-100');
                overlay.classList.add('opacity-0');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            }
        };

        openBtn.addEventListener('click', toggleSidebar);
        closeBtn.addEventListener('click', toggleSidebar);
        overlay.addEventListener('click', toggleSidebar);

        // Close sidebar on mobile when a link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024 && !sidebar.classList.contains('-translate-x-full')) {
                    toggleSidebar();
                }
            });
        });
    }

    initDataBindings() {
        const config = store.getConfig();
        const logoImg = document.getElementById('sidebar-logo-img');
        const logoText = document.getElementById('sidebar-logo-text');
        const companyName = document.getElementById('sidebar-company-name');

        if (config.nomeFantasia) {
            companyName.textContent = config.nomeFantasia;
            logoText.textContent = config.nomeFantasia.charAt(0).toUpperCase();
        }

        if (config.logoBase64) {
            logoImg.src = config.logoBase64;
            logoImg.classList.remove('hidden');
            logoText.classList.add('hidden');
        } else {
            logoImg.classList.add('hidden');
            logoText.classList.remove('hidden');
        }
    }

    initBackupRestore() {
        document.getElementById('backup-btn').addEventListener('click', () => {
            store.exportBackup();
            this.showToast('Backup exportado com sucesso!', 'success');
        });

        const restoreInput = document.getElementById('restore-input');

        document.getElementById('restore-btn').addEventListener('click', () => {
            restoreInput.click();
        });

        restoreInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const result = store.importBackup(event.target.result);
                if (result.success) {
                    this.showToast('Backup restaurado com sucesso! Recarregando...', 'success');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    this.showToast(result.error || 'Erro ao restaurar backup.', 'error');
                }
                // Limpa o input file
                restoreInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    initRouting() {
        window.addEventListener('hashchange', () => this.handleRoute());

        // Setup initial default route
        if (!window.location.hash) {
            window.location.hash = '#/dashboard';
        }
    }

    async handleRoute() {
        const hash = window.location.hash || '#/dashboard';
        const routeParts = hash.split('/');
        const viewName = routeParts[1] || 'dashboard'; // ex: dashboard, clientes

        // Update Nav Menu UI
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href').startsWith(`#/${viewName}`)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Set Title based on route
        const titles = {
            'dashboard': 'Dashboard',
            'clientes': 'Clientes',
            'produtos': 'Produtos e Serviços',
            'orcamentos': 'Orçamentos e Pedidos',
            'configuracoes': 'Configurações'
        };
        this.pageTitle.textContent = titles[viewName] || 'OrçaPRO';

        this.appContent.innerHTML = `
            <div class="flex items-center justify-center h-64">
                <svg class="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        `;

        try {
            // Unmount previous view if any
            if (this.currentViewModule && typeof this.currentViewModule.unmount === 'function') {
                this.currentViewModule.unmount();
            }

            // Dynamically import the view module
            const module = await import(`./views/${viewName}.js`);
            this.currentViewModule = module;

            // Render HTML
            this.appContent.innerHTML = `<div class="view-enter">${module.template()}</div>`;

            // Re-bind Logo after routing (in case configs were changed)
            this.initDataBindings();

            // Initialize Javascript for the view (passing app context for toasts etc)
            if (typeof module.init === 'function') {
                // Wait a tick for DOM to update
                setTimeout(() => module.init(this), 0);
            }

        } catch (error) {
            console.error(`Error loading view ${viewName}:`, error);
            this.appContent.innerHTML = `
                <div class="bg-red-50 text-red-700 p-6 rounded-lg shadow-sm border border-red-200 text-center">
                    <h2 class="text-xl font-bold mb-2">Página em Construção</h2>
                    <p>O módulo <strong>${viewName}</strong> ainda não foi implementado.</p>
                </div>
            `;
        }
    }

    // --- Global Helpers for Views ---

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-50 z-50 text-green-800 border-green-200',
            error: 'bg-red-50 text-red-800 border-red-200',
            info: 'bg-blue-50 text-blue-800 border-blue-200'
        };

        toast.className = `px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 transition-all duration-300 transform translate-y-full opacity-0 ${colors[type] || colors.info}`;

        toast.innerHTML = `
            <div class="font-medium text-sm">${message}</div>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-full', 'opacity-0');
        });

        // Remove after 3s
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize Application once DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
