import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import MessageRow from './MessageRow';
import backgroundImage from '../assets/bg-dark-BnMQztzI.png';

/**
 * Virtualized message list. Only the rows currently on screen are mounted,
 * which keeps the app responsive for chats with tens of thousands of messages.
 *
 * Exposes `scrollToIndex(index)` via ref for search navigation.
 */
const ChatView = forwardRef(function ChatView(
  { messages, colorMap, me, getBlob, onSelectAttachment, highlight, activeMatchIndex },
  ref
) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 12,
  });

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index) =>
      virtualizer.scrollToIndex(index, { align: 'center', behavior: 'auto' }),
  }));

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="w-full h-full overflow-y-auto bg-whatsapp-dark"
      style={{
        backgroundImage: `url("${backgroundImage}")`,
        backgroundRepeat: 'repeat',
      }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {items.map((virtualRow) => {
          const message = messages[virtualRow.index];
          const prev = messages[virtualRow.index - 1];
          const isOwn = me && message.sender === me;
          const groupedWithPrev =
            prev &&
            prev.sender === message.sender &&
            prev.date === message.date &&
            message.type !== 'system' &&
            prev.type !== 'system';
          const showDateSeparator = !prev || prev.date !== message.date;

          return (
            <div
              key={message.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="py-0.5"
            >
              <MessageRow
                message={message}
                isOwn={isOwn}
                groupedWithPrev={groupedWithPrev}
                showDateSeparator={showDateSeparator}
                userColor={colorMap[message.sender] || '#6B7280'}
                getBlob={getBlob}
                onSelectAttachment={onSelectAttachment}
                highlight={highlight}
                isActiveMatch={virtualRow.index === activeMatchIndex}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default ChatView;
