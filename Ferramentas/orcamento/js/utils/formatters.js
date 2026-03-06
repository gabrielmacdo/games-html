// js/utils/formatters.js

/**
 * Remove tudo o que não é dígito
 */
export const unmask = (v) => v ? v.replace(/\D/g, '') : '';

/**
 * Máscara dinâmica para CPF ou CNPJ
 */
export const maskCPF_CNPJ = (v) => {
    v = unmask(v);
    if (v.length <= 11) { // CPF
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else { // CNPJ
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    }
    return v;
};

/**
 * Máscara de CEP (00000-000)
 */
export const maskCEP = (v) => {
    v = unmask(v);
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v;
};

/**
 * Máscara dinâmica de Telefone (Fixo ou Celular)
 */
export const maskPhone = (v) => {
    v = unmask(v);
    if (v.length <= 10) { // Fixo: (00) 0000-0000
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else { // Celular: (00) 00000-0000
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v;
};

/**
 * Formata número para Moeda (R$ 0,00) apenas para exibição
 */
export const formatCurrency = (value) => {
    const number = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

/**
 * Máscara para input de dinheiro (digitação da direita pra esquerda)
 */
export const maskMoney = (v) => {
    v = unmask(v);
    if (!v) return '0,00';
    v = (parseInt(v, 10) / 100).toFixed(2) + '';
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return v;
};

/**
 * Parser: Transforma o valor de tela (1.000,00) em Number do JS (1000.00)
 */
export const parseMoney = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    let val = v.replace(/\./g, '').replace(',', '.');
    return parseFloat(val) || 0;
};
