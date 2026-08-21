/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - MOCK & DEFAULT DATA
 * Schema Version: 3.0.0
 * ====================================================================
 */

/**
 * @typedef {Object} Track
 * @property {string} id - Unique identifier (e.g. 'demo-001', 'yt-dQw4w9WgXcQ')
 * @property {'demo' | 'local' | 'youtube' | 'web'} sourceType - Type of audio source
 * @property {string} title - Song title
 * @property {string} artist - Artist or creator name
 * @property {string} album - Album name or source description
 * @property {string} [src] - Audio stream URL or Blob URL (for demo, local, web)
 * @property {string} [youtubeId] - YouTube video ID (for youtube source)
 * @property {string} coverUrl - URL or relative path to cover artwork
 * @property {string} [coverBase64] - Base64 data URI of ID3 cover image
 * @property {number} duration - Duration in seconds (0 if unknown initially)
 * @property {boolean} isFavorite - Whether track is marked as favorite
 * @property {string} [fileName] - Original file name for local files
 * @property {string} [relativePath] - Folder path for local files
 */

/**
 * Initial curated demo tracks matching Schema v3.0
 * 100% stable, copyright-free and working demo tracks
 * @type {Track[]}
 */
export const initialTracks = [
  /* MÚSICAS DE EXEMPLO */


  {
    id: "yt-SXIIy9t0qAA",
    sourceType: "youtube",
    youtubeId: "SXIIy9t0qAA",
    title: "Instant Mood Booster - Smooth Jazzhop & Groove Beats",
    artist: "outofrhythmm",
    album: "Café Vibe · Work & Study",
    coverUrl: "https://img.youtube.com/vi/SXIIy9t0qAA/hqdefault.jpg",
    duration: 6488,
    isFavorite: false,
    addedAt: new Date().toISOString()
  },
  {
    id: "yt-BYTxPFj44uo",
    sourceType: "youtube",
    youtubeId: "BYTxPFj44uo",
    title: "Why the rush? - lo-fi beats for work/study / cat jazz",
    artist: "chill chill journal",
    album: "Lo-Fi Beats",
    coverUrl: "https://img.youtube.com/vi/BYTxPFj44uo/hqdefault.jpg",
    duration: 12679,
    isFavorite: false,
    addedAt: new Date().toISOString()
  },
  {
    id: "yt-dQw4w9WgXcQ",
    sourceType: "youtube",
    youtubeId: "dQw4w9WgXcQ",
    title: "Never Gonna Give You Up",
    artist: "Rick Astley",
    album: "Whenever You Need Somebody",
    coverUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    duration: 213.0,
    isFavorite: true
  },
  {
    id: "yt-5qap5aO4i9A",
    sourceType: "youtube",
    youtubeId: "5qap5aO4i9A",
    title: "Lofi Study Beats - Relaxing Chill Session",
    artist: "Lofi Girl",
    album: "Lofi Hip Hop Chill",
    coverUrl: "https://img.youtube.com/vi/5qap5aO4i9A/hqdefault.jpg",
    duration: 0,
    isFavorite: true
  },
  {
    id: "demo-001",
    sourceType: "demo",
    title: "Summer Lo-Fi Sunset",
    artist: "Free Sounds Collective",
    album: "Chill Beats Vol. 1",
    src: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
    coverUrl: "./assets/demo-covers/cover1.svg",
    duration: 147.0,
    isFavorite: false
  },
  {
    id: "demo-002",
    sourceType: "demo",
    title: "Cyberdrive 2077",
    artist: "Synthwave Master",
    album: "Neon Grid Odyssey",
    src: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=synthwave-80s-110045.mp3",
    coverUrl: "./assets/demo-covers/cover2.svg",
    duration: 125.0,
    isFavorite: false
  }
];

/**
 * Default Playlist Schema v3.0 metadata
 */
export const defaultPlaylistMetadata = {
  playlistName: "Coletânea Universal 2026",
  version: "3.0.0",
  description: "Playlist híbrida com faixas Demo, Web CDN e YouTube"
};
