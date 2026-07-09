export const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 's', 'a', 'd'].includes(e.key)) {
        e.preventDefault(); // Evita scroll da tela
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});