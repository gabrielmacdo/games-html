export const config = {
    sound: true,
    texture: 'retro', // retro ou modern
    difficulty: 'normal' // easy, normal, hardcore
};

export function toggleSetting(type) {
    if (type === 'sound') {
        config.sound = !config.sound;
        document.getElementById('btn-sound').innerText = config.sound ? 'LIGADO' : 'DESLIGADO';
    } else if (type === 'texture') {
        config.texture = config.texture === 'retro' ? 'modern' : 'retro';
        document.getElementById('btn-texture').innerText = config.texture === 'retro' ? 'ANTIGO (RETRÔ)' : 'NOVO (HD)';
    } else if (type === 'difficulty') {
        if (config.difficulty === 'easy') config.difficulty = 'normal';
        else if (config.difficulty === 'normal') config.difficulty = 'hardcore';
        else config.difficulty = 'easy';
        document.getElementById('btn-difficulty').innerText = config.difficulty.toUpperCase();
    }
}