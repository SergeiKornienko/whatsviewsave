// src/utils/zipHandler.js
import JSZip from 'jszip';

/**
 * Handles WhatsApp ZIP exports.
 *
 * Only the chat .txt is read up front. Media files stay compressed inside the
 * archive and are extracted on demand (when a message scrolls into view), which
 * keeps memory bounded even for large "with media" exports.
 */
export class ZipHandler {
  constructor() {
    this.zip = null;
    this.zipData = null; // Сохраняем исходные данные
    this.entries = new Map(); // filename -> JSZip file object
  }

  /**
   * Load a ZIP file, index its entries and read the chat text.
   * @param {File} file
   * @returns {Promise<{ chatText: string, chatFileName: string, fileNames: Set<string>, metadata: object }>}
   */
  async loadZipFile(file) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      throw new Error('Please upload a ZIP file');
    }

    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 2GB');
    }

    try {
      // Сохраняем исходные данные для экспорта
      this.zipData = await file.arrayBuffer();
      this.zip = await JSZip.loadAsync(this.zipData);
    } catch {
      throw new Error('Could not read ZIP file. It may be corrupted.');
    }

    this.entries.clear();
    for (const [name, entry] of Object.entries(this.zip.files)) {
      if (!entry.dir) {
        // WhatsApp exports are flat, but be safe and key by basename too.
        this.entries.set(name, entry);
        const base = name.split('/').pop();
        if (base && base !== name && !this.entries.has(base)) {
          this.entries.set(base, entry);
        }
      }
    }

    const chatEntry = this.findChatEntry();
    if (!chatEntry) {
      throw new Error(
        'No chat file found. Make sure the ZIP is a WhatsApp chat export (it should contain a .txt file).'
      );
    }

    const chatText = await chatEntry.async('string');

    return {
      chatText,
      chatFileName: chatEntry.name,
      fileNames: new Set(this.entries.keys()),
      metadata: {
        totalFiles: this.entries.size,
        zipSize: file.size,
        chatFileName: chatEntry.name,
      },
    };
  }

  /** Find the main chat .txt entry. */
  findChatEntry() {
    const txtEntries = [...this.entries.entries()].filter(([name]) =>
      name.toLowerCase().endsWith('.txt')
    );
    if (txtEntries.length === 0) return null;
    // Prefer a file that looks like a WhatsApp chat export.
    const preferred = txtEntries.find(([name]) => {
      const n = name.toLowerCase();
      return n.includes('chat') || n.includes('whatsapp');
    });
    return (preferred || txtEntries[0])[1];
  }

  /** Whether a file exists in the archive. */
  hasFile(filename) {
    return this.entries.has(filename);
  }

  /**
   * Extract a single file as a Blob, on demand.
   * @param {string} filename
   * @param {string} [mimeType]
   * @returns {Promise<Blob|null>}
   */
  async getBlob(filename, mimeType) {
    const entry = this.entries.get(filename);
    if (!entry) return null;
    const data = await entry.async('blob');
    return mimeType ? new Blob([data], { type: mimeType }) : data;
  }

  /**
   * Возвращает исходные данные ZIP-архива
   * @returns {Promise<ArrayBuffer>}
   */
  async getOriginalZipData() {
    if (!this.zipData) {
      throw new Error('ZIP-архив не загружен');
    }
    return this.zipData;
  }

  /** Release the archive. */
  cleanup() {
    this.entries.clear();
    this.zip = null;
    this.zipData = null;
  }
}