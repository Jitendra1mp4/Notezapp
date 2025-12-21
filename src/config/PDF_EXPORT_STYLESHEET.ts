export const PDF_EXPORT_STYLESHEET  = `
 <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      margin: 16mm 14mm;
    }

    html, body {
      font-family: 'Segoe UI', 'Roboto', -apple-system, BlinkMacSystemFont, 'Oxygen', 'Ubuntu', sans-serif;
      background: #ffffff;
      color: #1f1f1f;
      line-height: 1.6;
      padding: 0;
    }

    /* Document Header */
    .document-header {
      text-align: center;
      padding: 14px 0 10px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 12px;
      page-break-after: avoid;
    }

    .document-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: -0.3px;
    }

    .document-meta {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 12px;
      flex-wrap: wrap;
      font-size: 11px;
      color: #5f6368;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-label {
      font-weight: 600;
      color: #1a73e8;
    }

    /* Journal Entries Container */
    .entries-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Individual Journal Entry */
    .journal-entry {
      background: #ffffff;
      border-left: 3px solid #1a73e8;
      padding: 18px;
      page-break-inside: auto;
      break-inside: auto;
      border-radius: 4px;
      border: 1px solid #e8e8e8;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .journal-entry:nth-child(odd) {
      border-left-color: #1a73e8;
    }

    .journal-entry:nth-child(2n) {
      border-left-color: #4285f4;
    }

    /* Entry Header */
    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .entry-date-time {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .entry-date {
      font-size: 12px;
      font-weight: 600;
      color: #1a73e8;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .entry-time {
      font-size: 10px;
      color: #9aa0a6;
    }

    .entry-index {
      font-size: 10px;
      color: #bdc1c6;
    }

    /* Entry Title */
    .entry-title {
      font-size: 18px;
      font-weight: 700;
      color: #202124;
      margin-bottom: 10px;
      letter-spacing: -0.2px;
      line-height: 1.3;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .entry-title.untitled {
      font-style: italic;
      color: #9aa0a6;
      font-weight: 400;
      font-size: 16px;
    }

    /* Entry Content with Markdown Styles */
    .entry-content {
      font-size: 13px;
      color: #3c4043;
      line-height: 1.65;
      margin-bottom: 12px;
      word-wrap: break-word;
      page-break-inside: auto;
      break-inside: auto;
    }

    .entry-content p {
      margin-bottom: 8px;
    }

    .entry-content h1 {
      font-size: 16px;
      font-weight: 700;
   
      margin-top: 12px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .entry-content h2 {
      font-size: 15px;
      font-weight: 700;
      
      margin-top: 10px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .entry-content h3,
    .entry-content h4,
    .entry-content h5,
    .entry-content h6 {
      font-size: 13px;
      font-weight: 600;
      margin-top: 10px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    .entry-content strong {
      font-weight: 700;
      color: #202124;
    }

    .entry-content em {
      font-style: italic;
      color: #3c4043;
    }

    .entry-content code {
      background: #f1f3f4;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: 'Courier New', 'Monaco', monospace;
      font-size: 12px;
      color: #d33427;
    }

    .entry-content pre {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 8px 0;
      border: 1px solid #dadce0;
      font-size: 12px;
      line-height: 1.5;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    .entry-content pre code {
      background: none;
      color: #202124;
      padding: 0;
    }

    .entry-content blockquote {
      border-left: 3px solid #dadce0;
      padding-left: 12px;
      margin-left: 0;
      margin-top: 8px;
      margin-bottom: 8px;
      color: #5f6368;
      font-style: italic;
      background: #f8f9fa;
      padding: 8px 12px;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    .entry-content ul,
    .entry-content ol {
      margin-left: 20px;
      margin-bottom: 8px;
    }

    .entry-content li {
      margin-bottom: 4px;
      line-height: 1.6;
    }

    .entry-content a {
      color: #1a73e8;
      text-decoration: none;
      word-break: break-all;
    }

    .entry-content a:hover {
      text-decoration: underline;
    }

    .entry-content hr {
      border: none;
      border-top: 1px solid #e8e8e8;
      margin: 12px 0;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    /* Images Gallery */
    .images-section {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #e8e8e8;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    .images-label {
      font-size: 11px;
      font-weight: 600;
      color: #1a73e8;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 10px;
      display: block;
    }

    .images-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    .images-grid.single {
      grid-template-columns: 1fr;
    }

    .image-wrapper {
      page-break-inside: avoid;
      break-inside: avoid-page;
      text-align: center;
      overflow: hidden;
    }

    .entry-image {
      display: block;
      width: 100%;
      height: auto;
      max-height: 280px;
      margin: 0 auto;
      border-radius: 3px;
      border: 1px solid #e8e8e8;
      object-fit: contain;
      background: #fafafa;
    }

    .image-caption {
      font-size: 10px;
      color: #9aa0a6;
      text-align: center;
      margin-top: 4px;
      font-style: italic;
    }

    /* Entry Footer Stats */
    .entry-footer {
      font-size: 10px;
      color: #9aa0a6;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #f0f0f0;
      page-break-after: avoid;
      break-after: avoid-page;
    }

    /* Page Break Divider */
    .page-divider {
      border: none;
      border-top: 1px solid #e8e8e8;
      margin: 16px 0;
      page-break-after: always;
      break-after: page;
    }

    /* Summary Section */
    .summary-section {
      background: #f8f9fa;
      border-left: 3px solid #1a73e8;
      padding: 18px;
      margin-top: 24px;
      page-break-inside: avoid;
      break-inside: avoid-page;
      border-radius: 4px;
      border: 1px solid #e8e8e8;
    }

    .summary-section h2 {
      color: #1a73e8;
      font-size: 15px;
      margin-bottom: 12px;
      font-weight: 600;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 4px 0;
    }

    .stat-label {
      color: #5f6368;
      font-weight: 500;
    }

    .stat-value {
      font-weight: 600;
      color: #1a73e8;
    }

    /* Footer */
    .document-footer {
      margin-top: 32px;
      text-align: center;
      font-size: 10px;
      color: #bdc1c6;
      page-break-before: avoid;
      break-before: avoid-page;
      padding-top: 12px;
      border-top: 1px solid #e8e8e8;
    }

    /* Print-specific styles */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .journal-entry {
        page-break-inside: auto;
        break-inside: auto;
        margin-bottom: 12px;
      }

      .entry-header,
      .entry-title,
      .entry-content,
      .images-section {
        page-break-inside: auto;
        break-inside: auto;
      }

      .image-wrapper {
        page-break-inside: avoid;
        break-inside: avoid-page;
      }

      .page-divider {
        page-break-after: always;
        break-after: page;
      }
    }
  </style>
`