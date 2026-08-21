/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - PLAYLIST MANAGER (JSON SCHEMA v3.0)
 * Serializes, validates, exports, and imports playlists in JSON format
 * with strict schema enforcement and XSS sanitization.
 * ====================================================================
 */

import { State } from './state.js';
import { defaultPlaylistMetadata } from './mockData.js';
import { sanitizeTextString, sanitizeAudioUrl, sanitizeCoverUrl } from './urlParser.js';

const ALLOWED_SOURCE_TYPES = ['demo', 'local', 'youtube', 'web'];
const STRICT_YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const PlaylistManager = {
  /**
   * Export current queue to a structured JSON v3.0 file and trigger download
   * @param {string} [customName]
   */
  exportToJson(customName) {
    const rawName = customName || defaultPlaylistMetadata.playlistName;
    const playlistName = sanitizeTextString(rawName, 'Playlist Universal');

    const exportData = {
      playlistName: playlistName,
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      tracks: State.queue.map(track => {
        const item = {
          id: sanitizeTextString(track.id, `track-${Date.now()}`),
          sourceType: ALLOWED_SOURCE_TYPES.includes(track.sourceType) ? track.sourceType : 'web',
          title: sanitizeTextString(track.title, 'Sem Título'),
          artist: sanitizeTextString(track.artist, 'Artista Desconhecido'),
          album: sanitizeTextString(track.album, ''),
          duration: typeof track.duration === 'number' && !isNaN(track.duration) ? Math.max(0, track.duration) : 0,
          isFavorite: Boolean(track.isFavorite)
        };

        if (track.sourceType === 'youtube') {
          const ytId = String(track.youtubeId || '').trim();
          item.youtubeId = STRICT_YT_ID_REGEX.test(ytId) ? ytId : '';
          item.coverUrl = sanitizeCoverUrl(track.coverUrl);
        } else if (track.sourceType === 'local') {
          item.fileName = sanitizeTextString(track.fileName || track.title);
          item.relativePath = sanitizeTextString(track.relativePath || track.fileName || '');
          if (track.coverBase64) {
            item.coverBase64 = sanitizeCoverUrl(track.coverBase64, '');
          }
        } else {
          item.src = sanitizeAudioUrl(track.src);
          item.coverUrl = sanitizeCoverUrl(track.coverUrl);
        }

        return item;
      })
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const safeFileName = playlistName.toLowerCase().replace(/[^a-z0-9_-]/g, '_').substring(0, 50) || 'playlist';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName}-v3.0.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Validate, sanitize and parse an imported JSON text or file
   * Strictly enforces data types and discards unauthorized fields
   * @param {string} jsonString
   * @returns {{ success: boolean, playlistName?: string, tracks?: Array<import('./mockData.js').Track>, error?: string, hasDisconnectedLocalTracks?: boolean }}
   */
  validateAndParse(jsonString) {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: 'Arquivo JSON inválido ou vazio.' };
      }

      const data = JSON.parse(jsonString);

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { success: false, error: 'Arquivo JSON inválido: raiz deve ser um objeto.' };
      }

      if (!Array.isArray(data.tracks)) {
        return { success: false, error: 'Estrutura de dados inválida: campo "tracks" não encontrado.' };
      }

      let hasDisconnectedLocalTracks = false;

      const validTracks = [];

      data.tracks.forEach((raw, index) => {
        if (!raw || typeof raw !== 'object') return;

        const sourceType = ALLOWED_SOURCE_TYPES.includes(raw.sourceType) ? raw.sourceType : 'web';
        const rawId = String(raw.id || `import-${Date.now()}-${index}`).replace(/[^a-zA-Z0-9_-]/g, '');
        const id = rawId || `import-${Date.now()}-${index}`;
        const title = sanitizeTextString(raw.title, `Faixa Importada ${index + 1}`);
        const artist = sanitizeTextString(raw.artist, 'Artista Desconhecido');
        const album = sanitizeTextString(raw.album, 'Importação JSON');

        const rawDur = Number(raw.duration);
        const duration = isNaN(rawDur) || !isFinite(rawDur) || rawDur < 0 ? 0 : Math.min(rawDur, 86400);
        const isFavorite = Boolean(raw.isFavorite);
        const isLocal = sourceType === 'local';
        const isDisconnected = isLocal; // Local tracks in exported JSON need folder reconnection

        if (isDisconnected) {
          hasDisconnectedLocalTracks = true;
        }

        let coverUrl = './assets/demo-covers/default-web.svg';
        let safeCoverBase64 = undefined;

        if (raw.coverBase64) {
          const safeDataUri = sanitizeCoverUrl(raw.coverBase64, '');
          if (safeDataUri.startsWith('data:image/')) {
            coverUrl = safeDataUri;
            safeCoverBase64 = safeDataUri;
          }
        } else if (raw.coverUrl) {
          coverUrl = sanitizeCoverUrl(raw.coverUrl);
        } else if (sourceType === 'youtube' && raw.youtubeId && STRICT_YT_ID_REGEX.test(raw.youtubeId)) {
          coverUrl = `https://img.youtube.com/vi/${raw.youtubeId}/hqdefault.jpg`;
        } else if (sourceType === 'local') {
          coverUrl = './assets/demo-covers/default-local.svg';
        }

        let youtubeId = '';
        if (sourceType === 'youtube' && raw.youtubeId) {
          const cleanYtId = String(raw.youtubeId).trim();
          youtubeId = STRICT_YT_ID_REGEX.test(cleanYtId) ? cleanYtId : '';
        }

        const safeSrc = isLocal ? '' : sanitizeAudioUrl(raw.src, '');

        validTracks.push({
          id,
          sourceType,
          title,
          artist,
          album,
          src: safeSrc,
          youtubeId: youtubeId,
          coverUrl: coverUrl,
          coverBase64: safeCoverBase64,
          duration,
          isFavorite,
          isDisconnected: isDisconnected,
          fileName: isLocal ? sanitizeTextString(raw.fileName || `${title}.mp3`) : undefined,
          relativePath: isLocal ? sanitizeTextString(raw.relativePath || raw.fileName || `${title}.mp3`) : undefined
        });
      });

      return {
        success: true,
        playlistName: sanitizeTextString(data.playlistName, 'Playlist Importada'),
        tracks: validTracks,
        hasDisconnectedLocalTracks
      };
    } catch (err) {
      return { success: false, error: `Erro na leitura do JSON: ${err.message}` };
    }
  },

  /**
   * Read file input and parse JSON
   * @param {File} file
   * @returns {Promise<{ success: boolean, playlistName?: string, tracks?: Array<import('./mockData.js').Track>, error?: string, hasDisconnectedLocalTracks?: boolean }>}
   */
  async importFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        resolve(this.validateAndParse(text));
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Falha ao ler o arquivo selecionado.' });
      };
      reader.readAsText(file);
    });
  }
};
