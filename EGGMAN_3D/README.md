# Egg-Man 3D 🥚✨

Jogo arcade 3D em terceira pessoa desenvolvido com **Three.js (WebGL)**, geometrias 100% procedurais (`THREE.LatheGeometry`, `THREE.InstancedMesh` e `THREE.CanvasTexture`) e sintetizador de áudio retro via **Web Audio API** nativa.

Projetado para rodar como site estático puro no **GitHub Pages**, sem etapa de *build*, sem *bundlers* e sem dependências externas locais.

---

## 🎮 Como Jogar

* **Objetivo:** Percorra os corredores do labirinto para coletar todas as bolinhas de energia (`+10 pts`).
* **Moedas de Ovo Douradas (`+50 pts`):** Localizadas nos 4 cantos estratégicos do mapa. Ao coletá-las, o Egg-Man entra no modo **Superpoder** por `8 segundos`, deixando os 4 ovos inimigos vulneráveis (azuis e trincados) para você quebrar a casca deles em combos de `200`, `400`, `800` e `1600` pontos!
* **Controles:**
  * **Desktop:** `W, A, S, D` ou `Setas Direcionais`.
  * **Mobile / Touch:** Deslize o dedo na tela (**Swipe** para cima, baixo, esquerda ou direita).
  * **Configurações e Customização (`⚙️` ou `Esc`):** Alterne entre o modo de controle **Segurar Tecla (`HOLD`)** e **Contínuo (`CONTINUOUS`)**, ligue/silencie o som e personalize a casca do Egg-Man (*Ovo Dourado*, *Branco Clássico*, *Ovo Caipira*, *Casca de Codorna* ou *Verde Menta*).

---

## 🚀 Como Executar Localmente

Como o projeto utiliza **ES6 Modules** nativos (`<script type="module">`), basta servir a pasta raiz por qualquer servidor HTTP estático:

```bash
# Opção 1: Python 3
python -m http.server 8000

# Opção 2: Node.js (npx)
npx serve .
```

Em seguida, acesse `http://localhost:8000` no navegador (ou utilize a extensão **Live Server** do VS Code).

---

## 🌐 Como Publicar no GitHub Pages

Todos os caminhos de arquivos (`./css/style.css`, `./js/main.js`, etc.) estão configurados de forma estritamente relativa para funcionar tanto em domínio raiz quanto em subdiretórios (`https://seu-usuario.github.io/eggman-3d/`):

1. Suba os arquivos deste repositório para o GitHub.
2. No repositório do GitHub, acesse **Settings > Pages**.
3. Em **Build and deployment > Source**, selecione **Deploy from a branch**.
4. Escolha a branch `main` (ou `master`) e a pasta `/ (root)`, e clique em **Save**.
