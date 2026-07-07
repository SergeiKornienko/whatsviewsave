// src/exportZip.js
import JSZip from 'jszip';
import { generateHTML } from './generateHTML.js';

/**
 * Экспортирует чат в ZIP-архив, заменяя _chat.txt на chat.html
 * @param {Array} messages - Массив сообщений
 * @param {string} me - Имя текущего пользователя
 * @param {ArrayBuffer} originalZipData - Исходный ZIP-архив как ArrayBuffer
 * @param {string} chatFileName - Имя файла чата (из zipHandler)
 * @returns {Promise<Blob>} - Новый ZIP-архив как Blob
 */
export async function exportChatToZip(messages, me, originalZipData, chatFileName) {
  try {
    // Загружаем исходный ZIP
    const zip = await JSZip.loadAsync(originalZipData);
    
    // Генерируем HTML
    const htmlContent = generateHTML(messages, me);
    
    // === ОТЛАДКА: показываем все файлы в архиве ===
    const allFiles = Object.keys(zip.files);
    console.log('Все файлы в архиве:', allFiles.slice(0, 30));
    
    // === ИЩЕМ ФАЙЛ ЧАТА ===
    let chatFilePath = null;
    
    // 1. Сначала пробуем по имени из zipHandler (это полный путь, например "WhatsApp Chat/_chat.txt")
    if (chatFileName && zip.files[chatFileName]) {
      chatFilePath = chatFileName;
      console.log('Нашли по chatFileName:', chatFilePath);
    }
    
    // 2. Ищем в корне
    if (!chatFilePath && zip.files['_chat.txt']) {
      chatFilePath = '_chat.txt';
      console.log('Нашли _chat.txt в корне');
    }
    
    // 3. Ищем в папке WhatsApp Chat/
    if (!chatFilePath && zip.files['WhatsApp Chat/_chat.txt']) {
      chatFilePath = 'WhatsApp Chat/_chat.txt';
      console.log('Нашли в WhatsApp Chat/');
    }
    
    // 4. Ищем в папке WhatsApp Chat -/
    if (!chatFilePath && zip.files['WhatsApp Chat - _chat.txt']) {
      chatFilePath = 'WhatsApp Chat - _chat.txt';
      console.log('Нашли в WhatsApp Chat -/');
    }
    
    // 5. Ищем любой файл, заканчивающийся на _chat.txt
    if (!chatFilePath) {
      const chatFile = allFiles.find(name => name.endsWith('_chat.txt'));
      if (chatFile) {
        chatFilePath = chatFile;
        console.log('Нашли по _chat.txt:', chatFilePath);
      }
    }
    
    // 6. Ищем любой .txt файл (не в папке media/)
    if (!chatFilePath) {
      const txtFile = allFiles.find(name => 
        name.endsWith('.txt') && 
        !name.includes('/media/') && 
        !name.includes('media/')
      );
      if (txtFile) {
        chatFilePath = txtFile;
        console.log('Нашли по .txt:', chatFilePath);
      }
    }
    
    // 7. Если всё ещё не нашли, просто берём первый .txt файл
    if (!chatFilePath) {
      const firstTxt = allFiles.find(name => name.endsWith('.txt'));
      if (firstTxt) {
        chatFilePath = firstTxt;
        console.log('Взяли первый .txt:', chatFilePath);
      }
    }
    
    if (!chatFilePath) {
      console.error('Доступные файлы в архиве:', allFiles);
      throw new Error('Не найден файл чата (_chat.txt или .txt) в архиве');
    }
    
    console.log('✅ Используем файл чата:', chatFilePath);
    
    // === ЗАМЕНЯЕМ ФАЙЛ ===
    // Удаляем старый файл чата
    zip.remove(chatFilePath);
    
    // Определяем папку для нового файла
    const folderPath = chatFilePath.includes('/') 
      ? chatFilePath.substring(0, chatFilePath.lastIndexOf('/') + 1) 
      : '';
    
    // Добавляем новый chat.html в ту же папку
    zip.file(`${folderPath}chat.html`, htmlContent);
    console.log(`✅ Добавлен ${folderPath}chat.html`);
    
    // Генерируем новый ZIP
    console.log('Генерация ZIP...');
    const result = await zip.generateAsync({ type: 'blob' });
    console.log('✅ ZIP создан! Размер:', result.size);
    
    return result;
    
  } catch (error) {
    console.error('Ошибка при создании ZIP:', error);
    throw error;
  }
}