import React, { useMemo, useEffect } from 'react';

/** Compute simple, fully-local chat statistics. */
function computeStats(messages) {
  const perSender = new Map();
  const perDate = new Map();
  const perHour = new Array(24).fill(0);
  let media = 0;
  let firstTs = Infinity;
  let lastTs = -Infinity;

  for (const m of messages) {
    if (m.type === 'system') continue;
    perSender.set(m.sender, (perSender.get(m.sender) || 0) + 1);
    perDate.set(m.date, (perDate.get(m.date) || 0) + 1);
    if (m.attachment) media += 1;
    if (Number.isFinite(m.timestamp)) {
      firstTs = Math.min(firstTs, m.timestamp);
      lastTs = Math.max(lastTs, m.timestamp);
      perHour[new Date(m.timestamp).getHours()] += 1;
    }
  }

  const senders = [...perSender.entries()].sort((a, b) => b[1] - a[1]);
  const total = senders.reduce((s, [, n]) => s + n, 0);
  const busiestDay = [...perDate.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestHour = perHour.indexOf(Math.max(...perHour));

  return {
    total,
    media,
    senders,
    busiestDay,
    busiestHour: Math.max(...perHour) > 0 ? busiestHour : null,
    range:
      firstTs !== Infinity
        ? {
            from: new Date(firstTs).toLocaleDateString(),
            to: new Date(lastTs).toLocaleDateString(),
          }
        : null,
  };
}

function Stat({ label, value }) {
  return (
    <div className="bg-whatsapp-dark rounded-lg p-3">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function StatsPanel({ messages, colorMap, onClose }) {
  const stats = useMemo(() => computeStats(messages), [messages]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const maxSender = stats.senders[0]?.[1] || 1;
  const fmtHour = (h) => `${((h + 11) % 12) + 1}${h < 12 ? 'am' : 'pm'}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-whatsapp-gray rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Chat statistics</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <Stat label="Messages" value={stats.total.toLocaleString()} />
          <Stat label="Media shared" value={stats.media.toLocaleString()} />
          <Stat label="Participants" value={stats.senders.length} />
          <Stat
            label="Busiest hour"
            value={stats.busiestHour !== null ? fmtHour(stats.busiestHour) : '—'}
          />
        </div>

        {stats.range && (
          <p className="text-xs text-gray-400 mb-5">
            {stats.range.from} → {stats.range.to}
            {stats.busiestDay && (
              <>
                {' '}· busiest day {stats.busiestDay[0]} ({stats.busiestDay[1]} msgs)
              </>
            )}
          </p>
        )}

        <h3 className="text-sm font-semibold text-gray-300 mb-2">Messages per person</h3>
        <div className="space-y-2">
          {stats.senders.map(([sender, count]) => (
            <div key={sender}>
              <div className="flex justify-between text-xs text-gray-300 mb-1">
                <span className="truncate mr-2">{sender}</span>
                <span className="text-gray-400">
                  {count.toLocaleString()} ({Math.round((count / stats.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-whatsapp-dark rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(count / maxSender) * 100}%`,
                    backgroundColor: colorMap[sender] || '#6B7280',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
