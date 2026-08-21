/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - MAIN APP ENTRY POINT
 * Initializes modules, binds global listeners, keyboard shortcuts, and Ctrl+V
 * ====================================================================
 */

import { State } from './state.js';
import { Storage } from './storage.js';
import { AudioEngine } from './audioEngine.js';
import { QueueController } from './queueController.js';
import { UrlParser } from './urlParser.js';
import { MetadataParser } from './metadataParser.js';
import { PlaylistManager } from './playlistManager.js';
import { UI } from './ui.js';
import { initialTracks } from './mockData.js';
import { extractPlaylistViaTool } from './playlistExtractorService.js';

class App {
  constructor() {
    this.hiddenFolderInput = null;
    this.hiddenFilesInput = null;
    this.hiddenJsonInput = null;
  }

  /**
   * Boot the player application
   */
  async init() {
    console.log('🚀 Inicializando Reprodutor Web Universal SPA (v3.0)...');

    // Create hidden file inputs for local operations
    this.createHiddenInputs();

    // Restore saved queue or fallback to initial demo tracks
    const savedQueue = Storage.getSavedQueue();
    if (savedQueue && savedQueue.length > 0) {
      State.setQueue(savedQueue, 0);
    } else {
      State.setQueue(initialTracks, 0);
    }

    // Initialize UI Controller and Canvas
    UI.init();

    // Bind all interactive event listeners
    this.bindControlEvents();
    this.bindGearMenuEvents();
    this.bindBatchModalEvents();
    this.bindWelcomeModalEvents();
    this.bindGlobalShortcuts();
    this.bindWindowFileDrop();

    // Check if user has seen the onboarding guide on first access
    if (!Storage.hasSeenWelcomeGuide()) {
      UI.toggleModal(UI.elements.welcomeModal, true);
    }

    UI.showToast({
      type: 'info',
      title: 'Reprodutor SPA v3.0 Pronto',
      message: 'Arraste faixas para reordenar ou use Ctrl+V para colar links.'
    });
  }

  /**
   * Create hidden DOM input elements for file and folder browsing
   * @private
   */
  createHiddenInputs() {
    // Local folder input (webkitdirectory)
    this.hiddenFolderInput = document.createElement('input');
    this.hiddenFolderInput.type = 'file';
    this.hiddenFolderInput.webkitdirectory = true;
    this.hiddenFolderInput.multiple = true;
    this.hiddenFolderInput.style.display = 'none';
    this.hiddenFolderInput.id = 'hidden-folder-input';
    document.body.appendChild(this.hiddenFolderInput);

    this.hiddenFolderInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        UI.showToast({ type: 'info', title: 'Processando Pasta...', message: 'Lendo metadados e tags ID3 das faixas...' });
        const tracks = await MetadataParser.parseFileList(files);
        if (tracks.length > 0) {
          QueueController.addTracks(tracks, true);
          UI.showToast({
            type: 'success',
            title: 'Pasta Carregada',
            message: `${tracks.length} faixa(s) adicionada(s) à fila com sucesso.`
          });
        } else {
          UI.showToast({ type: 'error', title: 'Nenhum Áudio Encontrado', message: 'A pasta não contém arquivos de áudio válidos (.mp3, .wav, .ogg).' });
        }
      }
      this.hiddenFolderInput.value = '';
    });

    // Local files input (individual or multiple files)
    this.hiddenFilesInput = document.createElement('input');
    this.hiddenFilesInput.type = 'file';
    this.hiddenFilesInput.multiple = true;
    this.hiddenFilesInput.accept = 'audio/*,.mp3,.wav,.ogg,.m4a,.flac';
    this.hiddenFilesInput.style.display = 'none';
    this.hiddenFilesInput.id = 'hidden-files-input';
    document.body.appendChild(this.hiddenFilesInput);

    this.hiddenFilesInput.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        UI.showToast({ type: 'info', title: 'Processando Arquivos...', message: 'Extraindo dados e capas ID3...' });
        const tracks = await MetadataParser.parseFileList(files);
        if (tracks.length > 0) {
          QueueController.addTracks(tracks, true);
          UI.showToast({
            type: 'success',
            title: 'Mídias Adicionadas',
            message: `${tracks.length} faixa(s) adicionada(s) à fila.`
          });
        }
      }
      this.hiddenFilesInput.value = '';
    });

    // JSON Playlist import input
    this.hiddenJsonInput = document.createElement('input');
    this.hiddenJsonInput.type = 'file';
    this.hiddenJsonInput.accept = '.json,application/json';
    this.hiddenJsonInput.style.display = 'none';
    this.hiddenJsonInput.id = 'hidden-json-input';
    document.body.appendChild(this.hiddenJsonInput);

    this.hiddenJsonInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const result = await PlaylistManager.importFromFile(file);
        if (result.success && result.tracks && result.tracks.length > 0) {
          QueueController.addTracks(result.tracks, true);

          const disconnectedCount = result.tracks.filter(t => t.sourceType === 'local' && t.isDisconnected).length;
          if (disconnectedCount > 0) {
            UI.isReconnectBannerDismissed = false;
            UI.showToast({
              type: 'warning',
              title: 'Faixas Locais Detectadas',
              message: `Esta lista contém ${disconnectedCount} faixa(s) local(is) do seu computador. Use o banner ou botão para selecionar a pasta e conectar.`,
              duration: 7000
            });
          } else {
            UI.showToast({
              type: 'success',
              title: 'Playlist Importada (v3.0)',
              message: `"${result.playlistName}" carregada com ${result.tracks.length} faixa(s).`
            });
          }
        } else {
          UI.showToast({
            type: 'error',
            title: 'Erro na Importação',
            message: result.error || 'Não foi possível ler a playlist.'
          });
        }
      }
      this.hiddenJsonInput.value = '';
    });

    // Reconnection folder input (webkitdirectory for smart reconnection without duplicates)
    this.hiddenReconnectFolderInput = document.createElement('input');
    this.hiddenReconnectFolderInput.type = 'file';
    this.hiddenReconnectFolderInput.webkitdirectory = true;
    this.hiddenReconnectFolderInput.multiple = true;
    this.hiddenReconnectFolderInput.style.display = 'none';
    this.hiddenReconnectFolderInput.id = 'hidden-reconnect-folder-input';
    document.body.appendChild(this.hiddenReconnectFolderInput);

    this.hiddenReconnectFolderInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        UI.showToast({
          type: 'info',
          title: 'Reconectando Faixas Locais...',
          message: 'Cruzando nomes e caminhos com os arquivos da pasta selecionada...'
        });

        const result = QueueController.reconnectLocalTracks(files);
        if (result.reconnectedCount > 0) {
          UI.showToast({
            type: 'success',
            title: 'Reconexão Concluída!',
            message: `${result.reconnectedCount} de ${result.totalDisconnected} faixas locais foram reconectadas e estão prontas para tocar!`,
            duration: 6000
          });
        } else {
          UI.showToast({
            type: 'warning',
            title: 'Nenhuma Correspondência',
            message: 'Nenhum arquivo na pasta selecionada coincidiu com as faixas desconectadas.',
            duration: 5000
          });
        }
      }
      this.hiddenReconnectFolderInput.value = '';
    });
  }

  /**
   * Bind primary playback and controls
   * @private
   */
  bindControlEvents() {
    // Play/Pause
    const playPauseAction = () => AudioEngine.togglePlay();
    if (UI.elements.btnPlayPause) UI.elements.btnPlayPause.addEventListener('click', playPauseAction);
    if (UI.elements.heroPlayBtn) UI.elements.heroPlayBtn.addEventListener('click', playPauseAction);

    // Next / Prev
    if (UI.elements.btnNext) UI.elements.btnNext.addEventListener('click', () => QueueController.next(true));
    if (UI.elements.btnPrev) UI.elements.btnPrev.addEventListener('click', () => QueueController.prev());

    // Shuffle & Repeat
    if (UI.elements.btnShuffle) UI.elements.btnShuffle.addEventListener('click', () => State.toggleShuffle());
    if (UI.elements.btnRepeat) UI.elements.btnRepeat.addEventListener('click', () => State.cycleRepeatMode());

    // Seek bar
    if (UI.elements.seekSlider) {
      UI.elements.seekSlider.addEventListener('input', (e) => {
        const percent = parseFloat(e.target.value);
        if (UI.elements.seekFill) UI.elements.seekFill.style.width = `${percent}%`;
        if (UI.elements.seekThumb) UI.elements.seekThumb.style.left = `${percent}%`;
      });

      UI.elements.seekSlider.addEventListener('change', (e) => {
        const percent = parseFloat(e.target.value);
        AudioEngine.seek(percent, true);
      });
    }

    // Volume controls
    if (UI.elements.volumeSlider) {
      UI.elements.volumeSlider.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value, 10);
        State.setVolume(vol, false);
        AudioEngine.setVolume(vol);
      });
    }

    if (UI.elements.volumeBtn) {
      UI.elements.volumeBtn.addEventListener('click', () => {
        State.toggleMute();
        AudioEngine.setMute(State.isMuted);
      });
    }

    // Favorite button on Hero & Player
    const toggleCurrentFavorite = () => {
      if (State.currentTrack) {
        State.toggleFavorite(State.currentTrack.id);
        const isFav = State.currentTrack.isFavorite;
        UI.showToast({
          type: isFav ? 'success' : 'info',
          title: isFav ? 'Favoritado' : 'Removido dos Favoritos',
          message: `"${State.currentTrack.title}"`
        });
      }
    };
    if (UI.elements.heroFavBtn) UI.elements.heroFavBtn.addEventListener('click', toggleCurrentFavorite);
    if (UI.elements.playerFavBtn) UI.elements.playerFavBtn.addEventListener('click', toggleCurrentFavorite);

    // Search bar
    if (UI.elements.searchInput) {
      UI.elements.searchInput.addEventListener('input', (e) => {
        State.setSearchQuery(e.target.value);
        if (UI.elements.clearSearchBtn) {
          UI.elements.clearSearchBtn.classList.toggle('hidden', !e.target.value);
        }
      });
    }

    if (UI.elements.clearSearchBtn) {
      UI.elements.clearSearchBtn.addEventListener('click', () => {
        if (UI.elements.searchInput) {
          UI.elements.searchInput.value = '';
          State.setSearchQuery('');
          UI.elements.clearSearchBtn.classList.add('hidden');
        }
      });
    }

    // Sidebar Category Filter Buttons
    if (UI.elements.navFilterBtns) {
      UI.elements.navFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.getAttribute('data-filter');
          if (filter) {
            State.setFilterSource(filter);
          }
        });
      });
    }

    // Quick Add Button on Sidebar
    const quickAddFolderBtn = document.getElementById('sidebar-add-folder-btn');
    if (quickAddFolderBtn) {
      quickAddFolderBtn.addEventListener('click', () => this.hiddenFolderInput.click());
    }

    const quickAddFilesBtn = document.getElementById('sidebar-add-files-btn');
    if (quickAddFilesBtn) {
      quickAddFilesBtn.addEventListener('click', () => this.hiddenFilesInput.click());
    }

    // Clear Queue Button
    if (UI.elements.clearQueueBtn) {
      UI.elements.clearQueueBtn.addEventListener('click', () => {
        if (confirm('Deseja realmente limpar toda a fila de reprodução?')) {
          QueueController.clearQueue();
          UI.showToast({ type: 'info', title: 'Fila Limpa', message: 'Todas as faixas foram removidas.' });
        }
      });
    }

    // Reconnect Local Tracks Banner Actions
    if (UI.elements.btnReconnectFolder) {
      UI.elements.btnReconnectFolder.addEventListener('click', () => {
        this.hiddenReconnectFolderInput.click();
      });
    }

    if (UI.elements.btnDismissReconnect) {
      UI.elements.btnDismissReconnect.addEventListener('click', () => {
        UI.isReconnectBannerDismissed = true;
        if (UI.elements.reconnectBanner) {
          UI.elements.reconnectBanner.classList.add('hidden');
        }
      });
    }

    // Handle Attempt to Play Disconnected Local Track
    State.on('disconnectedTrackPlayAttempt', ({ track }) => {
      UI.showToast({
        type: 'warning',
        title: 'Faixa Local Desconectada',
        message: `"${track.title}" precisa ser reconectada. Selecione a pasta onde o arquivo está salvo.`,
        duration: 6000
      });
      this.hiddenReconnectFolderInput.click();
    });
  }

  /**
   * Bind Gear Dropdown menu events
   * @private
   */
  bindGearMenuEvents() {
    if (!UI.elements.gearMenuBtn || !UI.elements.gearDropdown) return;

    UI.elements.gearMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      UI.elements.gearDropdown.classList.toggle('hidden');
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!UI.elements.gearDropdown.contains(e.target) && e.target !== UI.elements.gearMenuBtn) {
        UI.elements.gearDropdown.classList.add('hidden');
      }
    });

    // Gear actions
    const btnLoadFolder = document.getElementById('menu-load-folder');
    if (btnLoadFolder) {
      btnLoadFolder.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        this.hiddenFolderInput.click();
      });
    }

    const btnBatchUrls = document.getElementById('menu-batch-urls');
    if (btnBatchUrls) {
      btnBatchUrls.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        UI.toggleModal(UI.elements.batchModal, true);
      });
    }

    const btnExportJson = document.getElementById('menu-export-json');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        if (State.queue.length === 0) {
          UI.showToast({ type: 'error', title: 'Fila Vazia', message: 'Adicione faixas antes de exportar a playlist.' });
          return;
        }
        PlaylistManager.exportToJson();
        UI.showToast({ type: 'success', title: 'Exportado com Sucesso', message: 'Arquivo JSON v3.0 gerado para download.' });
      });
    }

    const btnImportJson = document.getElementById('menu-import-json');
    if (btnImportJson) {
      btnImportJson.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        this.hiddenJsonInput.click();
      });
    }

    const btnRestoreDefaults = document.getElementById('menu-restore-defaults');
    if (btnRestoreDefaults) {
      btnRestoreDefaults.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        QueueController.restoreDefaults();
        UI.showToast({ type: 'success', title: 'Faixas Restauradas', message: 'Coletânea padrão carregada na fila.' });
      });
    }

    const btnClearQueue = document.getElementById('menu-clear-queue');
    if (btnClearQueue) {
      btnClearQueue.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        QueueController.clearQueue();
        UI.showToast({ type: 'info', title: 'Fila Limpa', message: 'Fila esvaziada com sucesso.' });
      });
    }

    const btnShortcuts = document.getElementById('menu-shortcuts');
    if (btnShortcuts) {
      btnShortcuts.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        UI.toggleModal(UI.elements.shortcutsModal, true);
      });
    }

    const btnWelcomeGuide = document.getElementById('menu-welcome-guide');
    if (btnWelcomeGuide) {
      btnWelcomeGuide.addEventListener('click', () => {
        UI.elements.gearDropdown.classList.add('hidden');
        UI.toggleModal(UI.elements.welcomeModal, true);
      });
    }
  }

  /**
   * Bind Batch Multi-Link & YouTube Playlist Modal events
   * @private
   */
  bindBatchModalEvents() {
    const modal = UI.elements.batchModal;
    if (!modal) return;

    const textarea = document.getElementById('batch-urls-textarea');
    const closeBtn = document.getElementById('close-batch-modal-btn');
    const cancelBtn = document.getElementById('cancel-batch-btn');
    const submitBtn = document.getElementById('submit-batch-btn');
    const extractYtBtn = UI.elements.btnExtractYtPlaylist;
    const ytInput = UI.elements.ytPlaylistInput;

    const closeModal = () => {
      UI.toggleModal(modal, false);
      if (textarea) textarea.value = '';
      if (ytInput) ytInput.value = '';
      UI.setPlaylistExtractLoading(false);
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    // Modal Tab Navigation
    if (UI.elements.tabBtnBatch) {
      UI.elements.tabBtnBatch.addEventListener('click', () => {
        UI.switchImportModalTab('tab-panel-batch');
      });
    }

    if (UI.elements.tabBtnYtPlaylist) {
      UI.elements.tabBtnYtPlaylist.addEventListener('click', () => {
        UI.switchImportModalTab('tab-panel-yt-playlist');
        if (ytInput) setTimeout(() => ytInput.focus(), 50);
      });
    }

    // Process Batch URLs
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const text = textarea ? textarea.value : '';
        if (!text.trim()) {
          UI.showToast({ type: 'error', title: 'Campo Vazio', message: 'Cole ao menos uma URL válida.' });
          return;
        }

        UI.showToast({ type: 'info', title: 'Processando Links...', message: 'Consultando metadados de mídia...' });
        closeModal();

        const tracks = await UrlParser.parseBatchUrls(text);
        if (tracks.length > 0) {
          QueueController.addTracks(tracks, true);
          UI.showToast({
            type: 'success',
            title: 'Mídias Adicionadas',
            message: `${tracks.length} faixa(s) adicionada(s) à fila com sucesso.`
          });
        } else {
          UI.showToast({
            type: 'error',
            title: 'URLs Inválidas',
            message: 'Nenhum link de YouTube ou áudio válido foi identificado.'
          });
        }
      });
    }

    // Extract YouTube Playlist Handler
    const handleExtractPlaylist = async () => {
      const playlistUrl = ytInput ? ytInput.value.trim() : '';
      if (!playlistUrl) {
        UI.showToast({
          type: 'error',
          title: 'Campo Vazio',
          message: 'Por favor, informe o link ou ID da playlist do YouTube.'
        });
        if (ytInput) ytInput.focus();
        return;
      }

      UI.setPlaylistExtractLoading(true);

      try {
        const result = await extractPlaylistViaTool(playlistUrl);
        if (result && result.tracks && result.tracks.length > 0) {
          QueueController.addTracks(result.tracks, true);
          closeModal();
          UI.showToast({
            type: 'success',
            title: 'Playlist Importada!',
            message: `${result.tracks.length} faixas importadas da playlist com sucesso!`
          });
        } else {
          throw new Error('Nenhuma faixa pôde ser extraída da playlist informada.');
        }
      } catch (err) {
        console.error('App: Erro ao extrair playlist YouTube:', err);
        UI.showToast({
          type: 'error',
          title: 'Erro na Extração',
          message: err.message || 'Falha ao extrair as faixas da playlist.'
        });
      } finally {
        UI.setPlaylistExtractLoading(false);
      }
    };

    if (extractYtBtn) {
      extractYtBtn.addEventListener('click', handleExtractPlaylist);
    }

    if (ytInput) {
      ytInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleExtractPlaylist();
        }
      });
    }

    // Close Shortcuts Modal
    const shortcutsModal = UI.elements.shortcutsModal;
    const closeShortcutsBtn = document.getElementById('close-shortcuts-modal-btn');
    if (closeShortcutsBtn && shortcutsModal) {
      closeShortcutsBtn.addEventListener('click', () => UI.toggleModal(shortcutsModal, false));
    }
  }

  /**
   * Bind Welcome & Onboarding Guide Modal events
   * @private
   */
  bindWelcomeModalEvents() {
    const modal = UI.elements.welcomeModal;
    if (!modal) return;

    const btnHelp = UI.elements.btnHelpGuide;
    const btnClose = UI.elements.closeWelcomeModalBtn;
    const btnStart = UI.elements.btnWelcomeStart;
    const checkbox = UI.elements.welcomeDontShowCheckbox;

    const closeModal = () => {
      if (checkbox && checkbox.checked) {
        Storage.setSeenWelcomeGuide(true);
      }
      UI.toggleModal(modal, false);
    };

    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        UI.toggleModal(modal, true);
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', closeModal);
    }

    if (btnStart) {
      btnStart.addEventListener('click', closeModal);
    }

    // Close when clicking on the overlay background outside the modal window
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  /**
   * Bind Global Shortcuts & Ctrl+V Paste anywhere handler
   * @private
   */
  bindGlobalShortcuts() {
    // Global Paste (Ctrl+V / Cmd+V)
    window.addEventListener('paste', async (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'textarea' || activeTag === 'input') {
        // If user is currently typing in an input/textarea, allow normal paste
        return;
      }

      const pastedText = (e.clipboardData || window.clipboardData)?.getData('text');
      if (!pastedText) return;

      const trimmed = pastedText.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        e.preventDefault();
        UI.showToast({
          type: 'info',
          title: 'Link Detectado (Ctrl + V)',
          message: 'Extraindo informações da mídia...'
        });

        const tracks = await UrlParser.parseBatchUrls(trimmed);
        if (tracks.length > 0) {
          QueueController.addTracks(tracks, true);
          UI.showToast({
            type: 'success',
            title: 'Mídia Inserida na Fila!',
            message: `"${tracks[0].title}" adicionada e iniciada.`
          });
        } else {
          UI.showToast({
            type: 'error',
            title: 'Link Não Suportado',
            message: 'O link colado não é um áudio direto ou vídeo do YouTube válido.'
          });
        }
      }
    });

    // Global Keydown Shortcuts
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') {
        if (e.code === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          AudioEngine.togglePlay();
          break;

        case 'ArrowRight':
          e.preventDefault();
          AudioEngine.seek(Math.min(State.duration, State.currentTime + 5));
          break;

        case 'ArrowLeft':
          e.preventDefault();
          AudioEngine.seek(Math.max(0, State.currentTime - 5));
          break;

        case 'ArrowUp':
          e.preventDefault();
          State.setVolume(Math.min(100, State.volume + 5));
          AudioEngine.setVolume(State.volume);
          break;

        case 'ArrowDown':
          e.preventDefault();
          State.setVolume(Math.max(0, State.volume - 5));
          AudioEngine.setVolume(State.volume);
          break;

        case 'KeyN':
          e.preventDefault();
          QueueController.next(true);
          break;

        case 'KeyP':
          e.preventDefault();
          QueueController.prev();
          break;

        case 'KeyM':
          e.preventDefault();
          State.toggleMute();
          AudioEngine.setMute(State.isMuted);
          break;

        case 'KeyF':
          e.preventDefault();
          if (State.currentTrack) {
            State.toggleFavorite(State.currentTrack.id);
          }
          break;

        case 'KeyS':
          e.preventDefault();
          State.toggleShuffle();
          break;

        case 'KeyR':
          e.preventDefault();
          State.cycleRepeatMode();
          break;

        case 'Escape':
          UI.toggleModal(UI.elements.batchModal, false);
          UI.toggleModal(UI.elements.shortcutsModal, false);
          if (UI.elements.welcomeModal && !UI.elements.welcomeModal.classList.contains('hidden')) {
            if (UI.elements.welcomeDontShowCheckbox && UI.elements.welcomeDontShowCheckbox.checked) {
              Storage.setSeenWelcomeGuide(true);
            }
            UI.toggleModal(UI.elements.welcomeModal, false);
          }
          if (UI.elements.gearDropdown) UI.elements.gearDropdown.classList.add('hidden');
          break;
      }
    });
  }

  /**
   * Drag and drop files from desktop directly onto application window
   * @private
   */
  bindWindowFileDrop() {
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        UI.showToast({ type: 'info', title: 'Arquivos Soltos', message: 'Lendo faixas arrastadas...' });
        const tracks = await MetadataParser.parseFileList(files);
        if (tracks.length > 0) {
          QueueController.addTracks(tracks, true);
          UI.showToast({
            type: 'success',
            title: 'Mídias Carregadas',
            message: `${tracks.length} faixa(s) inserida(s) na fila.`
          });
        }
      }
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
