import { toggleSetting } from './config.js';

export function initMenu(onStartGame) {
    // Eventos do Menu Inicial
    document.getElementById('opt-single').addEventListener('click', () => {
        switchScreen(null); // Fecha todos os menus
        onStartGame('SINGLE');
    });

    document.getElementById('opt-coop').addEventListener('click', () => {
        alert("Modo Multiplayer Co-op em breve com PeerJS!");
    });

    document.getElementById('opt-vs').addEventListener('click', () => {
        alert("Modo Multiplayer VS em breve!");
    });

    document.getElementById('opt-editor').addEventListener('click', () => {
        alert("Modo Editor em breve!");
    });

    document.getElementById('opt-config').addEventListener('click', () => {
        switchScreen('config-screen');
    });

    // Eventos da Tela de Configurações
    document.getElementById('btn-sound').addEventListener('click', () => toggleSetting('sound'));
    document.getElementById('btn-texture').addEventListener('click', () => toggleSetting('texture'));
    document.getElementById('btn-difficulty').addEventListener('click', () => toggleSetting('difficulty'));
    
    document.getElementById('btn-back-menu').addEventListener('click', () => {
        switchScreen('menu-screen');
    });
}

export function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.add('hidden'));
    if (screenId) {
        document.getElementById(screenId).classList.remove('hidden');
    }
}