/**
 * ====================================================================
 * UNIVERSAL WEB MUSIC PLAYER (v3.0) - METADATA PARSER (ID3 & LOCAL)
 * Reads ID3 tags securely, extracts Base64 embedded covers,
 * and parses local files with XSS mitigation.
 * ====================================================================
 */

import { sanitizeTextString, sanitizeCoverUrl } from './urlParser.js';

/**
 * Allowed MIME types for ID3 embedded covers
 */
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

/**
 * Convert byte array to Base64 Data URL string safely
 * @param {Array<number>} bytes
 * @param {string} format
 * @returns {string | null}
 */
function bufferToBase64(bytes, format = 'image/jpeg') {
  if (!bytes || !Array.isArray(bytes) && !(bytes instanceof Uint8Array)) {
    return null;
  }

  // Sanitize and validate image format
  let safeFormat = 'image/jpeg';
  if (format && typeof format === 'string') {
    const cleanFormat = format.toLowerCase().trim();
    if (ALLOWED_IMAGE_MIMES.includes(cleanFormat)) {
      safeFormat = cleanFormat === 'image/jpg' ? 'image/jpeg' : cleanFormat;
    }
  }

  try {
    let binary = '';
    const len = bytes.length;
    // Limit cover image size in memory to 5MB to avoid memory exhaustion
    const maxBytes = Math.min(len, 5 * 1024 * 1024);
    for (let i = 0; i < maxBytes; i++) {
      binary += String.fromCharCode(bytes[i] & 0xff);
    }
    const base64 = window.btoa(binary);
    return `data:${safeFormat};base64,${base64}`;
  } catch (err) {
    console.warn('MetadataParser: Error converting ID3 buffer to Base64', err);
    return null;
  }
}

export const MetadataParser = {
  /**
   * Parse ID3 tags from a File object using jsmediatags
   * @param {File} file
   * @returns {Promise<{ title?: string, artist?: string, album?: string, coverBase64?: string }>}
   */
  readId3Tags(file) {
    return new Promise((resolve) => {
      if (!window.jsmediatags || typeof window.jsmediatags.read !== 'function') {
        resolve({});
        return;
      }

      try {
        window.jsmediatags.read(file, {
          onSuccess: (tag) => {
            const tags = tag.tags || {};
            let coverBase64 = null;

            if (tags.picture) {
              try {
                const { data, format } = tags.picture;
                coverBase64 = bufferToBase64(data, format);
              } catch (err) {
                console.warn('MetadataParser: Error converting ID3 picture to base64', err);
              }
            }

            resolve({
              title: tags.title ? sanitizeTextString(tags.title) : undefined,
              artist: tags.artist ? sanitizeTextString(tags.artist) : undefined,
              album: tags.album ? sanitizeTextString(tags.album) : undefined,
              coverBase64: coverBase64 ? sanitizeCoverUrl(coverBase64, '') : undefined
            });
          },
          onError: (error) => {
            console.warn('MetadataParser: jsmediatags read error for file', file ? file.name : '', error);
            resolve({});
          }
        });
      } catch (e) {
        console.warn('MetadataParser: jsmediatags threw exception', e);
        resolve({});
      }
    });
  },

  /**
   * Clean filename to deduce artist and title if ID3 tags are missing
   * @param {string} fileName
   * @returns {{ title: string, artist: string }}
   */
  cleanFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      return { artist: 'Artista Local', title: 'Faixa de Áudio' };
    }

    let clean = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
    clean = clean.replace(/[_\+]/g, ' ').trim();

    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      return {
        artist: sanitizeTextString(parts[0].trim(), 'Artista Local'),
        title: sanitizeTextString(parts.slice(1).join(' - ').trim(), 'Faixa de Áudio')
      };
    }

    return {
      artist: 'Artista Local',
      title: sanitizeTextString(clean, 'Faixa de Áudio')
    };
  },

  /**
   * Parse a single local File object into a Schema v3.0 Track
   * @param {File} file
   * @returns {Promise<import('./mockData.js').Track>}
   */
  async parseLocalFile(file) {
    const id3 = await this.readId3Tags(file);
    const fallback = this.cleanFileName(file.name);

    const safeTitle = sanitizeTextString(id3.title || fallback.title, 'Faixa Local');
    const safeArtist = sanitizeTextString(id3.artist || fallback.artist, 'Artista Local');
    const safeAlbum = sanitizeTextString(id3.album, 'Mídia Local');
    const safeFileName = sanitizeTextString(file.name, 'audio.mp3');
    const safeRelPath = sanitizeTextString(file.webkitRelativePath || file.name, safeFileName);
    const blobUrl = URL.createObjectURL(file);

    return {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sourceType: 'local',
      fileName: safeFileName,
      relativePath: safeRelPath,
      title: safeTitle,
      artist: safeArtist,
      album: safeAlbum,
      src: blobUrl,
      coverUrl: id3.coverBase64 ? sanitizeCoverUrl(id3.coverBase64) : './assets/demo-covers/default-local.svg',
      coverBase64: id3.coverBase64 ? sanitizeCoverUrl(id3.coverBase64) : undefined,
      duration: 0,
      isFavorite: false
    };
  },

  /**
   * Process multiple files or a selected folder
   * @param {FileList | File[]} fileList
   * @returns {Promise<Array<import('./mockData.js').Track>>}
   */
  async parseFileList(fileList) {
    if (!fileList) return [];

    const files = Array.from(fileList).filter(file => {
      return file && (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name));
    });

    if (files.length === 0) return [];

    const tracks = [];
    for (const file of files) {
      try {
        const track = await this.parseLocalFile(file);
        tracks.push(track);
      } catch (err) {
        console.warn('MetadataParser: Failed to parse file', file ? file.name : '', err);
      }
    }

    return tracks;
  }
};
