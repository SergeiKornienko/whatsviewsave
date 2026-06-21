import React from 'react';
import { formatMessageText } from '../utils/chatParser';
import { parsePollMessage } from '../utils/pollParser';
import Poll from './Poll';
import Attachment from './Attachment';

/**
 * Renders a single chat row: a date separator (optional), then either a system
 * notice or a message bubble. Memoized because the virtualized list re-renders
 * frequently while scrolling.
 */
function MessageRow({
  message,
  isOwn,
  groupedWithPrev,
  showDateSeparator,
  userColor,
  getBlob,
  onSelectAttachment,
  highlight,
  isActiveMatch,
}) {
  const isSystem = message.type === 'system';
  const pollData = !isSystem ? parsePollMessage(message.message) : null;
  const hasMedia = message.attachment?.type === 'image' || message.attachment?.type === 'video';
  const caption = message.message.trim();

  const textBlock = (
    <div className="flex items-end justify-end">
      <p
        className="text-sm leading-relaxed flex-1"
        dangerouslySetInnerHTML={{ __html: formatMessageText(message.message, highlight) }}
      />
      <span className={`text-xs ml-2 opacity-70 ${isOwn ? 'text-green-100' : 'text-gray-400'}`}>
        {message.time}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center px-3 sm:px-6 md:px-[8%] xl:px-[10%]">
      {showDateSeparator && (
        <div className="flex justify-center my-4">
          <div className="text-gray-400 text-xs px-3 py-1 bg-whatsapp-header rounded-full">
            {message.date}
          </div>
        </div>
      )}

      {isSystem ? (
        <div className="flex justify-center my-1">
          <div className="text-yellow-200 text-xs px-2 py-1 bg-yellow-900 bg-opacity-30 rounded-full inline-block text-center">
            {message.message}
          </div>
        </div>
      ) : (
        <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${groupedWithPrev ? 'mt-0.5' : 'mt-3'}`}>
          <div
            className={`max-w-[75%] px-3 py-2 rounded-lg ${
              isOwn ? 'bg-whatsapp-green text-white rounded-br-sm' : 'bg-whatsapp-gray text-gray-200 rounded-bl-sm'
            } ${isActiveMatch ? 'ring-2 ring-yellow-400' : ''}`}
            style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', overflowWrap: 'break-word' }}
          >
            {!isOwn && !groupedWithPrev && (
              <p className="text-xs font-semibold mb-1" style={{ color: userColor }}>
                {message.sender}
              </p>
            )}

            {message.deleted ? (
              <p className="text-sm italic text-gray-400">🚫 This message was deleted</p>
            ) : message.message.includes('<Media omitted>') ? (
              <div className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-300">Media omitted</p>
                  <p className="text-xs text-gray-400">This media was not included in the export</p>
                </div>
              </div>
            ) : pollData ? (
              <Poll pollData={pollData} />
            ) : !hasMedia && caption ? (
              textBlock
            ) : null}

            {message.attachment && (
              <div className="mt-1">
                <Attachment
                  attachment={message.attachment}
                  getBlob={getBlob}
                  onSelect={onSelectAttachment}
                  isOwn={isOwn}
                  time={message.time}
                  hasCaption={Boolean(caption)}
                />
              </div>
            )}

            {hasMedia && caption && <div className="mt-2 max-w-xs">{textBlock}</div>}

            {message.edited && (
              <span className="text-[10px] opacity-60 ml-1 align-bottom">edited</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MessageRow);
