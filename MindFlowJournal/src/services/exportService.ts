import { format, parseISO } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Journal } from '../types';
import APP_CONFIG from '../config/appConfig';

/**
 * Export journals as JSON
 */
export const exportAsJSON = async (journals: Journal[]): Promise<string> => {
  const jsonData = JSON.stringify(journals, null, 2);
  return jsonData;
};

/**
 * Export journals as plain text
 */
export const exportAsText = async (journals: Journal[]): Promise<string> => {
  let textContent = `${APP_CONFIG.displayName} Export\n`;
  textContent += '='.repeat(50) + '\n\n';

  journals.forEach((journal, index) => {
    const date = format(parseISO(journal.date), 'EEEE, MMMM dd, yyyy - hh:mm a');
    textContent += `Entry ${index + 1}\n`;
    textContent += `Date: ${date}\n`;
    if (journal.title) {
      textContent += `Title: ${journal.title}\n`;
    }
    textContent += `\n${journal.text}\n`;
    if (journal.images && journal.images.length > 0) {
      textContent += `\n[${journal.images.length} image(s) attached]\n`;
    }
    textContent += '\n' + '-'.repeat(50) + '\n\n';
  });

  return textContent;
};

/**
 * Export journals as PDF
 */
export const exportAsPDF = async (journals: Journal[]): Promise<string> => {
  let htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #6200EE;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #6200EE;
            margin: 0;
          }
          .journal-entry {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .entry-header {
            background-color: #f5f5f5;
            padding: 15px;
            border-left: 4px solid #6200EE;
            margin-bottom: 15px;
          }
          .entry-date {
            font-weight: bold;
            color: #6200EE;
            font-size: 14px;
          }
          .entry-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 5px;
            color: #333;
          }
          .entry-content {
            padding: 15px;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          .entry-footer {
            font-size: 12px;
            color: #666;
            font-style: italic;
            margin-top: 10px;
          }
          .divider {
            border-top: 1px solid #e0e0e0;
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 ${APP_CONFIG.displayName}</h1>
          <p>Personal Journal Export</p>
          <p style="font-size: 12px; color: #666;">Total Entries: ${journals.length}</p>
        </div>
  `;

  journals.forEach((journal, index) => {
    const date = format(parseISO(journal.date), 'EEEE, MMMM dd, yyyy - hh:mm a');
    
    htmlContent += `
      <div class="journal-entry">
        <div class="entry-header">
          <div class="entry-date">${date}</div>
          ${journal.title ? `<div class="entry-title">${journal.title}</div>` : ''}
        </div>
        <div class="entry-content">${journal.text}</div>
        ${journal.images && journal.images.length > 0 
          ? `<div class="entry-footer">${journal.images.length} image(s) attached</div>` 
          : ''}
      </div>
      ${index < journals.length - 1 ? '<div class="divider"></div>' : ''}
    `;
  });

  htmlContent += `
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html: htmlContent });
  return uri;
};

/**
 * Share file using native share dialog
 */
export const shareFile = async (uri: string, filename: string): Promise<void> => {
  if (Platform.OS === 'web') {
    // For web, trigger download
    const link = document.createElement('a');
    link.href = uri;
    link.download = filename;
    link.click();
  } else {
    // For mobile, use native share
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `Share ${filename}`,
        mimeType: getMimeType(filename),
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }
};

/**
 * Get MIME type from filename
 */
const getMimeType = (filename: string): string => {
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.txt')) return 'text/plain';
  if (filename.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
};

/**
 * Download text as file (web only)
 */
export const downloadTextFile = (content: string, filename: string): void => {
  if (Platform.OS !== 'web') return;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
