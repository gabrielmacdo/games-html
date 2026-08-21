/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - STATE STORE (REACTIVE PUB/SUB)
 * ====================================================================
 */

import { Storage } from './storage.js';

class StateStore {
  constructor() {
    const savedSettings = Storage.getSettings();
    const savedFavorites = new Set(Storage.getFavorites());

    /** @type {Array<import('./mockData.js').Track>} */
    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.isLoading = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = savedSettings.volume ?? 80;
    this.isMuted = savedSettings.isMuted ?? false;
    this.repeatMode = savedSettings.repeatMode ?? 'off'; // 'off' | 'all' | 'one'
    this.isShuffle = savedSettings.isShuffle ?? false;
    this.filterSource = 'all'; // 'all' | 'demo' | 'local' | 'youtube' | 'web' | 'favorites'
    this.searchQuery = '';
    this.favorites = savedFavorites;
    this.bufferPercent = 0;
    this.isVisualizerActive = true;

    /** @type {Object.<string, Function[]>} */
    this.listeners = {};
  }

  /**
   * Subscribe to state event
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from state event
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event
   * @param {any} [data]
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`State: Error in listener for event "${event}"`, err);
        }
      });
    }
  }

  /**
   * Get current playing track
   * @returns {import('./mockData.js').Track | null}
   */
  get currentTrack() {
    if (this.currentIndex >= 0 && this.currentIndex < this.queue.length) {
      return this.queue[this.currentIndex];
    }
    return null;
  }

  /**
   * Set queue tracks
   * @param {Array<import('./mockData.js').Track>} tracks
   * @param {number} [startIndex=0]
   */
  setQueue(tracks, startIndex = 0) {
    this.queue = [...tracks];
    // Sync favorite state
    this.queue.forEach(track => {
      track.isFavorite = this.favorites.has(track.id);
    });

    this.bufferPercent = 0;
    this.emit('bufferProgress', 0);

    if (this.queue.length > 0) {
      this.currentIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    } else {
      this.currentIndex = -1;
    }
    Storage.saveQueue(this.queue);
    this.emit('queueUpdated', this.queue);
    this.emit('trackChanged', { track: this.currentTrack, index: this.currentIndex });
  }

  /**
   * Set current active track by index
   * @param {number} index
   */
  setCurrentIndex(index) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      this.currentTime = 0;
      this.duration = this.queue[index].duration || 0;
      this.bufferPercent = 0;
      this.emit('bufferProgress', 0);
      this.emit('trackChanged', { track: this.currentTrack, index: this.currentIndex });
    }
  }

  /**
   * Update buffering progress percentage
   * @param {number} percent - 0 to 100
   */
  setBufferPercent(percent) {
    const clamped = Math.min(100, Math.max(0, percent || 0));
    if (Math.abs(this.bufferPercent - clamped) > 0.5 || clamped === 100 || clamped === 0) {
      this.bufferPercent = clamped;
      this.emit('bufferProgress', this.bufferPercent);
    }
  }

  /**
   * Set play/pause status
   * @param {boolean} playing
   */
  setIsPlaying(playing) {
    if (this.isPlaying !== playing) {
      this.isPlaying = playing;
      this.emit('playStateChanged', this.isPlaying);
    }
  }

  /**
   * Set loading status
   * @param {boolean} loading
   */
  setIsLoading(loading) {
    if (this.isLoading !== loading) {
      this.isLoading = loading;
      this.emit('loadingStateChanged', this.isLoading);
    }
  }

  /**
   * Update playback progress time
   * @param {number} currentTime
   * @param {number} duration
   */
  setTime(currentTime, duration) {
    this.currentTime = currentTime;
    if (duration > 0) {
      this.duration = duration;
      if (this.currentTrack && (!this.currentTrack.duration || this.currentTrack.duration === 0)) {
        this.currentTrack.duration = duration;
      }
    }
    const percent = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    this.emit('timeUpdate', {
      currentTime: this.currentTime,
      duration: this.duration,
      percent: Math.min(100, Math.max(0, percent))
    });
  }

  /**
   * Set volume and muted state
   * @param {number} volume - 0 to 100
   * @param {boolean} [isMuted]
   */
  setVolume(volume, isMuted) {
    this.volume = Math.max(0, Math.min(100, volume));
    if (typeof isMuted === 'boolean') {
      this.isMuted = isMuted;
    }
    Storage.saveSettings({ volume: this.volume, isMuted: this.isMuted });
    this.emit('volumeChanged', { volume: this.volume, isMuted: this.isMuted });
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    Storage.saveSettings({ isMuted: this.isMuted });
    this.emit('volumeChanged', { volume: this.volume, isMuted: this.isMuted });
  }

  /**
   * Cycle repeat mode: off -> all -> one -> off
   */
  cycleRepeatMode() {
    const modes = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    Storage.saveSettings({ repeatMode: this.repeatMode });
    this.emit('playbackModeChanged', { repeatMode: this.repeatMode, isShuffle: this.isShuffle });
  }

  /**
   * Toggle shuffle mode
   */
  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    Storage.saveSettings({ isShuffle: this.isShuffle });
    this.emit('playbackModeChanged', { repeatMode: this.repeatMode, isShuffle: this.isShuffle });
  }

  /**
   * Toggle track favorite state
   * @param {string} trackId
   */
  toggleFavorite(trackId) {
    const isFav = Storage.toggleFavorite(trackId);
    if (isFav) {
      this.favorites.add(trackId);
    } else {
      this.favorites.delete(trackId);
    }

    // Update track in memory
    const track = this.queue.find(t => t.id === trackId);
    if (track) {
      track.isFavorite = isFav;
    }
    this.emit('favoriteToggled', { trackId, isFavorite: isFav });
    this.emit('queueUpdated', this.queue);
  }

  /**
   * Set filter source category
   * @param {'all' | 'demo' | 'local' | 'youtube' | 'web' | 'favorites'} filter
   */
  setFilterSource(filter) {
    this.filterSource = filter;
    this.emit('filterChanged', { filterSource: this.filterSource, searchQuery: this.searchQuery });
  }

  /**
   * Set search query
   * @param {string} query
   */
  setSearchQuery(query) {
    this.searchQuery = query.trim().toLowerCase();
    this.emit('filterChanged', { filterSource: this.filterSource, searchQuery: this.searchQuery });
  }

  /**
   * Get filtered queue based on source filter and search text
   * @returns {Array<import('./mockData.js').Track>}
   */
  getFilteredQueue() {
    return this.queue.filter(track => {
      // Source / Favorite filter
      if (this.filterSource === 'favorites' && !this.favorites.has(track.id)) {
        return false;
      }
      if (this.filterSource !== 'all' && this.filterSource !== 'favorites' && track.sourceType !== this.filterSource) {
        return false;
      }

      // Search query filter
      if (this.searchQuery) {
        const title = (track.title || '').toLowerCase();
        const artist = (track.artist || '').toLowerCase();
        const album = (track.album || '').toLowerCase();
        return title.includes(this.searchQuery) || artist.includes(this.searchQuery) || album.includes(this.searchQuery);
      }

      return true;
    });
  }
}

export const State = new StateStore();
