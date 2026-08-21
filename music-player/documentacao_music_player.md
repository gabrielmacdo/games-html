# Documentação Técnica: Reprodutor Web Universal SPA (v3.1)

Aplicação Single Page Application (HTML5, CSS3, JavaScript ES6+ Vanilla) desenvolvida para execução 100% client-side no **GitHub Pages**, com suporte a fontes mistas de áudio e reconexão inteligente de arquivos locais.

---

### 1. Matriz de Suporte a Fontes de Mídia

| Tipo de Fonte | Input / Origem | Motor de Execução | Metadados & Capas |
| :--- | :--- | :--- | :--- |
| **1. Demo Tracks** | Carregamento automático via pasta `/assets/` | HTML5 `<audio>` nativo | Objetos fixos em `mockData.js` |
| **2. Pasta / Arquivos Locais** | Seleção via `webkitdirectory` | `URL.createObjectURL(file)` | Tags ID3 e Capa Base64 via `jsmediatags` |
| **3. YouTube & YT Music** | Links avulsos, lote e extração de playlists | YouTube IFrame Player API (oculto) | API pública `noembed.com` + Capas HQ oficiais |
| **4. URLs Web / Cloud / CDN** | Links diretos (`.mp3`, CloudFront, Google Drive) | HTML5 `<audio src="url">` | Parse de nome de arquivo e fallback de capa |

---

### 2. Especificação dos Módulos Principais

* **`audioEngine.js` (Adapter Singleton):** Gerencia a alternância contínua entre a tag `<audio>` e a instância `YT.Player`, controlando o ciclo de vida assíncrono (`isYouTubeReady`), barra de buffer dinâmico e timers decorrido/restante.
* **`queueController.js` (Fila Híbrida & Reconexão):** 
  * Orquestra reordenação via HTML5 Drag and Drop nativo.
  * Implementa `reconnectLocalTracks(files)`: cruza arquivos selecionados com faixas desconectadas existentes por `relativePath` e `fileName`, atualizando os Blobs sem duplicar cards.
* **`playlistExtractorService.js` (Scraper de Playlist):** Extrai playlists públicas do YouTube via serviço externo com proxy CORS resiliente (`api.allorigins.win`, `corsproxy.io` e `codetabs`).
* **`urlParser.js`:** Valida e converte URLs do YouTube, links diretos de CDN e formata links do Google Drive para stream direto.
* **`metadataParser.js`:** Lê tags ID3 locais via `jsmediatags` e converte capas embutidas em Base64 Data URI.
* **`playlistManager.js` & `storage.js`:** Serializa playlists no Schema JSON v3.0 e persiste favoritos, histórico e volume no `localStorage`.

---

### 3. Esquema de Dados JSON v3.0 (Universal)

```json
{
  "playlistName": "Minha Coletânea Universal 2026",
  "version": "3.0.0",
  "exportedAt": "2026-08-20T19:30:00.000Z",
  "tracks": [
    {
      "id": "demo-001",
      "sourceType": "demo",
      "title": "Summer Lo-Fi Beats",
      "artist": "Free Sounds Collective",
      "album": "NoCopyright Vol. 1",
      "src": "./assets/demo-audio/track1.mp3",
      "coverUrl": "./assets/demo-covers/cover1.jpg",
      "duration": 185.0,
      "isFavorite": true
    },
    {
      "id": "local-1724089200-1",
      "sourceType": "local",
      "fileName": "Midnight_Echoes.mp3",
      "relativePath": "Musicas/Synth/Midnight_Echoes.mp3",
      "title": "Midnight Echoes",
      "artist": "Kavinsky Style Project",
      "album": "Retro Wave",
      "duration": 218.4,
      "coverBase64": "data:image/jpeg;base64,/9j/4AAQ...",
      "isFavorite": false
    },
    {
      "id": "yt-dQw4w9WgXcQ",
      "sourceType": "youtube",
      "youtubeId": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "artist": "Rick Astley",
      "album": "YouTube Stream",
      "coverUrl": "[https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg](https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg)",
      "duration": 213.0,
      "isFavorite": true
    },
    {
      "id": "web-1724089300-2",
      "sourceType": "web",
      "title": "Audio Stream CDN",
      "artist": "Web Artist",
      "album": "Cloud CDN",
      "src": "[https://meu-servidor-cdn.com/audio.mp3](https://meu-servidor-cdn.com/audio.mp3)",
      "coverUrl": "./assets/demo-covers/default-web.jpg",
      "duration": 0,
      "isFavorite": false
    }
  ]
}
```
### 4. Estrutura Modular Consolidada

```
music-player/
├── index.html                  # Marcação semântica, iframes ocultos, modais e banners
├── css/
│   ├── variables.css           # Tema Dark Glassmorphism, tokens e tipografia
│   ├── base.css                # Reset, scrollbars customizadas e animações
│   ├── layout.css              # Grid principal: Sidebar, Central Stage, Queue e Player Bar
│   └── components.css          # Cards, badges (desconectada/fontes), modais e sliders
├── assets/
│   ├── demo-audio/             # Faixas de áudio royalty-free
│   └── demo-covers/            # Capas padrões e das faixas demo
└── js/
    ├── app.js                  # Ponto de entrada, orquestração e atalho Ctrl+V
    ├── state.js                # State Store central reativo (Queue, Favorites, Storage)
    ├── audioEngine.js          # Adapter de áudio unificado (HTML5 + YouTube IFrame)
    ├── playlistExtractorService.js # Extrator de playlists com proxy CORS resiliente
    ├── urlParser.js            # Parser inteligente de URLs (YouTube, Drive, CDNs)
    ├── metadataParser.js       # Leitor ID3 local e extrator de capas Base64
    ├── queueController.js      # Gerenciador da fila, Drag & Drop e reconexão sem duplicação
    ├── playlistManager.js      # Serialização e importação de JSON Schema v3.0
    ├── storage.js              # Cache local (favoritos, volume e histórico)
    ├── ui.js                   # Renderização do DOM, banners de status e feedback visual
    └── mockData.js             # Catálogo de faixas iniciais estáveis
```