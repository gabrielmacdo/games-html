/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - QUEUE CONTROLLER
 * Manages hybrid queue operations, navigation, and Drag & Drop reordering
 * ====================================================================
 */

import { State } from './state.js';
import { AudioEngine } from './audioEngine.js';
import { initialTracks } from './mockData.js';

class QueueControllerManager {
  constructor() {
    this.historyStack = [];
    this.initEventListeners();
  }

  /**
   * Listen to audio engine end events
   * @private
   */
  initEventListeners() {
    State.on('trackEnded', () => {
      this.next(false);
    });
  }

  /**
   * Add a single track to the queue
   * @param {import('./mockData.js').Track} track
   * @param {boolean} [playNow=false]
   */
  addTrack(track, playNow = false) {
    if (!track) return;
    const newQueue = [...State.queue, track];
    const newIndex = playNow ? newQueue.length - 1 : (State.currentIndex === -1 ? 0 : State.currentIndex);
    State.setQueue(newQueue, newIndex);

    if (playNow) {
      AudioEngine.loadTrack(track, true);
    }
  }

  /**
   * Add multiple tracks to the queue in batch
   * @param {Array<import('./mockData.js').Track>} tracks
   * @param {boolean} [playFirst=false]
   */
  addTracks(tracks, playFirst = false) {
    if (!tracks || tracks.length === 0) return;
    const hadNoTracks = State.queue.length === 0;
    const newQueue = [...State.queue, ...tracks];
    const newIndex = (playFirst || hadNoTracks) ? (State.currentIndex === -1 ? 0 : State.queue.length) : State.currentIndex;

    State.setQueue(newQueue, newIndex);

    if (playFirst || (hadNoTracks && State.currentTrack)) {
      AudioEngine.loadTrack(State.currentTrack, true);
    }
  }

  /**
   * Remove a track by ID
   * @param {string} trackId
   */
  removeTrack(trackId) {
    const removeIdx = State.queue.findIndex(t => t.id === trackId);
    if (removeIdx === -1) return;

    const isCurrent = removeIdx === State.currentIndex;
    const newQueue = State.queue.filter(t => t.id !== trackId);

    if (newQueue.length === 0) {
      AudioEngine.pause();
      State.setQueue([], -1);
      return;
    }

    let nextIndex = State.currentIndex;
    if (isCurrent) {
      nextIndex = removeIdx >= newQueue.length ? 0 : removeIdx;
      State.setQueue(newQueue, nextIndex);
      AudioEngine.loadTrack(newQueue[nextIndex], State.isPlaying);
    } else if (removeIdx < State.currentIndex) {
      nextIndex = State.currentIndex - 1;
      State.setQueue(newQueue, nextIndex);
    } else {
      State.setQueue(newQueue, State.currentIndex);
    }
  }

  /**
   * Move track position inside queue (for HTML5 Drag & Drop reordering)
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  moveTrack(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= State.queue.length || toIndex < 0 || toIndex >= State.queue.length || fromIndex === toIndex) {
      return;
    }

    const currentTrackId = State.currentTrack ? State.currentTrack.id : null;
    const newQueue = [...State.queue];
    const [movedTrack] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, movedTrack);

    // Maintain current playing track selection
    const newCurrentIndex = currentTrackId ? newQueue.findIndex(t => t.id === currentTrackId) : 0;
    State.setQueue(newQueue, newCurrentIndex);
  }

  /**
   * Play specific track by index
   * @param {number} index
   */
  playTrackByIndex(index) {
    if (index >= 0 && index < State.queue.length) {
      const track = State.queue[index];

      // If track is a disconnected local file, notify instead of failing to play empty src
      if (track && track.sourceType === 'local' && track.isDisconnected) {
        State.setCurrentIndex(index);
        State.emit('disconnectedTrackPlayAttempt', { track, index });
        return;
      }

      if (State.currentIndex >= 0 && State.currentTrack) {
        this.historyStack.push(State.currentIndex);
      }
      State.setCurrentIndex(index);
      AudioEngine.loadTrack(State.queue[index], true);
    }
  }

  /**
   * Play specific track by ID
   * @param {string} trackId
   */
  playTrackById(trackId) {
    const idx = State.queue.findIndex(t => t.id === trackId);
    if (idx !== -1) {
      this.playTrackByIndex(idx);
    }
  }

  /**
   * Reconnect existing disconnected local tracks with matching files from a user-selected folder
   * Updates existing track references without duplicating items in the queue
   * @param {FileList | File[]} files
   * @returns {{ totalDisconnected: number, reconnectedCount: number, remainingDisconnected: number }}
   */
  reconnectLocalTracks(files) {
    if (!files || files.length === 0) {
      return { totalDisconnected: 0, reconnectedCount: 0, remainingDisconnected: 0 };
    }

    const fileList = Array.from(files);
    let reconnectedCount = 0;

    // Helper to sanitize and normalize strings for matching
    const normalize = (str) => {
      if (!str) return '';
      return str.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9]/gi, '').trim();
    };

    const disconnectedTracks = State.queue.filter(t => t.sourceType === 'local' && t.isDisconnected);
    const totalDisconnected = disconnectedTracks.length;

    State.queue.forEach(track => {
      if (track.sourceType !== 'local' || !track.isDisconnected) return;

      const trackName = normalize(track.fileName || track.title);
      const trackRelPath = (track.relativePath || '').toLowerCase().replace(/\\/g, '/');

      // 1. Try exact relative path match
      let matchFile = fileList.find(f => {
        const fileRelPath = (f.webkitRelativePath || f.name).toLowerCase().replace(/\\/g, '/');
        return trackRelPath && fileRelPath.endsWith(trackRelPath);
      });

      // 2. Try exact filename match
      if (!matchFile) {
        matchFile = fileList.find(f => f.name.toLowerCase() === (track.fileName || '').toLowerCase());
      }

      // 3. Try normalized filename/title match
      if (!matchFile) {
        matchFile = fileList.find(f => normalize(f.name) === trackName);
      }

      if (matchFile) {
        track.src = URL.createObjectURL(matchFile);
        track.fileReference = matchFile;
        track.isDisconnected = false;
        reconnectedCount++;

        // If this track is currently selected, load it immediately into AudioEngine
        if (State.currentTrack && State.currentTrack.id === track.id) {
          AudioEngine.loadTrack(track, State.isPlaying);
        }
      }
    });

    if (reconnectedCount > 0) {
      State.emit('queueUpdated', State.queue);
      State.emit('trackChanged', { track: State.currentTrack, index: State.currentIndex });
    }

    const remainingDisconnected = State.queue.filter(t => t.sourceType === 'local' && t.isDisconnected).length;

    return {
      totalDisconnected,
      reconnectedCount,
      remainingDisconnected
    };
  }

  /**
   * Advance to the next track in queue
   * @param {boolean} [manual=true] - Whether user explicitly clicked next button
   */
  next(manual = true) {
    if (State.queue.length === 0) return;

    if (State.currentIndex >= 0) {
      this.historyStack.push(State.currentIndex);
    }

    if (State.isShuffle) {
      const remainingIndices = State.queue
        .map((_, i) => i)
        .filter(i => i !== State.currentIndex);

      if (remainingIndices.length > 0) {
        const randomIdx = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
        this.playTrackByIndex(randomIdx);
        return;
      }
    }

    let nextIndex = State.currentIndex + 1;

    if (nextIndex >= State.queue.length) {
      if (State.repeatMode === 'all' || manual) {
        nextIndex = 0; // Wrap around
      } else {
        AudioEngine.pause();
        return;
      }
    }

    this.playTrackByIndex(nextIndex);
  }

  /**
   * Go back to previous track in queue
   */
  prev() {
    if (State.queue.length === 0) return;

    // If more than 3 seconds elapsed in current track, restart it
    if (State.currentTime > 3) {
      AudioEngine.seek(0);
      return;
    }

    if (this.historyStack.length > 0) {
      const prevIdx = this.historyStack.pop();
      if (prevIdx < State.queue.length) {
        this.playTrackByIndex(prevIdx);
        return;
      }
    }

    let prevIndex = State.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = State.queue.length - 1;
    }

    this.playTrackByIndex(prevIndex);
  }

  /**
   * Clear the entire queue
   */
  clearQueue() {
    AudioEngine.pause();
    this.historyStack = [];
    State.setQueue([], -1);
  }

  /**
   * Restore default demo tracks
   */
  restoreDefaults() {
    AudioEngine.pause();
    this.historyStack = [];
    State.setQueue(initialTracks, 0);
  }
}

export const QueueController = new QueueControllerManager();
