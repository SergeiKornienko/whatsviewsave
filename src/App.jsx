import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ZipHandler } from './utils/zipHandler';
import { parseChat } from './utils/chatParser';
import { createColorMap } from './utils/colors';
import Uploader from './components/Uploader';
import ChatView from './components/ChatView';
import AttachmentViewer from './components/AttachmentViewer';
import StatsPanel from './components/StatsPanel';
import { generateHTML } from './generateHTML.js';
import { exportChatToZip } from './exportZip.js';

const ME_STORAGE_KEY = 'whatsview:me';

/**
 * Best-effort guess of which participant is the user.
 * Only attempted for 1:1 chats, where the export filename ("WhatsApp Chat with
 * <other person>") reliably names the other side — so "you" is the participant
 * that isn't them. Group chats give no trustworthy signal, so we don't guess.
 */
function guessMe(senders, chatFileName) {
  if (senders.length !== 2 || !chatFileName) return '';
  const other = chatFileName
    .replace(/\.txt$/i, '')
    .replace(/^.*chat with\s*/i, '')
    .trim();
  // Only trust the guess if the named "other" actually matches a participant.
  if (!other || !senders.includes(other)) return '';
  return senders.find((s) => s !== other) || '';
}

/** Ghost icon button used in the header (renders as <a> when href is given). */
function HeaderButton({ title, onClick, href, children }) {
  const cls =
    'w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors shrink-0';
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" title={title} className={cls}>
      {children}
    </a>
  ) : (
    <button onClick={onClick} title={title} className={cls}>
      {children}
    </button>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);
  const [zipHandler, setZipHandler] = useState(null);

  const [me, setMe] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const chatViewRef = useRef(null);

  const participants = useMemo(
    () => [...new Set(messages.map((m) => m.sender).filter((s) => s && s !== 'System'))],
    [messages]
  );
  const colorMap = useMemo(() => createColorMap(participants), [participants]);

  // Search matches (indices into messages).
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const result = [];
    messages.forEach((m, i) => {
      if (m.message.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q)) {
        result.push(i);
      }
    });
    return result;
  }, [query, messages]);

  useEffect(() => {
    setActiveMatch(0);
    if (matches.length > 0) chatViewRef.current?.scrollToIndex(matches[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const goToMatch = useCallback(
    (dir) => {
      if (matches.length === 0) return;
      const next = (activeMatch + dir + matches.length) % matches.length;
      setActiveMatch(next);
      chatViewRef.current?.scrollToIndex(matches[next]);
    },
    [activeMatch, matches]
  );

  const getBlob = useCallback(
    (filename, mimeType) =>
      zipHandler ? zipHandler.getBlob(filename, mimeType) : Promise.resolve(null),
    [zipHandler]
  );

  const handleFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a ZIP file.');
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const handler = new ZipHandler();
      const { chatText, fileNames, chatFileName } = await handler.loadZipFile(file);
      const parsed = parseChat(chatText, fileNames);
      if (parsed.length === 0) {
        throw new Error('No messages could be read from this chat export.');
      }

      const senders = [...new Set(parsed.map((m) => m.sender).filter((s) => s && s !== 'System'))];
      const savedMe = localStorage.getItem(ME_STORAGE_KEY);

      setMessages(parsed);
      setZipHandler(handler);
      // Prefer a previously chosen name; otherwise guess for 1:1 chats only.
      setMe(senders.includes(savedMe) ? savedMe : guessMe(senders, chatFileName));
      setChatLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelectMe = (value) => {
    setMe(value);
    if (value) localStorage.setItem(ME_STORAGE_KEY, value);
  };

  const handleReset = () => {
    zipHandler?.cleanup();
    setMessages([]);
    setChatLoaded(false);
    setZipHandler(null);
    setSelectedAttachment(null);
    setShowStats(false);
    setQuery('');
    setError(null);
  };

  // Функция экспорта в HTML (только HTML, без медиа)
  const handleExportHTML = useCallback(() => {
    if (!messages || messages.length === 0) {
      alert('Сначала загрузите чат!');
      return;
    }

    try {
      const htmlContent = generateHTML(messages, me);
      
      const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString().slice(0,10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      setError('Не удалось экспортировать чат: ' + err.message);
    }
  }, [messages, me]);

  // НОВАЯ ФУНКЦИЯ: экспорт в ZIP с заменой _chat.txt на chat.html
  const handleExportZIP = useCallback(async () => {
    if (!messages || messages.length === 0) {
      alert('Сначала загрузите чат!');
      return;
    }

    if (!zipHandler) {
      alert('Нет данных ZIP-архива!');
      return;
    }

    try {
      setIsBusy(true);
      
      // Получаем исходный ZIP-архив как ArrayBuffer
      const originalZipData = await zipHandler.getOriginalZipData();
      
      // Создаём новый ZIP с заменой _chat.txt на chat.html
      const newZipBlob = await exportChatToZip(
        messages,
        me,
        originalZipData,
        zipHandler.chatFileName
      );
      
      // Скачиваем
      const url = URL.createObjectURL(newZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsBusy(false);
    } catch (err) {
      console.error('Ошибка экспорта ZIP:', err);
      setError('Не удалось экспортировать чат: ' + err.message);
      setIsBusy(false);
    }
  }, [messages, me, zipHandler]);

  return (
    <div className="flex flex-col h-screen w-screen bg-whatsapp-dark text-white">
      <header className="h-14 px-3 sm:px-4 bg-whatsapp-header border-b border-black/30 flex items-center gap-3 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-whatsapp-green flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div className="leading-tight min-w-0">
            <h1 className="font-semibold text-white text-[15px]">WhatsView</h1>
            <p className="text-[11px] text-gray-400 truncate">
              {chatLoaded
                ? `${messages.length.toLocaleString()} messages · ${participants.length} ${
                    participants.length === 1 ? 'person' : 'people'
                  }`
                : 'Local chat viewer'}
            </p>
          </div>
        </div>

        {chatLoaded && (
          <>
            {/* Search */}
            <div className="flex items-center gap-2 bg-whatsapp-dark rounded-lg h-9 px-3 ml-1 flex-1 max-w-sm min-w-[9rem] focus-within:ring-1 focus-within:ring-whatsapp-green">
              <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && goToMatch(e.shiftKey ? -1 : 1)}
                placeholder="Search messages"
                className="bg-transparent text-sm text-gray-200 flex-1 outline-none placeholder-gray-500 min-w-0"
              />
              {query && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="text-xs text-gray-400 tabular-nums mr-1">
                    {matches.length ? `${activeMatch + 1}/${matches.length}` : '0'}
                  </span>
                  <button onClick={() => goToMatch(-1)} title="Previous (Shift+Enter)" className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30" disabled={!matches.length}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button onClick={() => goToMatch(1)} title="Next (Enter)" className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30" disabled={!matches.length}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1 shrink-0">
              {/* Who am I */}
              <label
                className="hidden sm:flex items-center gap-1.5 h-9 pl-2.5 pr-2 rounded-lg bg-whatsapp-dark hover:bg-white/5 cursor-pointer"
                title="Whose messages should appear as yours"
              >
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" />
                </svg>
                <select
                  value={me}
                  onChange={(e) => handleSelectMe(e.target.value)}
                  className="appearance-none bg-transparent text-sm text-gray-200 outline-none cursor-pointer max-w-[9rem] pr-4"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%239ca3af' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right center',
                    backgroundSize: '0.9rem',
                  }}
                >
                  <option value="">Set “you”…</option>
                  {participants.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <HeaderButton title="Chat statistics" onClick={() => setShowStats(true)}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </HeaderButton>

              {/* Кнопка экспорта в HTML (без медиа) */}
              <HeaderButton title="Export as HTML" onClick={handleExportHTML}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
                </svg>
              </HeaderButton>

              {/* НОВАЯ КНОПКА: экспорт в ZIP с заменой _chat.txt на chat.html */}
              <HeaderButton title="Export as ZIP (with media)" onClick={handleExportZIP}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.422-2.374-1.2-3.3M12 4.5v15m0 0l-3-3m3 3l3-3M4.5 12c0-1.232.422-2.374 1.2-3.3" />
                </svg>
              </HeaderButton>

              <HeaderButton title="Open another chat" onClick={handleReset}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
                </svg>
              </HeaderButton>

              <span className="w-px h-5 bg-white/10 mx-1" />
              <HeaderButton title="Source code" href="https://github.com/pranavkale07/whatsview">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </HeaderButton>
            </div>
          </>
        )}

        {!chatLoaded && (
          <div className="ml-auto">
            <HeaderButton title="Source code" href="https://github.com/pranavkale07/whatsview">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
            </HeaderButton>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        {!chatLoaded ? (
          <div className="h-full overflow-y-auto">
            <Uploader onFile={handleFile} isBusy={isBusy} error={error} onDismissError={() => setError(null)} />
          </div>
        ) : (
          <ChatView
            ref={chatViewRef}
            messages={messages}
            colorMap={colorMap}
            me={me}
            getBlob={getBlob}
            onSelectAttachment={setSelectedAttachment}
            highlight={query.trim()}
            activeMatchIndex={matches[activeMatch]}
          />
        )}
      </main>

      {selectedAttachment && (
        <AttachmentViewer attachment={selectedAttachment} getBlob={getBlob} onClose={() => setSelectedAttachment(null)} />
      )}
      {showStats && <StatsPanel messages={messages} colorMap={colorMap} onClose={() => setShowStats(false)} />}
    </div>
  );
}

export default App;