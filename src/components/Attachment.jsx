import React from 'react';
import { useBlobUrl } from '../hooks/useBlobUrl';

const typeIcon = {
  video: '🎥',
  audio: '🎵',
  document: '📄',
  image: '🖼️',
  unknown: '📎',
};

/** Small timestamp chip overlaid on media that has no caption. */
function TimeOverlay({ time, isOwn }) {
  return (
    <div
      className={`absolute bottom-2 right-2 px-2 py-1 rounded text-xs opacity-80 bg-black bg-opacity-50 ${
        isOwn ? 'text-green-100' : 'text-gray-300'
      }`}
    >
      {time}
    </div>
  );
}

/**
 * Renders an inline attachment. Media is fetched lazily from the ZIP via
 * `getBlob`. Clicking an image/video/document opens the full-screen viewer.
 */
function Attachment({ attachment, getBlob, onSelect, isOwn, time, hasCaption }) {
  const isSticker = /^STK[-_]/i.test(attachment.filename);
  const url = useBlobUrl(getBlob, attachment.filename);

  if (attachment.type === 'image') {
    return (
      <div
        className={`cursor-pointer rounded-lg overflow-hidden relative ${
          isSticker ? 'max-w-[8rem] bg-transparent' : 'max-w-xs'
        }`}
        onClick={() => onSelect(attachment)}
      >
        {url ? (
          <img
            src={url}
            alt={attachment.filename}
            className="w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-48 h-32 bg-gray-700 rounded-lg animate-pulse" />
        )}
        {!hasCaption && !isSticker && url && <TimeOverlay time={time} isOwn={isOwn} />}
      </div>
    );
  }

  if (attachment.type === 'video') {
    return (
      <div
        className="cursor-pointer rounded-lg overflow-hidden max-w-xs relative group"
        onClick={() => onSelect(attachment)}
      >
        {url ? (
          <video src={url} className="w-full h-auto rounded-lg" preload="metadata" />
        ) : (
          <div className="w-48 h-32 bg-gray-700 rounded-lg animate-pulse" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-40 transition-all">
          <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {!hasCaption && url && <TimeOverlay time={time} isOwn={isOwn} />}
      </div>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <div className="min-w-[14rem]">
        {url ? (
          <audio src={url} controls className="w-full h-10" />
        ) : (
          <div className="w-56 h-10 bg-gray-700 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  // Documents and unknown types: a clickable card that opens the viewer.
  return (
    <div
      className="p-2 bg-black bg-opacity-20 rounded cursor-pointer hover:bg-opacity-30 transition-colors"
      onClick={() => onSelect(attachment)}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{typeIcon[attachment.type] || typeIcon.unknown}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{attachment.filename}</p>
          <p className="text-xs text-gray-400 capitalize">{attachment.type}</p>
        </div>
        <span className="text-xs text-gray-500">Click to view</span>
      </div>
    </div>
  );
}

export default Attachment;
