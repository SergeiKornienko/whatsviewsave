// src/generateHTML.js

/**
 * Экранирует HTML-символы для безопасной вставки
 */
 function escapeHtml(text) {
	if (!text) return '';
	return text
	  .replace(/&/g, '&amp;')
	  .replace(/</g, '&lt;')
	  .replace(/>/g, '&gt;')
	  .replace(/"/g, '&quot;')
	  .replace(/'/g, '&#39;');
  }
  
  /**
   * Форматирует текст сообщения с поддержкой маркдауна WhatsApp
   */
  function formatMessageText(text) {
	if (!text) return '';
	
	let html = escapeHtml(text)
	  .replace(/\*(.+?)\*/g, '<strong>$1</strong>')
	  .replace(/_(.+?)_/g, '<em>$1</em>')
	  .replace(/~(.+?)~/g, '<del>$1</del>')
	  .replace(/```(.+?)```/g, '<code>$1</code>')
	  .replace(/(https?:\/\/[^\s]+|www\.[^\s]+)/g, (match) => {
		const url = match.startsWith('http') ? match : `https://${match}`;
		return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #53bdeb; text-decoration: underline;">${match}</a>`;
	  });
	
	return html.replace(/\n/g, '<br>');
  }
  
  /**
   * Определяет тип файла по расширению
   */
  function getFileType(filename) {
	const ext = filename.toLowerCase().split('.').pop();
	const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
	const videos = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'];
	const audios = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'opus'];
	const docs = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
	
	if (images.includes(ext)) return 'image';
	if (videos.includes(ext)) return 'video';
	if (audios.includes(ext)) return 'audio';
	if (docs.includes(ext)) return 'document';
	return 'unknown';
  }
  
  /**
   * Создаёт карту цветов для отправителей
   */
  function createColorMap(senders) {
	const colors = [
	  '#53bdeb', '#f28b82', '#fbbc04', '#34a853', '#ea4335',
	  '#4285f4', '#a142f4', '#00acc1', '#ff6d00', '#d50000',
	  '#00c853', '#ffab00', '#6200ea', '#e040fb', '#00bcd4'
	];
	const map = {};
	senders.forEach((s, i) => {
	  map[s] = colors[i % colors.length];
	});
	return map;
  }
  
  /**
   * Генерирует HTML-представление медиа (без папки media/)
   */
  function renderAttachment(attachment) {
	if (!attachment) return '';
	
	const type = getFileType(attachment.filename);
	// ИСПРАВЛЕНО: файлы в корне, без папки media/
	const filePath = attachment.filename;
	
	switch (type) {
	  case 'image':
		return `<div class="attachment-image"><img src="${filePath}" alt="${attachment.filename}" loading="lazy"></div>`;
	  case 'video':
		return `<div class="attachment-video"><video controls src="${filePath}" style="max-width:100%; max-height:400px; border-radius:8px;"></video></div>`;
	  case 'audio':
		return `<div class="attachment-audio"><audio controls src="${filePath}" style="width:100%;"></audio></div>`;
	  case 'document':
		return `<div class="attachment-document">📄 <a href="${filePath}" target="_blank" style="color: #53bdeb;">${escapeHtml(attachment.filename)}</a></div>`;
	  default:
		return `<div class="attachment-unknown">📎 ${escapeHtml(attachment.filename)}</div>`;
	}
  }
  
  /**
   * Генерирует полный HTML-файл чата
   * @param {Array} messages - Массив сообщений из парсера
   * @param {string} me - Имя текущего пользователя
   * @returns {string} - Полный HTML-код
   */
  export function generateHTML(messages, me = '') {
	if (!messages || messages.length === 0) {
	  return `<!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><title>Экспорт чата</title></head>
  <body><p>Нет сообщений для экспорта</p></body>
  </html>`;
	}
  
	const senders = [...new Set(messages.map(m => m.sender).filter(s => s && s !== 'System'))];
	const colorMap = createColorMap(senders);
  
	function getColor(sender) {
	  return colorMap[sender] || '#6B7280';
	}
  
	let lastDate = '';
	let messagesHTML = '';
  
	messages.forEach((msg) => {
	  const isOwn = me && msg.sender === me;
	  const isSystem = msg.type === 'system';
	  
	  const showDate = msg.date !== lastDate;
	  lastDate = msg.date;
	  
	  if (showDate) {
		messagesHTML += `
		  <div class="date-separator">
			<span>${escapeHtml(msg.date)}</span>
		  </div>
		`;
	  }
	  
	  if (isSystem) {
		messagesHTML += `
		  <div class="system-message">
			<span>${escapeHtml(msg.message)}</span>
		  </div>
		`;
		return;
	  }
	  
	  const messageText = formatMessageText(msg.message);
	  const hasAttachment = msg.attachment && msg.attachment.filename;
	  const time = msg.time || '';
	  
	  messagesHTML += `
		<div class="message-wrapper ${isOwn ? 'own' : 'other'}">
		  <div class="message">
			${!isOwn ? `<div class="sender" style="color: ${getColor(msg.sender)};">${escapeHtml(msg.sender)}</div>` : ''}
			<div class="text">${messageText}</div>
			${hasAttachment ? renderAttachment(msg.attachment) : ''}
			<div class="time">${escapeHtml(time)}</div>
		  </div>
		</div>
	  `;
	});
  
	return `<!DOCTYPE html>
  <html lang="ru">
  <head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>WhatsApp Chat Export</title>
	<style>
	  * { margin: 0; padding: 0; box-sizing: border-box; }
	  body {
		background: #0a0a0a;
		color: #e5e5e5;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		padding: 20px;
		min-height: 100vh;
		display: flex;
		justify-content: center;
	  }
	  .chat-container {
		max-width: 900px;
		width: 100%;
		padding: 16px 0;
	  }
	  .chat-header {
		text-align: center;
		padding: 16px 0 24px 0;
		border-bottom: 1px solid #2a2a2a;
		margin-bottom: 20px;
	  }
	  .chat-header h1 { font-size: 20px; font-weight: 600; color: #e5e5e5; }
	  .chat-header p { font-size: 13px; color: #888; margin-top: 4px; }
	  .date-separator { text-align: center; margin: 16px 0 12px 0; }
	  .date-separator span {
		background: #1f2c33;
		color: #aebac1;
		font-size: 12px;
		font-weight: 500;
		padding: 4px 12px;
		border-radius: 8px;
		display: inline-block;
	  }
	  .system-message { text-align: center; margin: 8px 0; }
	  .system-message span {
		background: #1f2c33;
		color: #aebac1;
		font-size: 12px;
		padding: 4px 12px;
		border-radius: 8px;
		display: inline-block;
		opacity: 0.8;
	  }
	  .message-wrapper { display: flex; margin: 2px 0; padding: 0 8px; }
	  .message-wrapper.own { justify-content: flex-end; }
	  .message-wrapper.other { justify-content: flex-start; }
	  .message {
		max-width: 75%;
		padding: 6px 10px 4px 10px;
		border-radius: 8px;
		word-wrap: break-word;
		background: #1f2c33;
	  }
	  .message-wrapper.own .message { background: #005c4b; }
	  .message-wrapper.other .message { background: #1f2c33; }
	  .message .sender { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
	  .message .text { font-size: 14px; line-height: 1.5; color: #e5e5e5; }
	  .message .text strong { font-weight: 600; }
	  .message .text em { font-style: italic; }
	  .message .text del { text-decoration: line-through; opacity: 0.7; }
	  .message .text code {
		background: rgba(255, 255, 255, 0.08);
		padding: 1px 6px;
		border-radius: 4px;
		font-family: 'SF Mono', 'Consolas', monospace;
		font-size: 13px;
	  }
	  .message .text a {
		color: #53bdeb;
		text-decoration: underline;
		word-break: break-all;
	  }
	  .message .time { font-size: 10px; color: #8e9aa3; text-align: right; margin-top: 2px; }
	  .message-wrapper.own .message .time { color: #8e9aa3; }
	  .attachment-image { margin-top: 6px; }
	  .attachment-image img { 
		max-width: 100%; 
		max-height: 400px; 
		border-radius: 8px; 
		display: block;
		background: #1a1a1a;
	  }
	  .attachment-video { margin-top: 6px; }
	  .attachment-audio { margin-top: 6px; }
	  .attachment-document { margin-top: 4px; font-size: 13px; padding: 4px 0; }
	  .attachment-document a { color: #53bdeb; text-decoration: underline; }
	  .attachment-unknown { margin-top: 4px; font-size: 13px; color: #8e9aa3; }
	  .chat-footer {
		text-align: center;
		padding: 24px 0 8px 0;
		border-top: 1px solid #2a2a2a;
		margin-top: 20px;
		color: #555;
		font-size: 12px;
	  }
	  @media (max-width: 600px) {
		body { padding: 10px; }
		.message { max-width: 85%; }
		.message .text { font-size: 13px; }
	  }
	</style>
  </head>
  <body>
	<div class="chat-container">
	  <div class="chat-header">
		<h1>💬 WhatsApp Chat</h1>
		<p>${messages.length} сообщений · ${senders.length} участников</p>
	  </div>
	  ${messagesHTML}
	  <div class="chat-footer">
		Экспортировано из WhatsView · ${new Date().toLocaleString()}
	  </div>
	</div>
  </body>
  </html>`;
  }