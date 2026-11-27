# 🥚🎯 EGGFIRE 3D — First-Person Arena Shooter

**EGGFIRE 3D** é um FPS estilo Arena Retro / Arcade no universo **Egg-Man**, desenvolvido com **HTML5, CSS3 (`100dvh`), JavaScript ES6 Modules nativos, Three.js (`v0.160.0`) e Web Audio API 100% procedural** — sem etapa de build, sem backend e pronto para hospedagem direta no **GitHub Pages**.

---

## 🚀 Como Executar ou Publicar no GitHub Pages

1. **Zero Build / Caminhos 100% Relativos:** Todos os módulos e folhas de estilo utilizam caminhos relativos (`./css/style.css`, `./js/main.js`), funcionando diretamente tanto na raiz quanto em subdiretórios (`https://usuario.github.io/repositorio/`).
2. **Teste Local:** Sirva a pasta do projeto com qualquer servidor HTTP estático:
   ```bash
   npx serve .
   # ou
   python -m http.server 8080
   ```

---

## 🎮 Controles (Desktop & Mobile Dual-Touch)

| Ação | Desktop (Teclado + Mouse) | Mobile (Modo Paisagem / Landscape) |
| :--- | :--- | :--- |
| **Mover / Strafe 360°** | `W` `A` `S` `D` ou `Setas` | Joystick Analógico Virtual (Esquerda) |
| **Olhar / Mirar** | `Mouse` (Pointer Lock ou Arrasto) | Arrasto livre do polegar (Direita) |
| **Atirar** | `Clique Esquerdo` ou `Espaço` | Botão Dedicado `🔥` (Segure p/ Rajada) |
| **Configurações / Pausa** | `P`, `ESC` ou botão `⚙️` | Botão `⚙️` no topo direito |
| **Alternar Som** | `M` ou botão `🔊` | Botão `🔊` no topo direito |
| **Tela Cheia** | Botão `⛶` | Automático ao iniciar ou botão `⛶` |

---

## ⚡ Armas, Power-Ups 3D e Sistema de Hordas

- **Egg-Pistol (Arma Base):** Munição infinita, disparo *Hitscan* instantâneo com feixe luminoso (*tracer*), cadência de `0.32s` e `35 HP` de dano (quebra a casca de um ovo inimigo de `100 HP` em 3 disparos).
- **🔥 Egg-Rifle Automático (`10s`):** Substitui o *viewmodel* na mão do jogador por um fuzil pesado dourado com disparo contínuo (`0.10s` de cadência, `25 HP` por projétil).
- **🛡️ Escudo Energético Ciano (`10s`):** Ativa uma barreira ciano que absorve **100%** dos disparos de plasma dos ovos inimigos.
- **💚 Cápsula de Gema (`Instantâneo`):** Restaura `+40 HP` na integridade da casca do jogador (até `100 HP`).
- **Progressão Balanceada de Hordas:**
  - **Inimigos por Horda:** `4 + (horda - 1)` (máximo de `10` simultâneos).
  - **Velocidade:** `+6%` por horda (teto de `1.45x`).
  - **Dano dos Projéteis:** `15 + (horda - 1) * 3` (teto de `35 HP`).
  - **Pontuação:** `100 * horda` por ovo inimigo fragmentado, com salvamento automático de `HIGH SCORE` e `MAX WAVE` no `localStorage`.
