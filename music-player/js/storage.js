/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - STORAGE MANAGER
 * Manages localStorage caching for favorites, settings, and queue state
 * with strict sanitization and XSS mitigation.
 * ====================================================================
 */

import { sanitizeTextString, sanitizeAudioUrl, sanitizeCoverUrl } from './urlParser.js';

const STORAGE_KEYS = {
  FAVORITES: 'uplayer_v3_favorites',
  SETTINGS: 'uplayer_v3_settings',
  QUEUE: 'uplayer_v3_saved_queue',
  LAST_TRACK: 'uplayer_v3_last_track_id',
  WELCOME_GUIDE: 'hasSeenWelcomeGuide'
};

const ALLOWED_SOURCE_TYPES = ['demo', 'local', 'youtube', 'web'];
const STRICT_YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const Storage = {
  /**
   * Get list of favorite track IDs
   * @returns {string[]}
   */
  getFavorites() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(id => String(id).replace(/[^a-zA-Z0-9_-]/g, ''))
        .filter(id => id.length > 0);
    } catch (e) {
      console.warn('Storage: Error reading favorites', e);
      return [];
    }
  },

  /**
   * Save list of favorite track IDs
   * @param {string[]} favIds
   */
  saveFavorites(favIds) {
    try {
      if (!Array.isArray(favIds)) return;
      const cleanIds = favIds
        .map(id => String(id).replace(/[^a-zA-Z0-9_-]/g, ''))
        .filter(id => id.length > 0);
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(cleanIds));
    } catch (e) {
      console.warn('Storage: Error saving favorites', e);
    }
  },

  /**
   * Add or remove a track ID from favorites
   * @param {string} trackId
   * @returns {boolean} true if now favorite, false if removed
   */
  toggleFavorite(trackId) {
    const cleanId = String(trackId).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) return false;

    const favorites = new Set(this.getFavorites());
    let isFav = false;
    if (favorites.has(cleanId)) {
      favorites.delete(cleanId);
      isFav = false;
    } else {
      favorites.add(cleanId);
      isFav = true;
    }
    this.saveFavorites(Array.from(favorites));
    return isFav;
  },

  /**
   * Get player user settings (volume, muted, repeat, shuffle)
   * @returns {{ volume: number, isMuted: boolean, repeatMode: string, isShuffle: boolean }}
   */
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const defaults = {
        volume: 80,
        isMuted: false,
        repeatMode: 'off', // 'off' | 'all' | 'one'
        isShuffle: false
      };
      if (!data) return defaults;
      const parsed = JSON.parse(data);
      if (!parsed || typeof parsed !== 'object') return defaults;

      const rawVol = Number(parsed.volume);
      const volume = isNaN(rawVol) ? 80 : Math.max(0, Math.min(100, rawVol));
      const isMuted = Boolean(parsed.isMuted);
      const repeatMode = ['off', 'all', 'one'].includes(parsed.repeatMode) ? parsed.repeatMode : 'off';
      const isShuffle = Boolean(parsed.isShuffle);

      return { volume, isMuted, repeatMode, isShuffle };
    } catch (e) {
      console.warn('Storage: Error reading settings', e);
      return { volume: 80, isMuted: false, repeatMode: 'off', isShuffle: false };
    }
  },

  /**
   * Save player user settings
   * @param {Object} settings
   */
  saveSettings(settings) {
    try {
      const current = this.getSettings();
      const merged = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    } catch (e) {
      console.warn('Storage: Error saving settings', e);
    }
  },

  /**
   * Get last saved queue (sanitizing and filtering out expired local blob URLs and legacy tracks)
   * @returns {Array<Object> | null}
   */
  getSavedQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return null;

      const cleanQueue = [];
      parsed.forEach(track => {
        if (!track || typeof track !== 'object') return;
        if (track.sourceType === 'local') return;

        const title = sanitizeTextString(track.title, '');
        const src = (track.src || '').toLowerCase();
        if (title.toLowerCase().includes('cabana') || src.includes('cabana') || src.includes('d1f12s1rtcamoi') || title.toLowerCase().includes('deep focus ambient')) {
          return;
        }

        const sourceType = ALLOWED_SOURCE_TYPES.includes(track.sourceType) ? track.sourceType : 'web';
        const rawDur = Number(track.duration);
        const duration = isNaN(rawDur) || !isFinite(rawDur) || rawDur < 0 ? 0 : Math.min(rawDur, 86400);

        let youtubeId = '';
        if (sourceType === 'youtube' && track.youtubeId) {
          const cleanYtId = String(track.youtubeId).trim();
          youtubeId = STRICT_YT_ID_REGEX.test(cleanYtId) ? cleanYtId : '';
        }

        cleanQueue.push({
          id: String(track.id || `track-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, ''),
          sourceType,
          title,
          artist: sanitizeTextString(track.artist, 'Artista Desconhecido'),
          album: sanitizeTextString(track.album, ''),
          src: sanitizeAudioUrl(track.src, ''),
          youtubeId,
          coverUrl: sanitizeCoverUrl(track.coverUrl),
          coverBase64: track.coverBase64 ? sanitizeCoverUrl(track.coverBase64, '') : undefined,
          duration,
          isFavorite: Boolean(track.isFavorite)
        });
      });

      return cleanQueue.length > 0 ? cleanQueue : null;
    } catch (e) {
      console.warn('Storage: Error reading saved queue', e);
      return null;
    }
  },

  /**
   * Save queue to storage (sanitizes local blob references)
   * @param {Array<Object>} queue
   */
  saveQueue(queue) {
    try {
      if (!Array.isArray(queue)) return;
      const persistableQueue = queue.map(track => {
        if (track.sourceType === 'local') {
          return {
            ...track,
            src: '' // Blob URL is invalid across reloads
          };
        }
        return track;
      });
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(persistableQueue));
    } catch (e) {
      console.warn('Storage: Error saving queue', e);
    }
  },

  /**
   * Check if user has already seen the welcome onboarding guide
   * @returns {boolean}
   */
  hasSeenWelcomeGuide() {
    try {
      return localStorage.getItem(STORAGE_KEYS.WELCOME_GUIDE) === 'true';
    } catch (e) {
      console.warn('Storage: Error checking welcome guide status', e);
      return false;
    }
  },

  /**
   * Mark whether the user has seen or dismissed the welcome onboarding guide
   * @param {boolean} [seen=true]
   */
  setSeenWelcomeGuide(seen = true) {
    try {
      localStorage.setItem(STORAGE_KEYS.WELCOME_GUIDE, seen ? 'true' : 'false');
    } catch (e) {
      console.warn('Storage: Error saving welcome guide status', e);
    }
  },

  /**
   * Clear all stored application data
   */
  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEYS.FAVORITES);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.QUEUE);
      localStorage.removeItem(STORAGE_KEYS.LAST_TRACK);
      localStorage.removeItem(STORAGE_KEYS.WELCOME_GUIDE);
    } catch (e) {
      console.warn('Storage: Error clearing storage', e);
    }
  }
};
