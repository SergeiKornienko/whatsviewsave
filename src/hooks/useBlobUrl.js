import { useEffect, useState } from 'react';

/**
 * Lazily extract a file from the ZIP and expose it as an object URL.
 * The URL is created when the component mounts (i.e. scrolls into view) and
 * revoked on unmount, so only on-screen media is held in memory.
 *
 * @param {(filename: string, mimeType?: string) => Promise<Blob|null>} getBlob
 * @param {string} filename
 * @param {string} [mimeType]
 * @returns {string|null} object URL, or null while loading
 */
export function useBlobUrl(getBlob, filename, mimeType) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let active = true;
    let created = null;

    getBlob(filename, mimeType).then((blob) => {
      if (!active || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [getBlob, filename, mimeType]);

  return url;
}
