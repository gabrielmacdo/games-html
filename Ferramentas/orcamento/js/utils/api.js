// js/utils/api.js

/**
 * Consulta a API do ViaCEP e retorna os dados do endereço
 * @param {string} cep CEP no formato 00000-000 ou 00000000
 * @returns Object com dados do CEP ou null em caso de erro
 */
export async function fetchEnderecoPorCEP(cep) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) {
            return null;
        }

        return {
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
        };
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return null;
    }
}

/**
 * Consulta a API publica.cnpj.ws e retorna dados do CNPJ
 * @param {string} cnpj CNPJ limpo ou formatado
 * @returns Object com dados da Empresa ou null
 */
export async function fetchDadosPorCNPJ(cnpj) {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return null;

    try {
        const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Pega endereco do estabelecimento principal (matriz ou filial consultada)
        const estab = data.estabelecimento;

        return {
            razaoSocial: data.razao_social,
            nomeFantasia: estab.nome_fantasia || data.razao_social,
            cep: estab.cep,
            logradouro: estab.logradouro,
            numero: estab.numero,
            bairro: estab.bairro,
            cidade: estab.cidade.nome,
            uf: estab.estado.sigla,
            telefone: estab.telefone1 || estab.telefone2 || ''
        };

    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error);
        return null;
    }
}
