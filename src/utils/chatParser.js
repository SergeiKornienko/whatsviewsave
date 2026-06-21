/**
 * WhatsApp Chat Parser
 * Parses WhatsApp chat export files and extracts messages with attachments.
 *
 * Handles real-world export quirks:
 *  - Android ("DD/MM/YY, h:mm pm - Sender: msg") and iOS ("[DD/MM/YY, h:mm:ss pm] Sender: msg")
 *  - Day/month order auto-detected from the data (most of the world is DD/MM, US is MM/DD)
 *  - Narrow no-break space (U+202F) that newer exports put before am/pm
 *  - 12-hour (am/pm) and 24-hour clocks
 *  - "<This message was edited>", deleted messages and "<Media omitted>"
 *  - Mention isolate characters (U+2068/U+2069) around @names
 */

// Invisible directional-isolate characters WhatsApp wraps mentions in.
const ISOLATE_CHARS = /[\u2066-\u2069\u202a-\u202e]/g;

/**
 * Replace exotic whitespace (narrow/no-break spaces) with a regular space.
 */
function normalizeSpaces(str) {
  return str.replace(/[\u00a0\u202f\u2009\u200a]/g, ' ');
}

// Line header patterns. Group 1 = date, group 2 = time, group 3 = remainder.
// iOS wraps the timestamp in square brackets and uses it as a prefix (no " - ").
const IOS_HEADER = /^\[(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APMapm]{2})?)\]\s*(.*)$/;
// Android uses "date, time - remainder".
const ANDROID_HEADER = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APMapm]{2})?)\s*-\s*(.*)$/;

/**
 * Parse the header of a line. Returns { date, time, rest } or null for a
 * continuation/blank line.
 */
function parseHeader(line) {
  const match = line.match(ANDROID_HEADER) || line.match(IOS_HEADER);
  if (!match) return null;
  return { date: match[1], time: match[2].trim(), rest: match[3] };
}

/**
 * Decide whether dates are day-first (DD/MM) or month-first (MM/DD) by
 * scanning every date in the file: any first-part > 12 proves day-first,
 * any second-part > 12 proves month-first. Default to day-first.
 */
function detectDayFirst(headers) {
  for (const { date } of headers) {
    const [a, b] = date.split(/[/.-]/).map(Number);
    if (a > 12) return true;
    if (b > 12) return false;
  }
  return true;
}

/**
 * Build a real epoch timestamp from the raw date/time strings.
 * Returns NaN if it cannot be parsed (display still uses the raw strings).
 */
function buildTimestamp(date, time, dayFirst) {
  const parts = date.split(/[/.-]/).map(Number);
  if (parts.length !== 3) return NaN;
  let [first, second] = parts;
  const third = parts[2];
  let day = dayFirst ? first : second;
  let month = dayFirst ? second : first;
  let year = third < 100 ? 2000 + third : third;

  const t = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])?/);
  if (!t) return NaN;
  let hour = Number(t[1]);
  const minute = Number(t[2]);
  const second2 = t[3] ? Number(t[3]) : 0;
  const meridiem = t[4] ? t[4].toLowerCase() : null;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return new Date(year, month - 1, day, hour, minute, second2).getTime();
}

/**
 * Parse WhatsApp chat content.
 * @param {string} chatContent - Raw chat file content
 * @param {Map} files - Map of extracted files from ZIP
 * @returns {Array} - Array of parsed messages
 */
export function parseChat(chatContent, files = new Map()) {
  try {
    // Remove UTF-8 BOM if present.
    if (chatContent.charCodeAt(0) === 0xfeff) {
      chatContent = chatContent.slice(1);
    }

    const rawLines = chatContent.split('\n');

    // First pass: find all line headers so we can detect the date order.
    const lines = rawLines.map((line) => normalizeSpaces(line.replace(/\r$/, '')));
    const headers = [];
    for (const line of lines) {
      const h = parseHeader(line);
      if (h) headers.push(h);
    }
    const dayFirst = detectDayFirst(headers);

    const chatMessages = [];
    let lastMessage = null;
    let idCounter = 0;

    const pushLast = () => {
      if (lastMessage) chatMessages.push(lastMessage);
    };

    lines.forEach((line) => {
      const header = parseHeader(line);

      if (header) {
        pushLast();
        const { date, time, rest } = header;
        const content = rest.trim();
        const timestamp = buildTimestamp(date, time, dayFirst);

        // A regular message is "Sender: text". A system line has no "Name: ".
        const colonIndex = content.indexOf(': ');
        const looksLikeSender =
          colonIndex > 0 && colonIndex < 60 && !content.startsWith('http');

        if (looksLikeSender) {
          const sender = content.substring(0, colonIndex).trim();
          let messageText = content.substring(colonIndex + 2);

          const attachment = extractAttachment(messageText, files);
          if (attachment) {
            messageText = messageText.replace(attachment.originalText, '').trim();
          }

          const edited = /‎?<This message was edited>\s*$/i.test(messageText);
          if (edited) {
            messageText = messageText.replace(/‎?<This message was edited>\s*$/i, '').trim();
          }

          const deleted =
            /^(this message was deleted|you deleted this message)\.?$/i.test(
              messageText.trim()
            );

          lastMessage = {
            id: idCounter++,
            date,
            time,
            timestamp,
            sender: cleanText(sender),
            message: cleanText(messageText),
            attachment,
            edited,
            deleted,
            type: 'message',
          };
        } else {
          lastMessage = {
            id: idCounter++,
            date,
            time,
            timestamp,
            sender: 'System',
            message: cleanText(content),
            attachment: null,
            type: 'system',
            systemType: getSystemMessageType(content),
          };
        }
      } else if (lastMessage) {
        // Continuation of a multi-line message (blank lines included).
        lastMessage.message = lastMessage.message
          ? `${lastMessage.message}\n${cleanText(line)}`
          : cleanText(line);
      }
    });

    pushLast();
    return chatMessages;
  } catch (error) {
    console.error('Error parsing chat:', error);
    throw new Error(`Failed to parse chat: ${error.message}`);
  }
}

/** Strip invisible isolate characters that wrap mentions. */
function cleanText(text) {
  return text ? text.replace(ISOLATE_CHARS, '') : text;
}

/**
 * Extract attachment information from message text.
 * @param {string} messageText - Message text to analyze
 * @param {Map} files - Map of available files
 * @returns {Object|null} - Attachment info or null
 */
function extractAttachment(messageText, files) {
  if (!messageText) return null;

  // Pattern 1: <attached: filename.ext>  (iOS)
  const attachedMatch = messageText.match(/<attached:\s*([^>]+)>/i);
  if (attachedMatch) {
    return buildAttachment(attachedMatch[1].trim(), attachedMatch[0], files);
  }

  // Pattern 2: "filename (file attached)" / "(image attached)" etc. (Android)
  const fileAttachedMatch = messageText.match(
    /(.+?)\s*\((?:file|image|video|audio|document|sticker|gif)\s+attached\)/i
  );
  if (fileAttachedMatch) {
    return buildAttachment(fileAttachedMatch[1].trim(), fileAttachedMatch[0], files);
  }

  // Pattern 3: bare WhatsApp-style filenames (IMG-/VID-/STK-/AUD-/PTT-/Document-)
  const directFileMatch = messageText.match(
    /\b((?:IMG|VID|STK|AUD|PTT|DOC|GIF)-[\w-]+\.\w+|Document-[\w-]+\.\w+)/i
  );
  if (directFileMatch) {
    return buildAttachment(directFileMatch[1], directFileMatch[1], files);
  }

  return null;
}

function buildAttachment(filename, originalText, files) {
  // `files` is a Set of available filenames; the blob is fetched lazily later.
  if (!files.has(filename)) return null;
  return {
    filename,
    type: getFileType(filename),
    originalText,
  };
}

/**
 * Determine system message type (used for icons / styling).
 */
function getSystemMessageType(message) {
  const m = message.toLowerCase();
  if (m.includes('added') || m.includes('joined')) return 'joined';
  if (m.includes('removed') || m.includes('left')) return 'left';
  if (m.includes('created group') || m.includes('group created')) return 'created';
  if (m.includes('changed the subject') || m.includes('changed the group name'))
    return 'name_changed';
  if (m.includes('changed group description') || m.includes('changed the group description'))
    return 'description_changed';
  if (m.includes("changed this group's icon") || m.includes('group icon changed'))
    return 'icon_changed';
  if (m.includes('end-to-end encrypted')) return 'encryption';
  if (m.includes('deleted') || m.includes('ended')) return 'ended';
  return 'other';
}

/**
 * Determine file type based on filename extension.
 */
export function getFileType(filename) {
  const extension = filename.toLowerCase().split('.').pop();
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'];
  const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'];
  const documentTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];

  if (imageTypes.includes(extension)) return 'image';
  if (videoTypes.includes(extension)) return 'video';
  if (audioTypes.includes(extension)) return 'audio';
  if (documentTypes.includes(extension)) return 'document';
  return 'unknown';
}

/** Escape HTML so message content can't inject markup. */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format message text for display (escapes HTML first, then applies WhatsApp
 * markdown, links, and an optional search highlight).
 * @param {string} text - Raw message text
 * @param {string} [highlight] - Optional term to wrap in <mark>
 * @returns {string} - Safe HTML string
 */
export function formatMessageText(text, highlight = '') {
  if (!text) return '';

  let html = escapeHtml(text)
    // Bold: *text*
    .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
    // Italic: _text_
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough: ~text~
    .replace(/~(.+?)~/g, '<del>$1</del>')
    // Monospace: ```text```
    .replace(/```(.+?)```/g, '<code>$1</code>')
    // Links (escaped & already, so match the entity form)
    .replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/g, (match) => {
      const url = match.startsWith('http') ? match : `https://${match}`;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-300 hover:text-blue-200 hover:underline underline-offset-2 cursor-pointer">${match}</a>`;
    });

  if (highlight) {
    const safe = escapeHtml(highlight).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (safe) {
      html = html.replace(
        new RegExp(`(${safe})`, 'gi'),
        '<mark class="bg-yellow-400 text-black rounded px-0.5">$1</mark>'
      );
    }
  }

  return html.replace(/\n/g, '<br>');
}
