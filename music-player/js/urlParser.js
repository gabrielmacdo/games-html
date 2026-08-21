/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - URL PARSER & SECURITY UTILS
 * Handles URL validation, protocol whitelisting, XSS escaping,
 * and metadata resolution for YouTube, Google Drive, and Cloud Audio.
 * ====================================================================
 */

/**
 * Escape HTML special characters to prevent Cross-Site Scripting (XSS)
 * @param {any} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

/**
 * Sanitize text metadata (title, artist, album, etc.)
 * Strips dangerous control characters and null bytes, normalizes whitespace and length
 * @param {any} val
 * @param {string} [fallback='']
 * @param {number} [maxLength=300]
 * @returns {string}
 */
export function sanitizeTextString(val, fallback = '', maxLength = 300) {
  if (val === null || val === undefined) return fallback;
  let str = typeof val === 'string' ? val : String(val);
  // Strip non-printable ASCII control characters and null bytes
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  if (!str) return fallback;
  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Validates and sanitizes a media audio stream URL.
 * Only allows safe protocols: http:, https:, blob:
 * Strictly rejects: javascript:, vbscript:, data:text/html, etc.
 * @param {string} url
 * @param {string} [fallback='']
 * @returns {string}
 */
export function sanitizeAudioUrl(url, fallback = '') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Block dangerous inline pseudo-protocols
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return fallback;
  }

  // Allow blob: for local files
  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Allow http: and https:
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return encodeURI(decodeURI(parsed.href));
      }
    } catch (_) {}
  }

  return fallback;
}

/**
 * Validates and sanitizes cover artwork URLs.
 * Allows safe protocols: http:, https:, blob:, relative asset paths (./assets/...),
 * and safe Base64 image data URIs (data:image/(png|jpeg|jpg|webp|gif|svg+xml);base64,...).
 * Rejects javascript:, data:text/html, etc.
 * @param {string} url
 * @param {string} [fallback='./assets/demo-covers/default-web.svg']
 * @returns {string}
 */
export function sanitizeCoverUrl(url, fallback = './assets/demo-covers/default-web.svg') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Block dangerous protocols
  if (/^(javascript|vbscript):/i.test(trimmed)) {
    return fallback;
  }

  // Allow relative asset paths
  if (trimmed.startsWith('./assets/') || trimmed.startsWith('assets/')) {
    return trimmed;
  }

  // Allow blob:
  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Allow safe base64 image data URIs only
  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[a-zA-Z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  // Allow http: and https:
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return encodeURI(decodeURI(parsed.href));
      }
    } catch (_) {}
  }

  return fallback;
}

/**
 * YouTube video ID extraction patterns (strict 11-char regex)
 */
const YT_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/;
const STRICT_YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Google Drive file ID extraction pattern (all common share formats)
 */
const GDRIVE_REGEX = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]+&)*id=)|drive\.usercontent\.google\.com\/download\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/;

/**
 * Direct Audio file extensions regex
 */
const AUDIO_EXT_REGEX = /\.(mp3|wav|ogg|m4a|aac|flac|weba)(\?.*)?$/i;

export const UrlParser = {
  /**
   * Sanitize URL: add https:// prefix if missing, reject dangerous protocols, format via encodeURI
   * @param {string} rawUrl
   * @returns {string}
   */
  sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let str = rawUrl.trim();
    if (!str) return '';

    // Block dangerous protocols immediately
    if (/^(javascript|vbscript|data):/i.test(str)) {
      return '';
    }

    // Auto prefix https:// if no protocol is given
    if (!/^https?:\/\//i.test(str) && !str.startsWith('blob:')) {
      str = `https://${str}`;
    }

    try {
      const decoded = decodeURI(str);
      return encodeURI(decoded);
    } catch (_) {
      return encodeURI(str);
    }
  },

  /**
   * Check if a string is a valid, safe URL
   * @param {string} str
   * @returns {boolean}
   */
  isValidUrl(str) {
    if (!str || typeof str !== 'string') return false;
    const sanitized = this.sanitizeUrl(str);
    if (!sanitized) return false;

    try {
      const url = new URL(sanitized);
      return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'blob:';
    } catch (_) {
      return false;
    }
  },

  /**
   * Extract YouTube ID if valid YouTube or YouTube Music URL
   * @param {string} url
   * @returns {string | null}
   */
  extractYouTubeId(url) {
    if (!url) return null;
    const sanitized = this.sanitizeUrl(url);
    const match = sanitized.match(YT_REGEX);
    if (match && match[1] && STRICT_YT_ID_REGEX.test(match[1])) {
      return match[1];
    }
    return null;
  },

  /**
   * Convert Google Drive share link into direct audio stream endpoint
   * @param {string} url
   * @returns {string}
   */
  convertGoogleDriveUrl(url) {
    const sanitized = this.sanitizeUrl(url);
    const match = sanitized.match(GDRIVE_REGEX);
    if (match && match[1]) {
      const fileId = match[1].replace(/[^a-zA-Z0-9_-]/g, '');
      return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;
    }
    return sanitized;
  },

  /**
   * Clean and extract readable title/artist from audio URL filename
   * @param {string} url
   * @returns {{ title: string, artist: string }}
   */
  extractMetadataFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      let filename = pathname.substring(pathname.lastIndexOf('/') + 1);
      filename = decodeURIComponent(filename).replace(AUDIO_EXT_REGEX, '');
      filename = filename.replace(/[_\+]/g, ' ').trim();

      if (filename.includes(' - ')) {
        const parts = filename.split(' - ');
        return {
          artist: sanitizeTextString(parts[0].trim(), 'Artista Desconhecido'),
          title: sanitizeTextString(parts.slice(1).join(' - ').trim(), 'Faixa Web')
        };
      }

      return {
        artist: 'Web Audio Stream',
        title: sanitizeTextString(filename, 'Faixa Web')
      };
    } catch (_) {
      return {
        artist: 'Web Audio Stream',
        title: 'Faixa Desconhecida'
      };
    }
  },

  /**
   * Fetch YouTube metadata asynchronously using noembed.com API
   * @param {string} youtubeId
   * @returns {Promise<{ title: string, artist: string, coverUrl: string }>}
   */
  async fetchYouTubeMetadata(youtubeId) {
    const cleanId = String(youtubeId).replace(/[^a-zA-Z0-9_-]/g, '');
    const defaultCover = `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;

    try {
      const endpoint = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${cleanId}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Noembed response not ok');
      const data = await response.json();

      let title = sanitizeTextString(data.title, `YouTube Video (${cleanId})`);
      let artist = sanitizeTextString(data.author_name, 'YouTube Creator');

      // If title contains "Artist - Title" format, parse it
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = sanitizeTextString(parts[0].trim(), artist);
        title = sanitizeTextString(parts.slice(1).join(' - ').trim(), title);
      }

      return {
        title,
        artist,
        coverUrl: defaultCover
      };
    } catch (err) {
      console.warn('UrlParser: noembed fetch failed, using fallback metadata', err);
      return {
        title: `YouTube Media (${cleanId})`,
        artist: 'YouTube Video',
        coverUrl: defaultCover
      };
    }
  },

  /**
   * Parse a single URL and create a standard Track object (Schema v3.0)
   * @param {string} rawUrl
   * @returns {Promise<import('./mockData.js').Track | null>}
   */
  async parseUrl(rawUrl) {
    if (!this.isValidUrl(rawUrl)) return null;

    const sanitizedUrl = this.sanitizeUrl(rawUrl);
    const ytId = this.extractYouTubeId(sanitizedUrl);

    if (ytId) {
      const meta = await this.fetchYouTubeMetadata(ytId);
      return {
        id: `yt-${ytId}-${Date.now()}`,
        sourceType: 'youtube',
        youtubeId: ytId,
        title: meta.title,
        artist: meta.artist,
        album: 'YouTube Stream',
        coverUrl: sanitizeCoverUrl(meta.coverUrl),
        duration: 0,
        isFavorite: false
      };
    }

    // Direct Web / CloudFront / Google Drive
    const directAudioUrl = this.convertGoogleDriveUrl(sanitizedUrl);
    const safeAudioUrl = sanitizeAudioUrl(directAudioUrl);
    if (!safeAudioUrl) return null;

    const meta = this.extractMetadataFromUrl(sanitizedUrl);

    return {
      id: `web-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceType: 'web',
      title: meta.title,
      artist: meta.artist,
      album: sanitizedUrl.includes('drive.google') || sanitizedUrl.includes('drive.usercontent') ? 'Google Drive Cloud' : (sanitizedUrl.includes('cloudfront') ? 'CloudFront CDN' : 'Web Stream'),
      src: safeAudioUrl,
      coverUrl: './assets/demo-covers/default-web.svg',
      duration: 0,
      isFavorite: false
    };
  },

  /**
   * Parse multi-line string containing multiple URLs in batch
   * @param {string} batchText
   * @returns {Promise<Array<import('./mockData.js').Track>>}
   */
  async parseBatchUrls(batchText) {
    if (!batchText || typeof batchText !== 'string') return [];

    const lines = batchText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return [];

    const promises = lines.map(line => this.parseUrl(line));
    const results = await Promise.allSettled(promises);

    const validTracks = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && res.value) {
        validTracks.push(res.value);
      }
    });

    return validTracks;
  }
};
