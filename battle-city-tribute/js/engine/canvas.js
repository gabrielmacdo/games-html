const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuração pixel art nítida
ctx.imageSmoothingEnabled = false;

export { canvas, ctx };