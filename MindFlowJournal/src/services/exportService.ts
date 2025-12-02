import { format, parseISO } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import APP_CONFIG from '../config/appConfig';
import { Journal } from '../types';
import { base64ToDataUri } from './imageService';

/**
 * Export journals as JSON with metadata for proper import
 */
export const exportAsJSON = async (journals: Journal[]): Promise<string> => {
  const exportData = {
    version: '1.0',
    appName: APP_CONFIG.displayName,
    exportDate: new Date().toISOString(),
    totalEntries: journals.length,
    journals: journals.map(journal => ({
      id: journal.id,
      date: journal.date,
      createdAt: journal.createdAt,
      updatedAt: journal.updatedAt,
      title: journal.title,
      text: journal.text,
      mood: journal.mood,
      images: journal.images || [],
    })),
  };
  return JSON.stringify(exportData, null, 2);
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
 * Export journals as PDF with embedded images
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
            line-height: 1.6;
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
            line-height: 1.8;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .images-container {
            margin: 15px 0;
            padding: 10px;
            background-color: #fafafa;
            border-radius: 8px;
          }
          .images-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: flex-start;
          }
          .image-wrapper {
            flex: 0 0 auto;
            max-width: 100%;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          .entry-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: block;
            margin: 0 auto;
          }
          .image-caption {
            font-size: 11px;
            color: #666;
            text-align: center;
            margin-top: 5px;
            font-style: italic;
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
          @media print {
            .journal-entry {
              page-break-inside: avoid;
            }
            .image-wrapper {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 ${APP_CONFIG.displayName}</h1>
          <p>Personal Journal Export</p>
          <p style="font-size: 12px; color: #666;">Total Entries: ${journals.length}</p>
          <p style="font-size: 11px; color: #999;">Exported on ${format(new Date(), 'MMMM dd, yyyy - hh:mm a')}</p>
        </div>
  `;

  journals.forEach((journal, index) => {
    const date = format(parseISO(journal.date), 'EEEE, MMMM dd, yyyy - hh:mm a');
    
    // Escape HTML in text content
    const escapedText = journal.text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    htmlContent += `
      <div class="journal-entry">
        <div class="entry-header">
          <div class="entry-date">${date}</div>
          ${journal.title ? `<div class="entry-title">
            ${journal.title
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
        </div>
        <div class="entry-content">${escapedText}</div>
    `;

    // Add images if they exist
    if (journal.images && journal.images.length > 0) {
      htmlContent += `<div class="images-container">`;
      htmlContent += `<div class="images-grid">`;
      
      journal.images.forEach((base64Image, imgIndex) => {
        try {
          // Convert base64 to data URI if needed
          const imageDataUri = base64ToDataUri(base64Image);
          htmlContent += `
            <div class="image-wrapper">
              <img src="${imageDataUri}" alt="Image ${imgIndex + 1}" class="entry-image" />
              <div class="image-caption">Image ${imgIndex + 1} of ${journal.images!.length}</div>
            </div>
          `;
        } catch (error) {
          console.error('Error processing image for PDF:', error);
          htmlContent += `
            <div class="image-wrapper">
              <div class="image-caption">[Image ${imgIndex + 1} could not be loaded]</div>
            </div>
          `;
        }
      });
      
      htmlContent += `</div></div>`;
    }

    htmlContent += `
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
 * On mobile, this opens the share sheet which includes "Save to Files" option
 */
export const shareFile = async (uri: string, filename: string): Promise<void> => {
  if (Platform.OS === 'web') {
    // For web, trigger download
    // Handle both file URIs and data URIs
    let downloadUri = uri;
    if (uri.startsWith('data:')) {
      // Data URI - use as is
      downloadUri = uri;
    } else {
      // File URI - fetch and convert to blob
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        downloadUri = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error fetching file for download:', error);
        // Fallback to direct URI
      }
    }
    
    const link = document.createElement('a');
    link.href = downloadUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL if created
    if (downloadUri.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(downloadUri), 100);
    }
  } else {
    // For mobile, use native share dialog
    // This will show options including "Save to Files" on iOS and "Save" on Android
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        dialogTitle: `Save or Share ${filename}`,
        mimeType: getMimeType(filename),
        UTI: Platform.OS === 'ios' ? getUTI(filename) : undefined,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }
};

/**
 * Get UTI (Uniform Type Identifier) for iOS file sharing
 */
const getUTI = (filename: string): string => {
  if (filename.endsWith('.json')) return 'public.json';
  if (filename.endsWith('.txt')) return 'public.plain-text';
  if (filename.endsWith('.pdf')) return 'com.adobe.pdf';
  return 'public.data';
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
 * Save text file and return the file URI
 * On mobile: saves to Documents directory (accessible via Files app)
 * On web: triggers download and returns data URI
 */
export const saveTextFile = async (content: string, filename: string): Promise<string> => {
  if (Platform.OS === 'web') {
    // For web, trigger download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    // Return a data URI for consistency
    return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
  } else {
    // For mobile, save to Documents directory (accessible via Files app)
    // Prefer documentDirectory as it's user-accessible
    const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${documentDir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return fileUri;
  }
};

/**
 * Save file to a shareable location and return the file URI
 * This ensures the file is accessible for sharing/saving
 */
export const saveFileForSharing = async (content: string, filename: string, mimeType: string): Promise<string> => {
  if (Platform.OS === 'web') {
    // For web, trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  } else {
    // For mobile, save to Documents directory
    const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${documentDir}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return fileUri;
  }
};

/**
 * Download text as file (web only) - kept for backward compatibility
 * @deprecated Use saveTextFile instead
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
