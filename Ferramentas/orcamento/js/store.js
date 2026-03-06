// js/store.js - Global State Management (Singleton Patterm)

class Store {
    constructor() {
        if (Store.instance) {
            return Store.instance;
        }
        Store.instance = this;

        this.storageKey = '@OrcaPRO:data:1.0';

        // Default State
        this.state = {
            configuracoes: {
                nomeFantasia: '',
                cpfCnpj: '',
                endereco: '',
                telefone: '',
                email: '',
                logoBase64: '',
                senhaLiberacao: '123',
                whatsappCabecalho: 'Olá, *{nome}* 👋\nSegue abaixo o resumo do seu orçamento solicitado:',
                whatsappRodape: 'Qualquer dúvida, estamos à disposição!\nAtenciosamente, *{empresa}*',
                chavePix: ''
            },
            clientes: [],
            produtos: [],
            orcamentos: []
        };

        this.load();
    }

    // --- Core Methods ---

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
            throw new Error('Não foi possível salvar os dados. Verifique se o modo anônimo está bloqueando o armazenamento.');
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                // Preserve default configuracoes properties if missing in parsed
                if (parsed.configuracoes) {
                    parsed.configuracoes = { ...this.state.configuracoes, ...parsed.configuracoes };
                }
                // Merge with default state to ensure structure exists
                this.state = { ...this.state, ...parsed };
            }
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            // Fallback gracefully
        }
    }

    // --- Configurações ---
    getConfig() {
        return this.state.configuracoes;
    }

    setConfig(newConfig) {
        this.state.configuracoes = { ...this.state.configuracoes, ...newConfig };
        this.save();
    }

    // --- Helpers (CRUD base) ---

    _generateId(collection) {
        if (!this.state[collection] || this.state[collection].length === 0) return 1;
        const maxId = Math.max(...this.state[collection].map(item => item.id || 0));
        return maxId + 1;
    }

    // --- Clientes ---
    getClientes() {
        return this.state.clientes;
    }

    getClienteById(id) {
        return this.state.clientes.find(c => c.id === parseInt(id));
    }

    addCliente(cliente) {
        cliente.id = this._generateId('clientes');
        this.state.clientes.push(cliente);
        this.save();
        return cliente;
    }

    updateCliente(id, newData) {
        const index = this.state.clientes.findIndex(c => c.id === parseInt(id));
        if (index !== -1) {
            this.state.clientes[index] = { ...this.state.clientes[index], ...newData };
            this.save();
            return this.state.clientes[index];
        }
        return null;
    }

    deleteCliente(id) {
        this.state.clientes = this.state.clientes.filter(c => c.id !== parseInt(id));
        this.save();
    }

    // --- Produtos e Serviços ---
    getProdutos() {
        return this.state.produtos;
    }

    getProdutoById(id) {
        return this.state.produtos.find(p => p.id === parseInt(id));
    }

    addProduto(produto) {
        produto.id = this._generateId('produtos');
        this.state.produtos.push(produto);
        this.save();
        return produto;
    }

    updateProduto(id, newData) {
        const index = this.state.produtos.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            this.state.produtos[index] = { ...this.state.produtos[index], ...newData };
            this.save();
            return this.state.produtos[index];
        }
        return null;
    }

    deleteProduto(id) {
        this.state.produtos = this.state.produtos.filter(p => p.id !== parseInt(id));
        this.save();
    }

    // --- Orçamentos / Pedidos ---
    getOrcamentos() {
        return this.state.orcamentos;
    }

    getOrcamentoById(id) {
        return this.state.orcamentos.find(o => o.id === parseInt(id));
    }

    addOrcamento(orcamento) {
        orcamento.id = this._generateId('orcamentos');
        orcamento.dataCriacao = new Date().toISOString();
        this.state.orcamentos.push(orcamento);
        this.save();
        return orcamento;
    }

    updateOrcamento(id, newData) {
        const index = this.state.orcamentos.findIndex(o => o.id === parseInt(id));
        if (index !== -1) {
            newData.dataAtualizacao = new Date().toISOString();
            this.state.orcamentos[index] = { ...this.state.orcamentos[index], ...newData };
            this.save();
            return this.state.orcamentos[index];
        }
        return null;
    }

    deleteOrcamento(id) {
        this.state.orcamentos = this.state.orcamentos.filter(o => o.id !== parseInt(id));
        this.save();
    }

    // --- Backup & Restore ---

    exportBackup() {
        const dataStr = JSON.stringify(this.state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const date = new Date().toISOString().split('T')[0];
        a.download = `dados_sistema_orcapro_${date}.json`;
        a.href = url;
        a.click();

        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    importBackup(fileContent) {
        try {
            const parsed = JSON.parse(fileContent);
            // Basic validation to ensure it's our backup structure
            if (parsed.configuracoes && Array.isArray(parsed.clientes)) {
                this.state = parsed;
                this.save();
                return { success: true };
            } else {
                return { success: false, error: 'Arquivo JSON em formato incorreto ou corrompido.' };
            }
        } catch (e) {
            console.error('Erro ao importar backup:', e);
            return { success: false, error: 'O arquivo selecionado não é um JSON válido.' };
        }
    }
}

// Export a single instance
const store = new Store();
export default store;
