/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - UI CONTROLLER & DOM RENDERER
 * Handles all visual updates, timers, canvas visualizer, modals, and toasts
 * with strict XSS prevention and safe DOM manipulation.
 * ====================================================================
 */

import { State } from './state.js';
import { AudioEngine } from './audioEngine.js';
import { QueueController } from './queueController.js';
import { escapeHTML, sanitizeCoverUrl } from './urlParser.js';

export { escapeHTML };

/**
 * Format seconds to standard mm:ss or hh:mm:ss string
 * @param {number} sec
 * @returns {string}
 */
export function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec) || sec <= 0) return '00:00';
  const total = Math.floor(sec);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format remaining time with minus sign (-mm:ss)
 * @param {number} current
 * @param {number} duration
 * @returns {string}
 */
export function formatRemainingTime(current, duration) {
  if (isNaN(duration) || !isFinite(duration) || duration <= 0 || isNaN(current) || !isFinite(current)) return '-00:00';
  const remaining = Math.max(0, duration - current);
  return `-${formatTime(remaining)}`;
}

class UIController {
  constructor() {
    this.elements = {};
    this.draggedIndex = null;
    this.visualizerAnimationId = null;
    this.isReconnectBannerDismissed = false;
  }

  /**
   * Cache DOM elements and initialize visual loops
   */
  init() {
    this.cacheElements();
    this.initVisualizer();
    this.bindStateEvents();
    this.renderAll();
  }

  /**
   * Cache frequently accessed DOM nodes
   * @private
   */
  cacheElements() {
    // Header
    this.elements.searchInput = document.getElementById('search-input');
    this.elements.clearSearchBtn = document.getElementById('clear-search-btn');
    this.elements.statTotalTracks = document.getElementById('stat-total-tracks');
    this.elements.statTotalDuration = document.getElementById('stat-total-duration');
    this.elements.btnHelpGuide = document.getElementById('btn-help-guide');
    this.elements.gearMenuBtn = document.getElementById('gear-menu-btn');
    this.elements.gearDropdown = document.getElementById('gear-dropdown');
    this.elements.menuWelcomeGuide = document.getElementById('menu-welcome-guide');

    // Sidebar
    this.elements.navFilterBtns = document.querySelectorAll('.nav-filter-btn');
    this.elements.countAll = document.getElementById('count-all');
    this.elements.countDemo = document.getElementById('count-demo');
    this.elements.countLocal = document.getElementById('count-local');
    this.elements.countYoutube = document.getElementById('count-youtube');
    this.elements.countWeb = document.getElementById('count-web');
    this.elements.countFavorites = document.getElementById('count-favorites');

    // Stage / Hero Player
    this.elements.heroCover = document.getElementById('hero-cover');
    this.elements.vinylDisc = document.getElementById('vinyl-disc');
    this.elements.heroTitle = document.getElementById('hero-title');
    this.elements.heroArtist = document.getElementById('hero-artist');
    this.elements.heroAlbum = document.getElementById('hero-album');
    this.elements.heroBadge = document.getElementById('hero-source-badge');
    this.elements.heroPlayBtn = document.getElementById('hero-play-btn');
    this.elements.heroFavBtn = document.getElementById('hero-fav-btn');
    this.elements.visualizerCanvas = document.getElementById('visualizer-canvas');

    // Queue Panel
    this.elements.queueList = document.getElementById('queue-list');
    this.elements.queueCount = document.getElementById('queue-count-badge');
    this.elements.clearQueueBtn = document.getElementById('clear-queue-btn');

    // Bottom Player Bar
    this.elements.playerMiniCover = document.getElementById('player-mini-cover');
    this.elements.playerMiniTitle = document.getElementById('player-mini-title');
    this.elements.playerMiniArtist = document.getElementById('player-mini-artist');
    this.elements.playerMiniBadge = document.getElementById('player-mini-badge');
    this.elements.playerFavBtn = document.getElementById('player-fav-btn');
    this.elements.playerEqualizer = document.getElementById('player-equalizer');

    // Player Controls
    this.elements.btnPlayPause = document.getElementById('btn-play-pause');
    this.elements.btnPrev = document.getElementById('btn-prev');
    this.elements.btnNext = document.getElementById('btn-next');
    this.elements.btnShuffle = document.getElementById('btn-shuffle');
    this.elements.btnRepeat = document.getElementById('btn-repeat');

    // Seek Bar
    this.elements.seekSlider = document.getElementById('seek-slider');
    this.elements.seekFill = document.getElementById('seek-fill');
    this.elements.seekBuffer = document.getElementById('seek-buffer');
    this.elements.seekThumb = document.getElementById('seek-thumb');
    this.elements.timeElapsed = document.getElementById('time-elapsed');
    this.elements.timeRemaining = document.getElementById('time-remaining');

    // Volume Bar
    this.elements.volumeBtn = document.getElementById('volume-btn');
    this.elements.volumeSlider = document.getElementById('volume-slider');
    this.elements.volumeFill = document.getElementById('volume-fill');
    this.elements.volumeThumb = document.getElementById('volume-thumb');

    // Modals
    this.elements.batchModal = document.getElementById('modal-batch-import');
    this.elements.shortcutsModal = document.getElementById('modal-shortcuts');
    this.elements.welcomeModal = document.getElementById('welcome-modal');
    this.elements.closeWelcomeModalBtn = document.getElementById('close-welcome-modal-btn');
    this.elements.btnWelcomeStart = document.getElementById('btn-welcome-start');
    this.elements.welcomeDontShowCheckbox = document.getElementById('welcome-dont-show-checkbox');
    this.elements.toastContainer = document.getElementById('toast-container');

    // Playlist Import Modal Elements
    this.elements.tabBtnBatch = document.getElementById('tab-btn-batch');
    this.elements.tabBtnYtPlaylist = document.getElementById('tab-btn-yt-playlist');
    this.elements.tabPanelBatch = document.getElementById('tab-panel-batch');
    this.elements.tabPanelYtPlaylist = document.getElementById('tab-panel-yt-playlist');
    this.elements.ytPlaylistInput = document.getElementById('ytPlaylistUrlInput');
    this.elements.ytPlaylistLoading = document.getElementById('ytPlaylistLoading');
    this.elements.btnExtractYtPlaylist = document.getElementById('btn-extract-yt-playlist');
    this.elements.btnSubmitBatch = document.getElementById('submit-batch-btn');

    // Reconnect Local Tracks Banner
    this.elements.reconnectBanner = document.getElementById('reconnect-banner');
    this.elements.reconnectBannerMsg = document.getElementById('reconnect-banner-msg');
    this.elements.btnReconnectFolder = document.getElementById('btn-reconnect-folder');
    this.elements.btnDismissReconnect = document.getElementById('btn-dismiss-reconnect');
  }

  /**
   * Subscribe to State changes to trigger UI updates
   * @private
   */
  bindStateEvents() {
    State.on('trackChanged', ({ track }) => {
      this.updateTrackInfo(track);
      this.renderQueue();
    });

    State.on('playStateChanged', (isPlaying) => {
      this.updatePlayPauseIcons(isPlaying);
    });

    State.on('timeUpdate', ({ currentTime, duration, percent }) => {
      this.updateTimers(currentTime, duration, percent);
    });

    State.on('bufferProgress', (percent) => {
      this.updateBufferBar(percent);
    });

    State.on('volumeChanged', ({ volume, isMuted }) => {
      this.updateVolumeControls(volume, isMuted);
    });

    State.on('playbackModeChanged', ({ repeatMode, isShuffle }) => {
      this.updateModeButtons(repeatMode, isShuffle);
    });

    State.on('favoriteToggled', ({ trackId, isFavorite }) => {
      this.updateFavoriteButtons(trackId, isFavorite);
      this.renderQueue();
      this.updateStats();
    });

    State.on('filterChanged', () => {
      this.updateFilterButtons();
      this.renderQueue();
    });

    State.on('queueUpdated', () => {
      this.renderQueue();
      this.updateStats();
    });
  }

  /**
   * Perform a complete initial render
   */
  renderAll() {
    this.updateTrackInfo(State.currentTrack);
    this.updatePlayPauseIcons(State.isPlaying);
    this.updateVolumeControls(State.volume, State.isMuted);
    this.updateModeButtons(State.repeatMode, State.isShuffle);
    this.updateFilterButtons();
    this.renderQueue();
    this.updateStats();
  }

  /**
   * Update track metadata in Hero Stage and Bottom Player Bar
   * @param {import('./mockData.js').Track | null} track
   */
  updateTrackInfo(track) {
    if (!track) {
      const defaultTitle = 'Nenhuma faixa selecionada';
      const defaultArtist = 'Adicione músicas à fila';
      const defaultCover = './assets/demo-covers/cover1.svg';

      if (this.elements.heroTitle) this.elements.heroTitle.textContent = defaultTitle;
      if (this.elements.heroArtist) this.elements.heroArtist.textContent = defaultArtist;
      if (this.elements.heroAlbum) this.elements.heroAlbum.textContent = 'Aguardando seleção...';
      if (this.elements.heroCover) this.elements.heroCover.src = defaultCover;
      if (this.elements.heroBadge) this.elements.heroBadge.className = 'badge-source hidden';

      if (this.elements.playerMiniTitle) this.elements.playerMiniTitle.textContent = defaultTitle;
      if (this.elements.playerMiniArtist) this.elements.playerMiniArtist.textContent = defaultArtist;
      if (this.elements.playerMiniCover) this.elements.playerMiniCover.src = defaultCover;
      if (this.elements.playerMiniBadge) this.elements.playerMiniBadge.className = 'badge-source hidden';
      return;
    }

    const cover = sanitizeCoverUrl(track.coverBase64 || track.coverUrl || './assets/demo-covers/cover1.svg');

    // Hero stage
    if (this.elements.heroTitle) this.elements.heroTitle.textContent = track.title;
    if (this.elements.heroArtist) this.elements.heroArtist.textContent = track.artist;
    if (this.elements.heroAlbum) this.elements.heroAlbum.textContent = track.album || 'Universal Stream';
    if (this.elements.heroCover) this.elements.heroCover.src = cover;
    if (this.elements.heroBadge) {
      this.elements.heroBadge.className = `badge-source badge-${escapeHTML(track.sourceType)}`;
      this.elements.heroBadge.textContent = String(track.sourceType || '').toUpperCase();
    }
    if (this.elements.heroFavBtn) {
      this.elements.heroFavBtn.classList.toggle('active', Boolean(track.isFavorite));
    }

    // Player bar
    if (this.elements.playerMiniTitle) this.elements.playerMiniTitle.textContent = track.title;
    if (this.elements.playerMiniArtist) this.elements.playerMiniArtist.textContent = track.artist;
    if (this.elements.playerMiniCover) this.elements.playerMiniCover.src = cover;
    if (this.elements.playerMiniBadge) {
      this.elements.playerMiniBadge.className = `badge-source badge-${escapeHTML(track.sourceType)}`;
      this.elements.playerMiniBadge.textContent = String(track.sourceType || '').toUpperCase();
    }
    if (this.elements.playerFavBtn) {
      this.elements.playerFavBtn.classList.toggle('active', Boolean(track.isFavorite));
    }
  }

  /**
   * Update Play/Pause icon buttons and Vinyl spinning state
   * @param {boolean} isPlaying
   */
  updatePlayPauseIcons(isPlaying) {
    const playSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
    const pauseSvg = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;

    if (this.elements.btnPlayPause) {
      this.elements.btnPlayPause.innerHTML = isPlaying ? pauseSvg : playSvg;
    }
    if (this.elements.heroPlayBtn) {
      this.elements.heroPlayBtn.innerHTML = isPlaying ? pauseSvg : playSvg;
    }

    if (this.elements.vinylDisc) {
      this.elements.vinylDisc.classList.toggle('playing', isPlaying);
    }
    if (this.elements.playerEqualizer) {
      this.elements.playerEqualizer.classList.toggle('active', isPlaying);
    }
  }

  /**
   * Alias method for updatePlayPauseIcons
   * @param {boolean} isPlaying
   */
  updatePlayPauseState(isPlaying) {
    this.updatePlayPauseIcons(isPlaying);
  }

  /**
   * Update time labels and seek slider positions
   * @param {number} currentTime
   * @param {number} duration
   * @param {number} percent
   */
  updateTimers(currentTime, duration, percent) {
    if (this.elements.timeElapsed) {
      this.elements.timeElapsed.textContent = formatTime(currentTime);
    }
    if (this.elements.timeRemaining) {
      this.elements.timeRemaining.textContent = formatRemainingTime(currentTime, duration);
    }
    if (this.elements.seekFill) {
      this.elements.seekFill.style.width = `${percent}%`;
    }
    if (this.elements.seekThumb) {
      this.elements.seekThumb.style.left = `${percent}%`;
    }
    if (this.elements.seekSlider) {
      this.elements.seekSlider.value = percent;
    }
  }

  /**
   * Update buffering progress bar
   * @param {number} percent
   */
  updateBufferBar(percent) {
    if (this.elements.seekBuffer) {
      this.elements.seekBuffer.style.width = `${percent}%`;
    }
  }

  /**
   * Update Volume slider and volume icon
   * @param {number} volume
   * @param {boolean} isMuted
   */
  updateVolumeControls(volume, isMuted) {
    const effectiveVol = isMuted ? 0 : volume;

    if (this.elements.volumeFill) {
      this.elements.volumeFill.style.width = `${effectiveVol}%`;
    }
    if (this.elements.volumeThumb) {
      this.elements.volumeThumb.style.left = `${effectiveVol}%`;
    }
    if (this.elements.volumeSlider) {
      this.elements.volumeSlider.value = effectiveVol;
    }

    if (this.elements.volumeBtn) {
      let icon = '';
      if (effectiveVol === 0) {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
      } else if (effectiveVol < 40) {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      } else {
        icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      }
      this.elements.volumeBtn.innerHTML = icon;
    }
  }

  /**
   * Update Repeat and Shuffle active buttons
   * @param {string} repeatMode
   * @param {boolean} isShuffle
   */
  updateModeButtons(repeatMode, isShuffle) {
    if (this.elements.btnShuffle) {
      this.elements.btnShuffle.classList.toggle('active', isShuffle);
    }
    if (this.elements.btnRepeat) {
      this.elements.btnRepeat.classList.toggle('active', repeatMode !== 'off');
      if (repeatMode === 'one') {
        this.elements.btnRepeat.setAttribute('title', 'Repetir faixa atual (Ativo: 1)');
      } else if (repeatMode === 'all') {
        this.elements.btnRepeat.setAttribute('title', 'Repetir toda a fila (Ativo)');
      } else {
        this.elements.btnRepeat.setAttribute('title', 'Repetição desativada');
      }
    }
  }

  /**
   * Alias method for updateModeButtons
   * @param {string} repeatMode
   * @param {boolean} isShuffle
   */
  updatePlaybackModes(repeatMode, isShuffle) {
    this.updateModeButtons(repeatMode, isShuffle);
  }

  /**
   * Update active sidebar filter button
   */
  updateFilterButtons() {
    if (this.elements.navFilterBtns) {
      this.elements.navFilterBtns.forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        btn.classList.toggle('active', filter === State.filterSource);
      });
    }
  }

  /**
   * Update Favorite icons across UI for a specific track
   * @param {string} trackId
   * @param {boolean} isFavorite
   */
  updateFavoriteButtons(trackId, isFavorite) {
    if (State.currentTrack && State.currentTrack.id === trackId) {
      if (this.elements.heroFavBtn) this.elements.heroFavBtn.classList.toggle('active', isFavorite);
      if (this.elements.playerFavBtn) this.elements.playerFavBtn.classList.toggle('active', isFavorite);
    }
  }

  /**
   * Update sidebar counts and total duration stats
   */
  updateStats() {
    const queue = State.queue;
    const counts = {
      all: queue.length,
      demo: 0,
      local: 0,
      youtube: 0,
      web: 0,
      favorites: 0
    };

    let totalDuration = 0;

    queue.forEach(track => {
      if (counts[track.sourceType] !== undefined) {
        counts[track.sourceType]++;
      }
      if (State.favorites.has(track.id)) {
        counts.favorites++;
      }
      if (track.duration > 0) {
        totalDuration += track.duration;
      }
    });

    if (this.elements.countAll) this.elements.countAll.textContent = counts.all;
    if (this.elements.countDemo) this.elements.countDemo.textContent = counts.demo;
    if (this.elements.countLocal) this.elements.countLocal.textContent = counts.local;
    if (this.elements.countYoutube) this.elements.countYoutube.textContent = counts.youtube;
    if (this.elements.countWeb) this.elements.countWeb.textContent = counts.web;
    if (this.elements.countFavorites) this.elements.countFavorites.textContent = counts.favorites;

    if (this.elements.statTotalTracks) this.elements.statTotalTracks.textContent = counts.all;
    if (this.elements.statTotalDuration) this.elements.statTotalDuration.textContent = formatTime(totalDuration);
    if (this.elements.queueCount) this.elements.queueCount.textContent = counts.all;
  }

  /**
   * Render Queue list with HTML5 Drag & Drop event bindings and XSS sanitization
   */
  renderQueue() {
    if (!this.elements.queueList) return;

    // Check for disconnected local tracks to show/hide reconnect banner
    const disconnectedTracks = State.queue.filter(t => t.sourceType === 'local' && t.isDisconnected);
    if (this.elements.reconnectBanner) {
      if (disconnectedTracks.length > 0 && !this.isReconnectBannerDismissed) {
        this.elements.reconnectBanner.classList.remove('hidden');
        if (this.elements.reconnectBannerMsg) {
          this.elements.reconnectBannerMsg.textContent = `${disconnectedTracks.length} faixa(s) local(is) precisa(m) de reconexão com a pasta do seu computador.`;
        }
      } else {
        this.elements.reconnectBanner.classList.add('hidden');
      }
    }

    const filteredTracks = State.getFilteredQueue();

    if (filteredTracks.length === 0) {
      this.elements.queueList.innerHTML = `
        <div class="empty-queue-state">
          <div class="empty-queue-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p style="font-weight: 500;">Nenhuma faixa encontrada na fila</p>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Adicione arquivos locais, cole links com Ctrl+V ou importe uma playlist.</span>
        </div>
      `;
      return;
    }

    this.elements.queueList.innerHTML = '';

    filteredTracks.forEach((track) => {
      const realIndex = State.queue.findIndex(t => t.id === track.id);
      const isCurrent = State.currentIndex === realIndex;
      const isDisconnected = track.sourceType === 'local' && track.isDisconnected;
      const cover = sanitizeCoverUrl(track.coverBase64 || track.coverUrl || './assets/demo-covers/cover1.svg');

      const item = document.createElement('div');
      item.className = `queue-item ${isCurrent ? 'active-playing' : ''} ${isDisconnected ? 'queue-item-disconnected' : ''}`;
      item.setAttribute('draggable', 'true');
      item.setAttribute('data-id', escapeHTML(track.id));
      item.setAttribute('data-index', String(realIndex));

      const safeTitle = escapeHTML(track.title);
      const safeArtist = escapeHTML(track.artist);
      const safeSourceType = escapeHTML(track.sourceType);
      const safeDuration = track.duration > 0 ? formatTime(track.duration) : '--:--';
      const safeId = escapeHTML(track.id);

      const disconnectedBadgeHtml = isDisconnected
        ? `<span class="badge-disconnected" title="Arquivo local desconectado. Clique para selecionar a pasta e reconectar.">⚠️ Desconectada</span>`
        : '';

      item.innerHTML = `
        <div class="drag-handle" title="Arraste para reordenar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
            <circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/>
          </svg>
        </div>
        <div class="queue-item-cover-wrap">
          <img src="${cover}" alt="" class="queue-item-cover" loading="lazy" />
        </div>
        <div class="queue-item-info">
          <span class="queue-item-title truncate">${safeTitle}</span>
          <div class="queue-item-subtitle truncate">
            <span class="badge-source badge-${safeSourceType}">${safeSourceType.toUpperCase()}</span>
            ${disconnectedBadgeHtml}
            <span>${safeArtist}</span>
          </div>
        </div>
        <span class="queue-item-duration text-mono">${safeDuration}</span>
        <div class="queue-item-actions">
          <button class="btn-icon-sm queue-fav-btn ${track.isFavorite ? 'active' : ''}" title="Favoritar" data-action="fav" data-id="${safeId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${track.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button class="btn-icon-sm queue-delete-btn" title="Remover da fila" data-action="delete" data-id="${safeId}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;

      this.bindQueueItemDragEvents(item, realIndex);

      // Item click to play (or prompt reconnect if disconnected)
      item.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('button');
        if (actionBtn) {
          const action = actionBtn.getAttribute('data-action');
          const id = actionBtn.getAttribute('data-id');
          if (action === 'fav') {
            State.toggleFavorite(id);
          } else if (action === 'delete') {
            QueueController.removeTrack(id);
          }
          return;
        }

        QueueController.playTrackByIndex(realIndex);
      });

      this.elements.queueList.appendChild(item);
    });
  }

  /**
   * Bind HTML5 Drag and Drop events to a Queue Item
   * @param {HTMLElement} item
   * @param {number} index
   * @private
   */
  bindQueueItemDragEvents(item, index) {
    item.addEventListener('dragstart', (e) => {
      this.draggedIndex = index;
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    });

    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (this.draggedIndex === null || this.draggedIndex === index) return;

      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        item.classList.add('drop-target-above');
        item.classList.remove('drop-target-below');
      } else {
        item.classList.add('drop-target-below');
        item.classList.remove('drop-target-above');
      }
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drop-target-above', 'drop-target-below');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drop-target-above', 'drop-target-below');

      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        QueueController.moveTrack(this.draggedIndex, index);
        this.showToast({
          type: 'info',
          title: 'Fila Reordenada',
          message: 'Posição da faixa atualizada com sucesso.'
        });
      }
      this.draggedIndex = null;
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging', 'drop-target-above', 'drop-target-below');
      this.draggedIndex = null;
    });
  }

  /**
   * Frequency Spectrum Visualizer loop on HTML5 Canvas
   * @private
   */
  initVisualizer() {
    if (!this.elements.visualizerCanvas) return;

    const canvas = this.elements.visualizerCanvas;
    const ctx = canvas.getContext('2d');

    const renderLoop = () => {
      this.visualizerAnimationId = requestAnimationFrame(renderLoop);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const data = AudioEngine.getVisualizerData();
      const numBars = 28;
      const barWidth = Math.floor((canvas.width - (numBars - 1) * 2) / numBars);
      const step = Math.floor(data.length / numBars);

      // Gradient style
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#8b5cf6');
      gradient.addColorStop(0.5, '#06b6d4');
      gradient.addColorStop(1, '#a855f7');

      for (let i = 0; i < numBars; i++) {
        const val = data[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(3, percent * (canvas.height - 8));
        const x = i * (barWidth + 2) + 1;
        const y = canvas.height - barHeight;

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        ctx.fill();
      }
    };

    renderLoop();
  }

  /**
   * Display a floating Toast notification safely without XSS vulnerability
   * @param {{ type?: 'success'|'error'|'info'|'warning', title: string, message: string, duration?: number }} options
   */
  showToast({ type = 'info', title = '', message = '', duration = 3500 }) {
    if (!this.elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${escapeHTML(type)}`;

    let iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else if (type === 'warning') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <span class="toast-title"></span>
        <span class="toast-message"></span>
      </div>
      <div class="toast-progress"></div>
    `;

    // Safely assign title and message via textContent to prevent HTML execution
    const titleEl = toast.querySelector('.toast-title');
    const msgEl = toast.querySelector('.toast-message');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    this.elements.toastContainer.appendChild(toast);

    // Animate progress line
    const progress = toast.querySelector('.toast-progress');
    if (progress) {
      progress.style.transition = `transform ${duration}ms linear`;
      requestAnimationFrame(() => {
        progress.style.transform = 'scaleX(0)';
      });
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Open or close Modal window
   * @param {HTMLElement} modal
   * @param {boolean} isOpen
   */
  toggleModal(modal, isOpen) {
    if (!modal) return;
    modal.classList.toggle('hidden', !isOpen);
  }

  /**
   * Switch active tab in the Import Modal
   * @param {'tab-panel-batch' | 'tab-panel-yt-playlist'} activePanelId
   */
  switchImportModalTab(activePanelId) {
    const isBatch = activePanelId === 'tab-panel-batch';

    if (this.elements.tabBtnBatch) this.elements.tabBtnBatch.classList.toggle('active', isBatch);
    if (this.elements.tabBtnYtPlaylist) this.elements.tabBtnYtPlaylist.classList.toggle('active', !isBatch);

    if (this.elements.tabPanelBatch) this.elements.tabPanelBatch.classList.toggle('hidden', !isBatch);
    if (this.elements.tabPanelYtPlaylist) this.elements.tabPanelYtPlaylist.classList.toggle('hidden', isBatch);

    // Toggle footer action buttons
    if (this.elements.btnSubmitBatch) this.elements.btnSubmitBatch.classList.toggle('hidden', !isBatch);
    if (this.elements.btnExtractYtPlaylist) this.elements.btnExtractYtPlaylist.classList.toggle('hidden', isBatch);
  }

  /**
   * Set loading state for YouTube playlist extraction
   * @param {boolean} isLoading
   */
  setPlaylistExtractLoading(isLoading) {
    if (this.elements.ytPlaylistLoading) {
      this.elements.ytPlaylistLoading.classList.toggle('hidden', !isLoading);
    }
    if (this.elements.ytPlaylistInput) {
      this.elements.ytPlaylistInput.disabled = isLoading;
    }
    if (this.elements.btnExtractYtPlaylist) {
      this.elements.btnExtractYtPlaylist.disabled = isLoading;
      this.elements.btnExtractYtPlaylist.style.opacity = isLoading ? '0.7' : '1';
      this.elements.btnExtractYtPlaylist.style.cursor = isLoading ? 'wait' : 'pointer';
    }
    if (this.elements.tabBtnBatch) {
      this.elements.tabBtnBatch.disabled = isLoading;
    }
    if (this.elements.tabBtnYtPlaylist) {
      this.elements.tabBtnYtPlaylist.disabled = isLoading;
    }
  }
}

export const UI = new UIController();
