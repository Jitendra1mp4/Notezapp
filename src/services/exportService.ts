import { format, formatDate, parseISO } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { marked } from "marked";
import { Platform } from "react-native";
import { MOOD_OPTIONS } from "../components/journal/MoodSelector";
import APP_CONFIG from "../config/appConfig";
import { PDF_EXPORT_STYLESHEET } from "../config/PDF_EXPORT_STYLESHEET";
import { Journal } from "../types";
import { EncryptedBackupPayload } from "../types/crypto";
import getCryptoProvider from "./cryptoServiceProvider";
import { base64ToDataUri } from "./imageService";

/**
 * Export journals as JSON with metadata for proper import
 */
export const exportAsJSON = async (journals: Journal[]): Promise<string> => {
  const exportData = {
    version: "1.0",
    appName: APP_CONFIG.displayName,
    exportDate: new Date().toISOString(),
    totalEntries: journals.length,
    journals: journals.map((journal) => ({
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

function markdownToHtml(md: string) {
  // Good defaults for journals
  marked.setOptions({
    gfm: true,
    breaks: true, // treat single \n as <br>
  });

  return marked.parse(md);
}

/**
 * Export journals as an Encrypted JSON Backup
 */
export const exportAsEncryptedBackup = async (
  journals: Journal[], 
  password: string
): Promise<string> => {
  const CryptoManager = getCryptoProvider();

  // 1. Create the plain data object
  const plainData = {
    version: "1.0",
    appName: APP_CONFIG.displayName,
    exportDate: new Date().toISOString(),
    totalEntries: journals.length,
    journals: journals,
  };

  const plainString = JSON.stringify(plainData);

  // 2. Encrypt it
  const { content, salt, iv } = await CryptoManager.encryptStringWithPassword(
    password, 
    plainString
  );

  // 3. Create the final wrapper structure
  const backupPayload: EncryptedBackupPayload = {
    version: 1,
    type: 'encrypted_backup',
    appName: APP_CONFIG.displayName,
    exportDate: new Date().toISOString(),
    salt,
    iv,
    data: content // Base64
  };

  return JSON.stringify(backupPayload, null, 2);
};



// Add this to src/services/exportService.ts

/**
 * Unified function to handle file generation based on format
 */
export const generateExportFile = async (
  format: 'json' | 'pdf' | 'text' | 'encrypted',
  journals: Journal[],
  password?: string
): Promise<{ uri: string; filename: string }> => {
  
  const timestamp = formatDate(new Date(), 'yyyy-MM-dd-HHmmss');
  let filename = '';
  let content = '';
  let uri = '';

  switch (format) {
    case 'encrypted':
      if (!password) throw new Error('Password required for encryption.');
      filename = `${APP_CONFIG.slug.toLowerCase()}-export-${timestamp}.enc.json`;
      content = await exportAsEncryptedBackup(journals, password);
      uri = await saveTextFile(content, filename);
      break;

    case 'json':
      filename = `${APP_CONFIG.slug.toLowerCase()}-export-${timestamp}.json`;
      content = await exportAsJSON(journals);
      uri = await saveTextFile(content, filename);
      break;

    case 'text':
      filename = `${APP_CONFIG.slug.toLowerCase()}-export-${timestamp}.md`;
      content = await exportAsMarkdown(journals);
      uri = await saveTextFile(content, filename);
      break;

    case 'pdf':
      filename = `${APP_CONFIG.slug.toLowerCase()}-export-${timestamp}.pdf`;
      uri = await exportAsPDF(journals);
      break;
    
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return { uri, filename };
};

/**
 * Export journals as plain markdown
 */
export const exportAsMarkdown = async (
  journals: Journal[],
): Promise<string> => {
  let markdownContent = `${APP_CONFIG.displayName} Export\n`;
  markdownContent += "=".repeat(40) + "\n\n";

  journals.forEach((journal, index) => {
    const date = format(
      parseISO(journal.date),
      "EEEE, MMMM dd, yyyy - hh:mm a",
    );
    if (journal.title) {
      markdownContent += `# Title: ${journal.title}\n`;
    }
    markdownContent += `*Entry ${index + 1}*\n`;
    markdownContent += `*Date: ${date}*\n`;

     if (journal.mood) {
        const moodOption = MOOD_OPTIONS.find(m => m.value === journal.mood);
        if (moodOption) {
          markdownContent += `${moodOption.emoji} Mood: ${moodOption.label}\n`;
        }
      }

    markdownContent += `\n${journal.text}\n`;

    if (journal.images && journal.images.length > 0) {
      markdownContent += `\n[${journal.images.length} image(s) attached]\n`;
    }
    markdownContent += "\n" + "-".repeat(40) + "\n\n";
  });

  return markdownContent;
};

/**
 * Export journals as PDF with embedded images
 */
export const exportAsPDF = async (journals: Journal[]): Promise<string> => {
  let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_CONFIG.displayName} - Journal Export</title>
   ${PDF_EXPORT_STYLESHEET}
</head>
<body>`;

  // Document Header
  const exportDate = format(new Date(), "MMMM dd, yyyy");
  const exportTime = format(new Date(), "hh:mm a");

  htmlContent += `
  <div class="document-header">
    <h1>${APP_CONFIG.displayName}</h1>
    <p style="color: #9aa0a6; margin-top: 2px; font-size: 12px;">Journal Export</p>
    <div class="document-meta">
      <div class="meta-item">
        <span class="meta-label">📅</span>
        <span>${exportDate} at ${exportTime}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">📝</span>
        <span>${journals.length} ${journals.length === 1 ? "entry" : "entries"}</span>
      </div>
    </div>
  </div>`;

  // Summary Section
  const totalWords = journals.reduce(
    (sum, j) => sum + j.text.split(/\s+/).filter((w) => w.length > 0).length,
    0,
  );
  const avgWordsPerEntry =
    journals.length > 0 ? Math.round(totalWords / journals.length) : 0;
  const dateRange =
    journals.length > 0
      ? `${format(parseISO(journals[journals.length - 1].date), "MMM dd, yyyy")} — ${format(parseISO(journals[0].date), "MMM dd, yyyy")}`
      : "N/A";

  htmlContent += `
  <div class="summary-section">
    <h2>📊 Export Summary</h2>
    <div class="summary-stats">
      <div class="stat-item">
        <span class="stat-label">Total Entries:</span>
        <span class="stat-value">${journals.length}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Words:</span>
        <span class="stat-value">${totalWords.toLocaleString()}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Avg. Per Entry:</span>
        <span class="stat-value">${avgWordsPerEntry} words</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Date Range:</span>
        <span class="stat-value">${dateRange}</span>
      </div>
    </div>
  </div>`;

  // Entries
  htmlContent += '<div class="entries-container">';

  for (let index = 0; index < journals.length; index++) {
    const journal = journals[index];
    const dateObj = parseISO(journal.date);
    const formattedDate = format(dateObj, "EEEE, MMMM dd, yyyy");
    const formattedTime = format(dateObj, "hh:mm a");

    
    htmlContent += `
    <div class="journal-entry">
      <div class="entry-header">
        <div class="entry-date-time">
          <div class="entry-date">${formattedDate}</div>
          <div class="entry-time">${formattedTime}</div>
        </div>
        <div class="entry-index">Entry ${index + 1}</div>
      </div>`;

    // Title
    if (journal.title && journal.title.trim()) {
      const escapedTitle = journal.title
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      htmlContent += `<h2 class="entry-title">${escapedTitle}</h2>`;
    } else {
      htmlContent += `<h2 class="entry-title untitled">Untitled Entry</h2>`;
    }

     if (journal.mood) {
    const moodOption = MOOD_OPTIONS.find(m => m.value === journal.mood);
    if (moodOption) {
      htmlContent += `
        <div class="entry-mood">
          <span class="mood-emoji">${moodOption.emoji}</span>
          <span class="mood-label">Feeling ${moodOption.label}</span>
        </div>
      `;
    }
  }

    // Content with Markdown parsing
    try {
      const parsedContent = markdownToHtml(journal.text);
      htmlContent += `<div class="entry-content">${parsedContent}</div>`;
    } catch (error) {
      console.error("Error parsing markdown:", error);
      // Fallback to plain text
      const escapedText = journal.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br />");
      htmlContent += `<div class="entry-content">${escapedText}</div>`;
    }

    // Images
    if (journal.images && journal.images.length > 0) {
      const imageCount = journal.images.length;
      const gridClass = imageCount === 1 ? "images-grid single" : "images-grid";

      htmlContent += `<div class="images-section">
        <span class="images-label">📸 Images (${imageCount})</span>
        <div class="${gridClass}">`;

      journal.images.forEach((base64Image, imgIndex) => {
        try {
          const imageDataUri = base64ToDataUri(base64Image);
          htmlContent += `
          <div class="image-wrapper">
            <img src="${imageDataUri}" alt="Image ${imgIndex + 1}" class="entry-image" />
            <div class="image-caption">Image ${imgIndex + 1}</div>
          </div>`;
        } catch (error) {
          console.error("Error processing image for PDF:", error);
          htmlContent += `
          <div class="image-wrapper">
            <div style="background: #f0f0f0; padding: 20px; border-radius: 3px; text-align: center;">
              <div class="image-caption">❌ Image ${imgIndex + 1} could not be loaded</div>
            </div>
          </div>`;
        }
      });

      htmlContent += `</div></div>`;
    }

    // Entry Footer
    const wordCount = journal.text
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    htmlContent += `
    <div class="entry-footer">
      💾 ${format(parseISO(journal.createdAt || journal.date), "MMM dd, yyyy")} · ${wordCount} words
    </div>`;

    // Page divider (except last entry)
    if (index < journals.length - 1) {
      htmlContent += '<hr class="page-divider" />';
    }

    htmlContent += "</div>";
  }

  htmlContent += `</div>

  <div class="document-footer">
    <p>Generated by ${APP_CONFIG.displayName} • ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}</p>
    <p style="margin-top: 4px;">🔐 Personal data. Keep confidential.</p>
  </div>
</body>
</html>`;

  try {
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
    });
    return uri;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

/**
 * Share file using native share dialog
 * On mobile, this opens the share sheet which includes "Save to Files" option
 */
export const shareFile = async (
  uri: string,
  filename: string,
): Promise<void> => {
  if (Platform.OS === "web") {
    // For web, trigger download
    // Handle both file URIs and data URIs
    let downloadUri = uri;
    if (uri.startsWith("data:")) {
      // Data URI - use as is
      downloadUri = uri;
    } else {
      // File URI - fetch and convert to blob
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        downloadUri = URL.createObjectURL(blob);
      } catch (error) {
        console.error("Error fetching file for download:", error);
        // Fallback to direct URI
      }
    }

    const link = document.createElement("a");
    link.href = downloadUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL if created
    if (downloadUri.startsWith("blob:")) {
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
        UTI: Platform.OS === "ios" ? getUTI(filename) : undefined,
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }
  }
};

/**
 * Get UTI (Uniform Type Identifier) for iOS file sharing
 */
const getUTI = (filename: string): string => {
  if (filename.endsWith(".json")) return "public.json";
  if (filename.endsWith(".txt")) return "public.plain-text";
  if (filename.endsWith(".pdf")) return "com.adobe.pdf";
  return "public.data";
};

/**
 * Get MIME type from filename
 */
const getMimeType = (filename: string): string => {
  if (filename.endsWith(".json")) return "application/json";
  if (filename.endsWith(".txt")) return "text/plain";
  if (filename.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
};

/**
 * Save text file and return the file URI
 * On mobile: saves to Documents directory (accessible via Files app)
 * On web: triggers download and returns data URI
 */
export const saveTextFile = async (
  content: string,
  filename: string,
): Promise<string> => {
  if (Platform.OS === "web") {
    // For web, trigger download
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    // Return a data URI for consistency
    return `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`;
  } else {
    // For mobile, save to Documents directory (accessible via Files app)
    // Prefer documentDirectory as it's user-accessible
    const documentDir =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
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
export const saveFileForSharing = async (
  content: string,
  filename: string,
  mimeType: string,
): Promise<string> => {
  if (Platform.OS === "web") {
    // For web, trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  } else {
    // For mobile, save to Documents directory
    const documentDir =
      FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
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
  if (Platform.OS !== "web") return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
