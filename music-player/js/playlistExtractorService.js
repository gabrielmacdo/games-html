/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - YOUTUBE PLAYLIST EXTRACTOR SERVICE
 * Extracts YouTube Playlists using export-youtube-playlist.vercel.app
 * via CORS proxy (AllOrigins with resilient fallbacks) with XSS mitigation.
 * ====================================================================
 */

import { sanitizeTextString, sanitizeCoverUrl } from './urlParser.js';

/**
 * YouTube playlist URL / ID patterns
 */
const PLAYLIST_ID_REGEX = /(?:list=|\/playlist\?list=|^)([a-zA-Z0-9_-]{10,})/;
const VIDEO_ID_REGEX = /(?:v=|\/embed\/|\/v\/|youtu\.be\/|watch\?v=|^)([a-zA-Z0-9_-]{11})/;
const STRICT_YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Helper to clean and format title/artist
 * @param {string} rawTitle
 * @param {string} rawChannel
 * @returns {{ title: string, artist: string }}
 */
function parseTrackTitleAndArtist(rawTitle, rawChannel) {
  let title = sanitizeTextString(rawTitle, 'Faixa do YouTube');
  let artist = sanitizeTextString(rawChannel, 'YouTube Creator');

  // If title has "Artist - Song Title" pattern and channel is default or matches
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      artist = sanitizeTextString(parts[0].trim(), artist);
      title = sanitizeTextString(parts.slice(1).join(' - ').trim(), title);
    }
  }

  // Clean common YouTube suffixes (Official Video, Lyrics, etc.)
  title = title.replace(/\s*(\(|\[)(Official Video|Official Audio|Music Video|Lyric Video|Audio|Videoclipe|Clipe Oficial)(\)|\])/gi, '').trim();

  return {
    title: sanitizeTextString(title, 'Faixa do YouTube'),
    artist: sanitizeTextString(artist, 'YouTube Stream')
  };
}

/**
 * Sanitize YouTube Playlist URL to standard format
 * @param {string} inputUrl
 * @returns {string} Standardized YouTube playlist URL
 */
export function sanitizePlaylistUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  const trimmed = inputUrl.trim();

  // If it's already a full URL with list=
  if (trimmed.includes('list=')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const listId = url.searchParams.get('list');
      if (listId && /^[a-zA-Z0-9_-]+$/.test(listId)) {
        return `https://www.youtube.com/playlist?list=${listId}`;
      }
    } catch (_) {
      const match = trimmed.match(/list=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://www.youtube.com/playlist?list=${match[1]}`;
      }
    }
  }

  // If user pasted pure playlist ID (e.g. PL...)
  const cleanIdMatch = trimmed.match(PLAYLIST_ID_REGEX);
  if (cleanIdMatch && cleanIdMatch[1]) {
    return `https://www.youtube.com/playlist?list=${cleanIdMatch[1]}`;
  }

  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

/**
 * Extract YouTube playlist videos via export-youtube-playlist.vercel.app
 * @param {string} playlistUrl
 * @returns {Promise<{ title: string, tracks: Array<import('./mockData.js').Track> }>}
 */
export async function extractPlaylistViaTool(playlistUrl) {
  if (!playlistUrl || typeof playlistUrl !== 'string' || !playlistUrl.trim()) {
    throw new Error('Por favor, informe a URL ou o ID da playlist do YouTube.');
  }

  const cleanPlaylistUrl = sanitizePlaylistUrl(playlistUrl);
  if (!cleanPlaylistUrl.includes('list=')) {
    throw new Error('URL inválida. A URL deve conter o parâmetro "list=" com o ID da playlist.');
  }

  const serviceBaseUrl = `https://export-youtube-playlist.vercel.app/get-data/?url=${encodeURIComponent(cleanPlaylistUrl)}`;
  
  // List of endpoints to try: primary AllOrigins as requested, plus resilient fallback proxies
  const proxyEndpoints = [
    {
      name: 'AllOrigins (JSON)',
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(serviceBaseUrl)}&_cb=${Date.now()}`,
      isAllOrigins: true
    },
    {
      name: 'AllOrigins (Raw)',
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(serviceBaseUrl)}&_cb=${Date.now()}`,
      isAllOrigins: false
    },
    {
      name: 'CorsProxy.io',
      url: `https://corsproxy.io/?${encodeURIComponent(serviceBaseUrl)}`,
      isAllOrigins: false
    },
    {
      name: 'CodeTabs',
      url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(serviceBaseUrl)}`,
      isAllOrigins: false
    }
  ];

  let rawData = null;
  let lastError = null;

  for (const endpoint of proxyEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout per attempt

      const response = await fetch(endpoint.url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 304) {
        throw new Error(`HTTP ${response.status} de ${endpoint.name}`);
      }

      if (endpoint.isAllOrigins) {
        const json = await response.json();
        if (!json || !json.contents) {
          throw new Error('Resposta vazia do proxy AllOrigins');
        }
        rawData = typeof json.contents === 'string' ? JSON.parse(json.contents) : json.contents;
      } else {
        const text = await response.text();
        rawData = JSON.parse(text);
      }

      if (rawData) {
        break; // Successfully fetched and parsed
      }
    } catch (err) {
      lastError = err;
      console.warn(`PlaylistExtractor: Falha ao consultar via ${endpoint.name}:`, err.message);
    }
  }

  if (!rawData) {
    throw new Error(
      lastError
        ? `Não foi possível conectar ao serviço de extração: ${lastError.message}`
        : 'Erro desconhecido ao conectar com a ferramenta externa.'
    );
  }

  if (rawData.error) {
    throw new Error(sanitizeTextString(rawData.error, 'Erro retornado pela ferramenta externa.'));
  }

  const playlistTitle = sanitizeTextString(rawData.title, 'Playlist do YouTube');
  const videoData = rawData.video_data;

  if (!videoData) {
    throw new Error('A resposta do serviço não contém dados de vídeos válidos.');
  }

  const tracks = [];

  // Format A: Column-oriented object (e.g. { "Title": [...], "Video url": [...], "Thumbnail url": [...], ... })
  if (typeof videoData === 'object' && !Array.isArray(videoData)) {
    const titles = videoData['Title'] || [];
    const videoUrls = videoData['Video url'] || [];
    const channels = videoData['Channel name'] || [];
    const thumbs = videoData['Thumbnail url'] || [];
    const durations = videoData['Duration in seconds'] || [];

    const totalCount = Math.max(titles.length, videoUrls.length);

    for (let i = 0; i < totalCount; i++) {
      const vUrl = String(videoUrls[i] || '');
      const match = vUrl.match(VIDEO_ID_REGEX);
      const ytId = match && STRICT_YT_ID_REGEX.test(match[1]) ? match[1] : null;

      if (ytId) {
        const { title, artist } = parseTrackTitleAndArtist(titles[i], channels[i]);
        const rawDur = typeof durations[i] === 'number' ? durations[i] : (parseInt(durations[i], 10) || 0);
        const durationSec = isNaN(rawDur) || rawDur < 0 ? 0 : Math.min(rawDur, 86400);
        const coverUrl = thumbs[i] ? sanitizeCoverUrl(thumbs[i]) : `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

        tracks.push({
          id: `yt-${ytId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sourceType: 'youtube',
          youtubeId: ytId,
          title: title,
          artist: artist,
          album: playlistTitle,
          coverUrl: coverUrl,
          duration: durationSec,
          isFavorite: false
        });
      }
    }
  }
  // Format B: Array of video objects (e.g. [{ title, "Video url", ... }])
  else if (Array.isArray(videoData)) {
    videoData.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const vUrl = String(item['Video url'] || item.url || item.videoUrl || '');
      const match = vUrl.match(VIDEO_ID_REGEX) || (item.id ? [null, item.id] : null);
      const ytId = match && STRICT_YT_ID_REGEX.test(match[1]) ? match[1] : null;

      if (ytId) {
        const rawTitle = item['Title'] || item.title;
        const rawChannel = item['Channel name'] || item.channel || item.author;
        const { title, artist } = parseTrackTitleAndArtist(rawTitle, rawChannel);
        const rawDur = typeof item['Duration in seconds'] === 'number' ? item['Duration in seconds'] : 0;
        const durationSec = isNaN(rawDur) || rawDur < 0 ? 0 : Math.min(rawDur, 86400);
        const coverUrl = item['Thumbnail url'] || item.thumbnail ? sanitizeCoverUrl(item['Thumbnail url'] || item.thumbnail) : `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

        tracks.push({
          id: `yt-${ytId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          sourceType: 'youtube',
          youtubeId: ytId,
          title: title,
          artist: artist,
          album: playlistTitle,
          coverUrl: coverUrl,
          duration: durationSec,
          isFavorite: false
        });
      }
    });
  }

  if (tracks.length === 0) {
    throw new Error('Nenhum vídeo pôde ser extraído da playlist informada. Verifique se a playlist é pública.');
  }

  return {
    title: playlistTitle,
    tracks: tracks
  };
}
