const fs = require('fs');
const path = require('path');
const vm = require('vm');

const logoDataUri = fs.readFileSync('logo_datauri.txt', 'utf8').trim();

const html = `<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>S. Radhakrishnan Academy - Progress Report & Marksheet Generator</title>
  <!-- SheetJS enables .xlsx/.xls bulk import and template generation -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <!-- html2pdf for direct client-side PDF downloads -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --navy: #0f2c42;
      --navy-dark: #0a1e2d;
      --accent: #0f766e;
      --accent-hover: #0d655e;
      --blue: #2563eb;
      --blue-hover: #1d4ed8;
      --bg: #f8fafc;
      --panel: #ffffff;
      --report-navy: #17375d;
      --report-address: #1f497d;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }

    button,
    input,
    select,
    textarea {
      font: inherit;
    }

    button {
      cursor: pointer;
      border: 0;
      border-radius: 6px;
      padding: 8px 14px;
      font-weight: 600;
      background: var(--navy);
      color: #fff;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    button:hover {
      background: var(--navy-dark);
    }

    button.secondary {
      background: #e2e8f0;
      color: #1e293b;
    }

    button.secondary:hover {
      background: #cbd5e1;
    }

    button.green {
      background: var(--accent);
      color: #fff;
    }

    button.green:hover {
      background: var(--accent-hover);
    }

    button.blue {
      background: var(--blue);
      color: #fff;
    }

    button.blue:hover {
      background: var(--blue-hover);
    }

    button.danger {
      background: #dc2626;
      color: #fff;
    }

    button.danger:hover {
      background: #b91c1c;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* App Header */
    .app-header {
      background: var(--navy);
      color: #fff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }

    .app-header h1 {
      font-size: 18px;
      margin: 0 0 2px;
      font-weight: 700;
      letter-spacing: -0.2px;
    }

    .app-header p {
      margin: 0;
      color: #94a3b8;
      font-size: 12px;
    }

    .header-badge {
      background: rgba(255, 255, 255, 0.12);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Toolbar */
    .wrap {
      max-width: 1720px;
      margin: 16px auto;
      padding: 0 16px;
    }

    .toolbar {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .toolbar .file-label {
      background: var(--navy);
      color: #fff;
      padding: 8px 14px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }

    .toolbar .file-label:hover {
      background: var(--navy-dark);
    }

    .toolbar .file-label input {
      display: none;
    }

    .toolbar .file-label.secondary-file-label {
      background: #e2e8f0;
      color: #1e293b;
    }

    .toolbar .file-label.secondary-file-label:hover {
      background: #cbd5e1;
    }

    /* Main Layout */
    .layout {
      display: grid;
      grid-template-columns: 460px 1fr;
      gap: 20px;
      align-items: flex-start;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .editor-panel h2,
    .editor-panel h3 {
      margin: 0 0 12px;
      font-size: 15px;
      font-weight: 700;
      color: var(--navy);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .editor-panel h3 {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 12px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field.full {
      grid-column: span 2;
    }

    .field label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .field input,
    .field select,
    .field textarea {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 7px 10px;
      background: #ffffff;
      color: var(--ink);
      transition: border 0.15s ease;
      font-size: 13px;
    }

    .field input:focus,
    .field select:focus,
    .field textarea:focus {
      outline: none;
      border-color: var(--blue);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    .logo-ctrl-row {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }

    .logo-ctrl-row button {
      padding: 4px 8px;
      font-size: 11px;
    }

    .sig-preview-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      padding: 4px 8px;
      background: #f1f5f9;
      border-radius: 6px;
    }

    .sig-preview-thumb {
      width: 44px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }

    .sig-preview-thumb img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .sig-remove-btn {
      padding: 3px 8px;
      font-size: 11px;
    }

    /* Subject Marks Editor Table */
    .subject-editor-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12px;
    }

    .subject-editor-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: center;
      padding: 6px 4px;
      border: 1px solid #cbd5e1;
      font-size: 11px;
      text-transform: uppercase;
    }

    .subject-editor-table td {
      padding: 4px 4px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      text-align: center;
    }

    .subject-editor-table td.sub-name-cell {
      text-align: left;
      font-weight: 700;
      color: #0f2c42;
      padding-left: 6px;
      font-size: 11.5px;
      white-space: nowrap;
    }

    .subject-editor-table input {
      width: 100%;
      max-width: 52px;
      padding: 4px 3px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }

    .subject-editor-table input:focus {
      border-color: var(--blue);
      outline: none;
    }

    .subject-editor-table .cell-total {
      font-weight: 700;
      color: #0f172a;
    }

    .subject-editor-table .cell-grade {
      font-weight: 800;
      color: #0f766e;
    }

    .live-marks-summary {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 10px;
      font-size: 12.5px;
    }

    .live-marks-summary strong {
      color: #0f2c42;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 14px;
    }

    .actions button {
      flex: 1;
    }

    .status {
      margin-top: 10px;
      font-size: 12px;
      font-weight: 600;
      min-height: 18px;
    }

    .duplicate-warning {
      background: #fef3c7;
      border: 1px solid #fde68a;
      color: #92400e;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      margin-top: 10px;
    }

    /* Student List */
    .students-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .students-header-row h3 {
      margin: 0;
      padding: 0;
      border: none;
    }

    .group-filter-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .group-filter-wrap select {
      font-size: 12px;
      padding: 4px 8px;
    }

    .student-list {
      max-height: 380px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-top: 8px;
    }

    .student-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background 0.1s ease;
      font-size: 12.5px;
    }

    .student-row:last-child {
      border-bottom: none;
    }

    .student-row:hover {
      background: #f8fafc;
    }

    .student-row.selected {
      background: #eff6ff;
      border-left: 3px solid var(--blue);
    }

    .student-row .s-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .student-row .s-name {
      font-weight: 700;
      color: #0f2c42;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .student-row .s-meta {
      font-size: 11px;
      color: #64748b;
    }

    .student-row .s-actions {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }}

    .student-row .s-actions button {
      padding: 3px 7px;
      font-size: 11px;
    }

    /* Preview Panel */
    .preview-panel {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .preview-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
    }

    .preview-title-block h2 {
      margin: 0 0 2px;
      font-size: 16px;
      color: var(--navy);
    }

    .preview-note {
      font-size: 11.5px;
      color: #64748b;
    }

    .preview-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .zoom-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .zoom-controls select {
      padding: 4px 8px;
      font-size: 12px;
    }

    .cards {
      background: #475569;
      border-radius: 8px;
      padding: 24px 16px;
      min-height: 600px;
      overflow: auto;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .preview-scaler {
      transform-origin: top center;
      transition: transform 0.15s ease;
    }

    .empty {
      color: #cbd5e1;
      font-size: 14px;
      text-align: center;
      padding: 60px 20px;
    }

    /* ============================================================== */
    /* STRICT PDF DESIGN LOCK: EXACT PIXEL-FAITHFUL A4 LANDSCAPE      */
    /* (Matches reference PDF dimensions: 841.92pt x 595.32pt)        */
    /* ============================================================== */

    .report-card {
      width: 297mm;
      height: 210mm;
      min-height: 210mm;
      max-height: 210mm;
      background: #ffffff;
      color: #000000;
      position: relative;
      margin: 0 auto;
      overflow: hidden;
      box-sizing: border-box;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* STRICT MANDATORY BOLD TEXT */
    .report-card,
    .report-card * {
      box-sizing: border-box;
    }

    /* School Logo Emblem */
    .school-logo {
      position: absolute;
      top: 23mm;
      left: 26.9mm;
      width: 35.1mm;
      height: 42mm;
      object-fit: contain;
    }

    /* School Heading Center Block */
    .school-header {
      position: absolute;
      top: 22.3mm;
      left: 0;
      width: 100%;
      text-align: center;
    }

    .school-name {
      font-family: 'Algerian', 'Times New Roman', serif;
      font-size: 24.5pt;
      font-weight: 700;
      color: #000000;
      letter-spacing: 0.5px;
      margin: 0 0 2.5mm 0;
      text-transform: uppercase;
      line-height: 1.1;
    }

    .school-address {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 13.8pt;
      font-weight: 700;
      color: #1f497d;
      margin: 0 0 3mm 0;
      line-height: 1.15;
    }

    .exam-title {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11.5pt;
      font-weight: 700;
      color: #000000;
      margin: 0 0 3.5mm 0;
      line-height: 1.15;
    }

    .udise-box {
      position: absolute;
      top: 46.3mm;
      right: 50.8mm;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 9.6pt;
      font-weight: 700;
      color: #000000;
      white-space: nowrap;
    }

    .progress-box {
      display: inline-block;
      border: 1.2px solid #000000;
      padding: 1.8px 22px;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #000000;
      background: #ffffff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* Student Information Section */
    .student-info {
      position: absolute;
      top: 72.3mm;
      left: 12.7mm;
      right: 12.7mm;
      font-family: 'Bahnschrift', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #000000;
      line-height: 1.68;
    }

    .info-row {
      display: flex;
      align-items: baseline;
      min-height: 6.8mm;
    }

    .info-label {
      width: 48.4mm;
      white-space: nowrap;
    }

    .info-colon {
      width: 14mm;
      text-align: left;
    }

    .info-val {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180mm;
    }

    .class-row-split {
      display: flex;
      align-items: baseline;
    }

    .class-part {
      display: flex;
      align-items: baseline;
      width: 144.5mm;
    }

    .roll-part {
      width: 79.5mm;
      display: flex;
      align-items: baseline;
    }

    .sec-part {
      display: flex;
      align-items: baseline;
    }

    /* Tables Area */
    .tables-container {
      position: absolute;
      top: 98.2mm;
      left: 11.6mm;
      right: 11.6mm;
      display: flex;
      align-items: flex-end;
      gap: 11.5mm;
    }

    /* Left Table: SUBJECT, UT-1, UT-2 */
    .left-table {
      width: 121.2mm;
      border-collapse: collapse;
      table-layout: fixed;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 700;
    }

    .left-table th, .left-table td {
      border: 1.2px solid #000000;
      height: 6.9mm;
      padding: 0;
      vertical-align: middle;
    }

    .left-table th {
      background: #17375d;
      color: #ffffff;
      height: 7.8mm;
      text-align: center;
      font-size: 11.5pt;
      letter-spacing: 0.3px;
    }

    .left-table th.col-sub {
      width: 74.8mm;
      font-size: 14.5pt;
      letter-spacing: 0.5px;
    }

    .left-table th.col-ut1 {
      width: 23.2mm;
    }

    .left-table th.col-ut2 {
      width: 23.2mm;
    }

    .left-table td.cell-sub {
      text-align: left;
      padding-left: 2.5mm;
    }

    .left-table td.cell-ut {
      text-align: center;
    }

    /* Right Table: FIRST TERM, THEORY, PRACTICAL, TOTAL(100), GRADE */
    .right-table {
      width: 125mm;
      border-collapse: collapse;
      table-layout: fixed;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 700;
    }

    .right-table th, .right-table td {
      border: 1.2px solid #000000;
      height: 6.9mm;
      padding: 0;
      vertical-align: middle;
      text-align: center;
    }

    .right-table th.head-term {
      background: #ffffff;
      color: #000000;
      height: 7.6mm;
      font-size: 11.5pt;
      letter-spacing: 0.5px;
    }

    .right-table th.head-sub {
      background: #17375d;
      color: #ffffff;
      height: 7.8mm;
      font-size: 11pt;
      letter-spacing: 0.3px;
    }

    .right-table .col-theory {
      width: 28.9mm;
    }

    .right-table .col-practical {
      width: 30mm;
    }

    .right-table .col-total {
      width: 31.7mm;
    }

    .right-table .col-grade {
      width: 34.4mm;
    }

    /* Remarks Box */
    .remarks-box {
      position: absolute;
      top: 159.2mm;
      left: 11.6mm;
      width: 121.2mm;
      height: 7.2mm;
      border: 1.2px solid #000000;
      box-sizing: border-box;
      padding: 1.2mm 2.5mm;
      font-family: 'Arial Black', Impact, sans-serif;
      font-size: 8.5pt;
      display: flex;
      align-items: center;
      color: #000000;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Grade Scale Table */
    .grade-table {
      position: absolute;
      top: 167.8mm;
      left: 11.6mm;
      width: 174.3mm;
      border-collapse: collapse;
      table-layout: fixed;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 7pt;
      font-weight: 700;
      text-align: center;
    }

    .grade-table th, .grade-table td {
      border: 1.2px solid #000000;
      height: 6.6mm;
      padding: 0;
      vertical-align: middle;
      background: #ffffff;
      color: #000000;
    }

    .grade-table th.scale-first, .grade-table td.scale-first {
      width: 32mm;
    }

    /* Footer: Issue Date & Signatures */
    .report-footer {
      position: absolute;
      bottom: 7mm;
      left: 18.1mm;
      right: 18.1mm;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      font-weight: 700;
      color: #000000;
    }

    .footer-issued {
      display: flex;
      align-items: baseline;
      padding-bottom: 2px;
    }

    .sig-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 55mm;
    }

    .sig-slot {
      height: 14mm;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sig-slot img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }

    /* Print Styles */
    @page {
      size: A4 landscape;
      margin: 0;
    }

    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        width: 297mm !important;
        height: 210mm !important;
      }

      .app-header,
      .edumanage-banner,
      .toolbar,
      .editor-panel,
      .preview-top,
      .no-print,
      #status,
      .modal-backdrop {
        display: none !important;
      }

      .wrap,
      .layout,
      .preview-panel,
      .cards {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        width: 297mm !important;
        max-width: 297mm !important;
        display: block !important;
      }

      .preview-scaler {
        transform: none !important;
        width: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }

      .report-card {
        width: 297mm !important;
        height: 209.5mm !important;
        min-height: 209.5mm !important;
        max-height: 209.8mm !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
        background: #ffffff !important;
        position: relative !important;
      }

      .report-card:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }

    /* ============================================================== */
    /* EXCEL IMPORT PREVIEW MODAL STYLES                              */
    /* ============================================================== */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-card {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 960px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .modal-head {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
    }

    .modal-head h3 {
      margin: 0;
      font-size: 16px;
      color: #0f2c42;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-close-btn {
      background: transparent;
      color: #64748b;
      font-size: 20px;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .modal-close-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .modal-body {
      padding: 18px 20px;
      overflow-y: auto;
      flex: 1;
    }

    .import-stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-pill .s-num {
      font-size: 20px;
      font-weight: 800;
      color: #0f2c42;
    }

    .stat-pill .s-lbl {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .stat-pill.pill-valid .s-num {
      color: #0f766e;
    }

    .stat-pill.pill-warning .s-num {
      color: #b45309;
    }

    .stat-pill.pill-error .s-num {
      color: #dc2626;
    }

    .conflict-resolution-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .conflict-resolution-box strong {
      color: #1e3a8a;
    }

    .conflict-options {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 8px;
    }

    .conflict-options label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      cursor: pointer;
      color: #1e293b;
    }

    .modal-filter-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
    }

    .modal-tab-btn {
      background: transparent;
      color: #64748b;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
    }

    .modal-tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .modal-tab-btn.active {
      background: #0f2c42;
      color: #ffffff;
    }

    .preview-import-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .preview-import-table th {
      background: #f8fafc;
      color: #475569;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
    }

    .preview-import-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .badge-status {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-status.badge-valid {
      background: #dcfce7;
      color: #15803d;
    }

    .badge-status.badge-warn {
      background: #fef3c7;
      color: #b45309;
    }

    .badge-status.badge-error {
      background: #fee2e2;
      color: #b91c1c;
    }

    .modal-foot {
      padding: 12px 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      background: #f8fafc;
    }
  </style>
</head>

<body>

  <header class="app-header">
    <div>
      <h1>S. Radhakrishnan Academy Result Printing</h1>
      <p>Strict Pixel-Faithful A4 Marksheet Engine · Excel &amp; CSV Bulk Import · Instant PDF Generation</p>
    </div>
    <div class="header-badge">
      Academic Session: <strong id="headerSession">2026-2027</strong>
    </div>
  </header>

  <main class="wrap">
    <div class="toolbar no-print">
      <label class="file-label" title="Upload Excel (.xlsx, .xls) or CSV file">
        Upload Excel / CSV <input id="fileInput" type="file" accept=".csv,.xlsx,.xls">
      </label>
      <button class="secondary" id="downloadExcelTemplate" title="Download Excel template containing all student and subject marks columns">Download Excel Template (.xlsx)</button>
      <button class="secondary" id="downloadCsvTemplate" title="Download CSV template">Download CSV Template</button>
      <button class="secondary" id="exportExcel" title="Export all students as Excel spreadsheet">Export Student Data (Excel)</button>
      <button class="secondary" id="exportBackup" title="Download complete backup of all students and settings as JSON">Export Backup (JSON)</button>
      <label class="file-label secondary-file-label" title="Restore complete backup from JSON file">
        Import Backup <input id="backupFileInput" type="file" accept=".json,application/json">
      </label>
      <button class="secondary" id="downloadSinglePdf" title="Directly download PDF for currently selected student">Download PDF (Selected)</button>
      <button class="green" id="printAll" title="Print all students or save as PDF">Print All / Save PDF</button>
      <button class="secondary" id="downloadBulkPdf" title="Directly download multi-page PDF for entire class">Download Bulk PDF</button>
      <button class="danger" id="clearAll" title="Clear all students from memory">Clear All Students</button>
    </div>

    <div class="layout">
      <!-- Editor Panel -->
      <section class="panel editor-panel no-print">
        <h2>School &amp; Examination Settings</h2>
        <div class="form-grid">
          <div class="field full">
            <label for="schoolName">School Name</label>
            <input id="schoolName" value="S.RADHAKRISHNAN ACADEMY">
          </div>
          <div class="field full">
            <label for="schoolAddress">School Address</label>
            <input id="schoolAddress" value="Meru Hazaribagh (JHARKHAND)">
          </div>
          <div class="field">
            <label for="examName">Exam Title</label>
            <input id="examName" value="FIRST TERM EXAMINATION">
          </div>
          <div class="field">
            <label for="session">Academic Session</label>
            <input id="session" value="2026-2027">
          </div>
          <div class="field">
            <label for="udiseNo">U-DISE Number</label>
            <input id="udiseNo" value="20040811807" placeholder="e.g. 20040811807">
          </div>
          <div class="field">
            <label for="issueDate">Issued Date</label>
            <input id="issueDate" value="04/11/26" placeholder="e.g. 04/11/26">
          </div>
          <div class="field">
            <label for="className">Default Class</label>
            <input id="className" value="IX" placeholder="e.g. IX">
          </div>
          <div class="field">
            <label for="section">Default Section</label>
            <input id="section" value="A" placeholder="e.g. A">
          </div>
          <div class="field full">
            <label>School Logo Emblem</label>
            <input id="logoInput" type="file" accept="image/*">
            <div class="logo-ctrl-row">
              <button class="secondary" id="resetLogoBtn" type="button">Default SRA Emblem</button>
              <button class="secondary" id="removeLogoBtn" type="button">Remove Logo</button>
            </div>
          </div>
          <div class="field">
            <label for="teacherSigInput">Class Teacher Signature</label>
            <input id="teacherSigInput" type="file" accept="image/png,image/jpeg,image/jpg">
            <div class="sig-preview-row" id="teacherSigPreviewRow" style="display: none;">
              <div class="sig-preview-thumb">
                <img id="teacherSigPreviewImg" src="" alt="Class Teacher Signature Preview">
              </div>
              <button class="secondary sig-remove-btn" id="removeTeacherSigBtn" type="button" title="Remove signature">Remove</button>
            </div>
            <small class="field-hint">PNG or JPG. Background auto-removed.</small>
          </div>
          <div class="field">
            <label for="principalSigInput">Principal Signature</label>
            <input id="principalSigInput" type="file" accept="image/png,image/jpeg,image/jpg">
            <div class="sig-preview-row" id="principalSigPreviewRow" style="display: none;">
              <div class="sig-preview-thumb">
                <img id="principalSigPreviewImg" src="" alt="Principal Signature Preview">
              </div>
              <button class="secondary sig-remove-btn" id="removePrincipalSigBtn" type="button" title="Remove signature">Remove</button>
            </div>
            <small class="field-hint">PNG or JPG. Background auto-removed.</small>
          </div>
        </div>

        <h3>Student Details</h3>
        <div class="form-grid">
          <div class="field full">
            <label for="studentName">Student Name *</label>
            <input id="studentName" placeholder="Full name">
          </div>
          <div class="field full">
            <label for="fatherName">Father's Name</label>
            <input id="fatherName" placeholder="Father's full name">
          </div>
          <div class="field full">
            <label for="motherName">Mother's Name</label>
            <input id="motherName" placeholder="Mother's full name">
          </div>
          <div class="field">
            <label for="studentClass">Class</label>
            <input id="studentClass" placeholder="e.g. IX">
          </div>
          <div class="field">
            <label for="studentSection">Section</label>
            <input id="studentSection" placeholder="e.g. A">
          </div>
          <div class="field">
            <label for="rollNo">Roll Number *</label>
            <input id="rollNo" placeholder="e.g. 2">
            <small id="rollHint" class="roll-hint" style="display:none"></small>
          </div>
          <div class="field">
            <label for="admissionNo">Admission No.</label>
            <input id="admissionNo" placeholder="e.g. ADM-002">
          </div>
        </div>

        <h3>Subject Marks &amp; Assessment Breakdown</h3>
        <div style="overflow-x: auto;">
          <table class="subject-editor-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>UT-1</th>
                <th>UT-2</th>
                <th>Theory</th>
                <th>Practical</th>
                <th>Total(100)</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody id="subjectFieldsBody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>

        <div id="liveMarksSummary" class="live-marks-summary" aria-live="polite">
          <span>Total: <strong id="liveTotal">0</strong>/600</span>
          <span>Percentage: <strong id="livePct">0.00%</strong></span>
          <span>Grade: <strong id="liveGrade">D2</strong></span>
          <span>Live Rank: <strong id="liveRank">1</strong></span>
        </div>

        <div class="field full" style="margin-top:10px">
          <label for="remarks">Remarks (e.g. EXCELLENT!)</label>
          <input id="remarks" placeholder="e.g. EXCELLENT!" value="EXCELLENT!">
        </div>

        <div class="actions">
          <button id="saveStudent">Add Student</button>
          <button class="secondary" id="resetForm">Reset Form</button>
        </div>

        <div class="status" id="status" role="status"></div>
        <div id="duplicateWarning" class="duplicate-warning" role="alert" style="display:none"></div>

        <div class="students-header-row">
          <h3>Student Records <span id="studentCount">(0)</span></h3>
          <div class="group-filter-wrap">
            <label for="groupSelect"><strong>Filter Group:</strong></label>
            <select id="groupSelect" aria-label="Select Class and Section Group"></select>
          </div>
        </div>
        <div id="studentList" class="student-list">
          <div class="student-row">No students added yet.</div>
        </div>
      </section>

      <!-- Preview Panel -->
      <section class="panel preview-panel">
        <div class="preview-top no-print">
          <div class="preview-title-block">
            <h2>Marksheet Preview (Exact A4 Landscape Replica)</h2>
            <div class="preview-note">Strict PDF lock reproducing S. Radhakrishnan Academy reference layout.</div>
          </div>
          <div class="preview-actions">
            <div class="zoom-controls">
              <label for="zoomSelect">Zoom:</label>
              <select id="zoomSelect">
                <option value="fit" selected>Fit Width</option>
                <option value="100">100% (297mm)</option>
                <option value="85">85%</option>
                <option value="70">70%</option>
                <option value="55">55%</option>
              </select>
            </div>
            <button class="secondary" id="printPreview">Print Selected</button>
            <button class="green" id="printAllTop">Print All / Save PDF</button>
          </div>
        </div>
        <div id="preview" class="cards">
          <div class="preview-scaler" id="previewScaler">
            <div class="empty">Add a student or upload an Excel file to preview the report card.</div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <!-- Excel Bulk Import Preview & Validation Modal -->
  <div id="importModal" class="modal-backdrop" style="display: none;">
    <div class="modal-card">
      <div class="modal-head">
        <h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Excel / CSV Student Import Preview &amp; Validation
        </h3>
        <button class="modal-close-btn" id="modalCloseBtn" type="button" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="import-stats-grid">
          <div class="stat-pill">
            <span class="s-num" id="modalStatTotal">0</span>
            <span class="s-lbl">Total Rows</span>
          </div>
          <div class="stat-pill pill-valid">
            <span class="s-num" id="modalStatValid">0</span>
            <span class="s-lbl">Ready to Import</span>
          </div>
          <div class="stat-pill pill-warning">
            <span class="s-num" id="modalStatDuplicates">0</span>
            <span class="s-lbl">Duplicate Rolls</span>
          </div>
          <div class="stat-pill pill-error">
            <span class="s-num" id="modalStatErrors">0</span>
            <span class="s-lbl">Validation Errors</span>
          </div>
        </div>

        <div class="conflict-resolution-box" id="conflictBox">
          <strong>Duplicate Roll Number Handling:</strong>
          <div class="conflict-options">
            <label>
              <input type="radio" name="conflictChoice" value="skip" checked>
              <span>Skip duplicates (Keep existing records)</span>
            </label>
            <label>
              <input type="radio" name="conflictChoice" value="overwrite">
              <span>Overwrite existing records with matching Roll Number</span>
            </label>
            <label>
              <input type="radio" name="conflictChoice" value="keep">
              <span>Import all anyway (Create separate records)</span>
            </label>
          </div>
        </div>

        <div class="modal-filter-tabs">
          <button class="modal-tab-btn active" data-tab="all" id="tabAll">All Rows (<span id="countTabAll">0</span>)</button>
          <button class="modal-tab-btn" data-tab="valid" id="tabValid">Valid Rows (<span id="countTabValid">0</span>)</button>
          <button class="modal-tab-btn" data-tab="duplicates" id="tabDuplicates">Duplicates (<span id="countTabDuplicates">0</span>)</button>
          <button class="modal-tab-btn" data-tab="errors" id="tabErrors">Errors (<span id="countTabErrors">0</span>)</button>
        </div>

        <div style="max-height: 320px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
          <table class="preview-import-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Status</th>
                <th>Student Name</th>
                <th>Class &amp; Sec</th>
                <th>Roll</th>
                <th>Total / Grade</th>
                <th>Validation Notes</th>
              </tr>
            </thead>
            <tbody id="modalPreviewTableBody">
              <!-- Rendered via JS -->
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-foot">
        <button class="secondary" id="modalCancelBtn" type="button">Cancel</button>
        <button class="green" id="modalConfirmBtn" type="button">Confirm &amp; Import</button>
      </div>
    </div>
  </div>

  <script>
    (() => {
      // Authentic S. Radhakrishnan Academy Emblem Base64 Data URI
      const DEFAULT_LOGO = "${logoDataUri}";

      const SUBJECTS = ['MATHS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL STUDIES', 'COMPUTER'];

      // Official S. Radhakrishnan Academy Grading Scale matching reference PDF table:
      const GRADES = [
        { min: 91, max: 100, grade: 'A1' },
        { min: 81, max: 90, grade: 'A2' },
        { min: 71, max: 80, grade: 'B1' },
        { min: 61, max: 70, grade: 'B2' },
        { min: 51, max: 60, grade: 'C1' },
        { min: 41, max: 50, grade: 'C2' },
        { min: 33, max: 40, grade: 'D1' },
        { min: 0, max: 32.999, grade: 'D2' }
      ];

      let students = [];
      let editingId = null;
      let selectedId = null;
      let logoData = DEFAULT_LOGO;
      let teacherSigData = '';
      let principalSigData = '';
      let selectedGroupKey = '';
      let pendingImportRows = [];

      const $ = id => document.getElementById(id);
      const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const clean = v => String(v ?? '').trim();

      const formatName = str => {
        if (!str) return '';
        return String(str)
          .trim()
          .split(/\\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      };

      const STORAGE_KEYS = {
        STUDENTS: 'resultPrinting_students_v1',
        SETTINGS: 'resultPrinting_settings_v1',
        LOGO: 'resultPrinting_logo_v1',
        TEACHER_SIG: 'resultPrinting_teacher_sig_v1',
        PRINCIPAL_SIG: 'resultPrinting_principal_sig_v1',
        SELECTED: 'resultPrinting_selected_v1',
        GROUP: 'resultPrinting_group_v1'
      };

      function updateSigPreviewUI(type) {
        if (type === 'teacher' || type === 'all') {
          const row = $('teacherSigPreviewRow');
          const img = $('teacherSigPreviewImg');
          if (teacherSigData) {
            if (row) row.style.display = 'flex';
            if (img) img.src = teacherSigData;
          } else {
            if (row) row.style.display = 'none';
            if (img) img.src = '';
            if ($('teacherSigInput')) $('teacherSigInput').value = '';
          }
        }
        if (type === 'principal' || type === 'all') {
          const row = $('principalSigPreviewRow');
          const img = $('principalSigPreviewImg');
          if (principalSigData) {
            if (row) row.style.display = 'flex';
            if (img) img.src = principalSigData;
          } else {
            if (row) row.style.display = 'none';
            if (img) img.src = '';
            if ($('principalSigInput')) $('principalSigInput').value = '';
          }
        }
      }

      function readSchool() {
        return {
          name: clean($('schoolName').value) || 'S.RADHAKRISHNAN ACADEMY',
          address: clean($('schoolAddress').value) || 'Meru Hazaribagh (JHARKHAND)',
          exam: clean($('examName').value) || 'FIRST TERM EXAMINATION',
          session: clean($('session').value) || '2026-2027',
          udise: clean($('udiseNo').value) || '20040811807',
          className: clean($('className').value) || 'IX',
          section: clean($('section').value) || 'A',
          issueDate: clean($('issueDate').value) || '04/11/26'
        };
      }

      function saveToStorage() {
        try {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
            schoolName: $('schoolName').value,
            schoolAddress: $('schoolAddress').value,
            examName: $('examName').value,
            session: $('session').value,
            udiseNo: $('udiseNo').value,
            className: $('className').value,
            section: $('section').value,
            issueDate: $('issueDate').value
          }));
          if (selectedId) {
            localStorage.setItem(STORAGE_KEYS.SELECTED, selectedId);
          } else {
            localStorage.removeItem(STORAGE_KEYS.SELECTED);
          }
          if (selectedGroupKey) {
            localStorage.setItem(STORAGE_KEYS.GROUP, selectedGroupKey);
          } else {
            localStorage.removeItem(STORAGE_KEYS.GROUP);
          }
          try {
            localStorage.setItem(STORAGE_KEYS.LOGO, logoData || '');
          } catch (logoErr) {
            console.warn('Could not save logo to LocalStorage:', logoErr);
          }
          try {
            if (teacherSigData) {
              localStorage.setItem(STORAGE_KEYS.TEACHER_SIG, teacherSigData);
            } else {
              localStorage.removeItem(STORAGE_KEYS.TEACHER_SIG);
            }
          } catch (tSigErr) {
            console.warn('Could not save teacher signature:', tSigErr);
          }
          try {
            if (principalSigData) {
              localStorage.setItem(STORAGE_KEYS.PRINCIPAL_SIG, principalSigData);
            } else {
              localStorage.removeItem(STORAGE_KEYS.PRINCIPAL_SIG);
            }
          } catch (pSigErr) {
            console.warn('Could not save principal signature:', pSigErr);
          }
          return true;
        } catch (err) {
          console.error('LocalStorage save error:', err);
          setStatus('Warning: Could not save changes to LocalStorage (' + (err.message || 'Storage error') + ').', true);
          return false;
        }
      }

      function loadFromStorage() {
        // 1. School settings
        try {
          const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
          if (rawSettings) {
            const s = JSON.parse(rawSettings);
            if (s && typeof s === 'object') {
              if (s.schoolName != null) $('schoolName').value = s.schoolName;
              if (s.schoolAddress != null) $('schoolAddress').value = s.schoolAddress;
              if (s.examName != null) $('examName').value = s.examName;
              if (s.session != null) $('session').value = s.session;
              if (s.udiseNo != null) $('udiseNo').value = s.udiseNo;
              if (s.className != null) $('className').value = s.className;
              if (s.section != null) $('section').value = s.section;
              if (s.issueDate != null) $('issueDate').value = s.issueDate;
            }
          }
        } catch (err) {
          console.warn('Could not parse saved school settings:', err);
        }

        // 2. Logo
        try {
          const savedLogo = localStorage.getItem(STORAGE_KEYS.LOGO);
          if (!savedLogo || savedLogo === DEFAULT_LOGO || savedLogo.length === 115054 || savedLogo.includes('ARQAAAFLCAYAAACXqHNb')) {
            logoData = DEFAULT_LOGO;
            try { localStorage.setItem(STORAGE_KEYS.LOGO, DEFAULT_LOGO); } catch(e) {}
          } else {
            logoData = savedLogo;
          }
        } catch (err) {
          logoData = DEFAULT_LOGO;
        }

        // 3. Signatures
        try {
          teacherSigData = localStorage.getItem(STORAGE_KEYS.TEACHER_SIG) || '';
          principalSigData = localStorage.getItem(STORAGE_KEYS.PRINCIPAL_SIG) || '';
          updateSigPreviewUI('all');
        } catch (sigErr) {
          console.warn('Could not read saved signatures:', sigErr);
        }

        // 4. Students
        try {
          const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
          if (rawStudents !== null) {
            const parsed = JSON.parse(rawStudents);
            if (Array.isArray(parsed) && parsed.length > 0) {
              students = parsed.map((s, idx) => {
                let details = s.subjectDetails;
                if (!Array.isArray(details) || details.length !== 6) {
                  const legacyMarks = Array.isArray(s.marks) ? s.marks : [0,0,0,0,0,0];
                  details = SUBJECTS.map((sub, i) => {
                    const m = Number(legacyMarks[i] || 0);
                    return {
                      name: sub,
                      ut1: s.ut1Marks?.[i] ?? 0,
                      ut2: s.ut2Marks?.[i] ?? 0,
                      theory: m,
                      practical: 0,
                      total: m,
                      grade: getGrade(m)
                    };
                  });
                }
                const marks = details.map(d => Number(d.total || 0));
                return {
                  id: s.id || ('s' + Date.now() + '_' + idx),
                  name: clean(s.name) || 'Student',
                  father: clean(s.father),
                  mother: clean(s.mother),
                  className: clean(s.className) || 'IX',
                  section: clean(s.section) || 'A',
                  roll: clean(s.roll),
                  admission: clean(s.admission),
                  subjectDetails: details,
                  marks: marks,
                  remarks: clean(s.remarks) || 'EXCELLENT!'
                };
              });
            } else {
              loadDefaultSampleStudent();
            }
          } else {
            loadDefaultSampleStudent();
          }
        } catch (err) {
          console.error('Error loading students:', err);
          loadDefaultSampleStudent();
        }

        // 5. Selected ID
        try {
          const savedSelected = localStorage.getItem(STORAGE_KEYS.SELECTED);
          if (savedSelected && students.some(s => s.id === savedSelected)) {
            selectedId = savedSelected;
          } else {
            selectedId = students[0]?.id || null;
          }
          const savedGroup = localStorage.getItem(STORAGE_KEYS.GROUP);
          if (savedGroup) {
            selectedGroupKey = savedGroup;
          }
        } catch (err) {
          selectedId = students[0]?.id || null;
        }
      }

      function loadDefaultSampleStudent() {
        students = [
          {
            id: 's_sample_01',
            name: 'ABHIJEET PANDEY',
            father: 'ANUJ KUMAR PANDEY',
            mother: 'SANGITA DEVI',
            className: 'IX',
            section: 'A',
            roll: '2',
            admission: 'ADM-002',
            subjectDetails: [
              { name: 'MATHS', ut1: 15, ut2: 15, theory: 48, practical: 14, total: 62, grade: 'B2' },
              { name: 'SCIENCE', ut1: 13, ut2: 15, theory: 49, practical: 14, total: 63, grade: 'B2' },
              { name: 'ENGLISH', ut1: 19, ut2: 22, theory: 73, practical: 17, total: 90, grade: 'A2' },
              { name: 'HINDI', ut1: 23, ut2: 20, theory: 62, practical: 17, total: 79, grade: 'B1' },
              { name: 'SOCIAL STUDIES', ut1: 20, ut2: 15, theory: 42, practical: 15, total: 57, grade: 'C1' },
              { name: 'COMPUTER', ut1: 16, ut2: 21, theory: 41, practical: 45, total: 86, grade: 'A2' }
            ],
            marks: [62, 63, 90, 79, 57, 86],
            remarks: 'EXCELLENT!'
          }
        ];
        saveToStorage();
      }

      const getGrade = marks => {
        const m = Number(marks);
        if (!Number.isFinite(m) || m <= 0) return 'D2';
        const row = GRADES.find(g => m >= g.min && m <= g.max);
        return row ? row.grade : 'D2';
      };

      const calculateTotals = s => {
        const total = (s.marks || []).reduce((a, b) => a + Number(b || 0), 0);
        const max = 600; // 6 subjects * 100
        const pct = (total / max) * 100;
        const grade = getGrade(pct);
        return { total, max, pct, grade };
      };

      const setStatus = (msg, isError = false) => {
        const el = $('status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = isError ? '#dc2626' : '#0f766e';
      };

      function calculateRanks() {
        const groups = new Map();
        students.forEach(s => {
          const cls = getEffectiveClass(s.className);
          const sec = getEffectiveSection(s.section);
          const key = \`\${cls}__\${sec}\`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(s);
        });

        groups.forEach(groupStudents => {
          groupStudents.sort((a, b) => calculateTotals(b).total - calculateTotals(a).total);
          let lastTotal = -1;
          let currentRank = 0;
          groupStudents.forEach((s, idx) => {
            const t = calculateTotals(s).total;
            if (t !== lastTotal) {
              currentRank = idx + 1;
              lastTotal = t;
            }
            s.rank = currentRank;
          });
        });
      }

      function getEffectiveClass(studentClass) {
        const val = clean(studentClass);
        return (val || clean($('className')?.value) || 'IX').toLowerCase();
      }

      function getEffectiveSection(studentSection) {
        const val = clean(studentSection);
        return (val || clean($('section')?.value) || 'A').toLowerCase();
      }

      function normalizeRoll(rollVal) {
        const r = clean(rollVal);
        if (!r) return '';
        if (/^\\d+$/.test(r)) {
          return String(parseInt(r, 10));
        }
        return r.toLowerCase();
      }

      function findDuplicateStudent(candidate, excludeId = null) {
        const candRoll = normalizeRoll(candidate.roll);
        if (!candRoll) return null;
        const candClass = getEffectiveClass(candidate.className);
        const candSec = getEffectiveSection(candidate.section);

        return students.find(s => {
          if (excludeId && s.id === excludeId) return false;
          return getEffectiveClass(s.className) === candClass &&
                 getEffectiveSection(s.section) === candSec &&
                 normalizeRoll(s.roll) === candRoll;
        }) || null;
      }

      function makeGroupKey(cls, sec) {
        const def = readSchool();
        const c = clean(cls || def.className).toUpperCase();
        const s = clean(sec || def.section).toUpperCase();
        return \`\${c}__\${s}\`;
      }

      function parseGroupKey(key) {
        if (!key || key === 'ALL') {
          const def = readSchool();
          return { className: clean(def.className), section: clean(def.section) };
        }
        const parts = key.split('__');
        return { className: parts[0] || '', section: parts[1] || '' };
      }

      function getAllGroups() {
        const set = new Set();
        students.forEach(s => set.add(makeGroupKey(s.className, s.section)));
        if (set.size === 0) {
          const defSchool = readSchool();
          set.add(makeGroupKey(defSchool.className, defSchool.section));
        }
        if (selectedGroupKey) set.add(selectedGroupKey);

        return Array.from(set).filter(Boolean).sort((a, b) => {
          const pa = parseGroupKey(a);
          const pb = parseGroupKey(b);
          return pa.className.localeCompare(pb.className) || pa.section.localeCompare(pb.section);
        });
      }

      function updateGroupDropdown() {
        const select = $('groupSelect');
        if (!select) return;
        const groups = getAllGroups();
        if (!selectedGroupKey || !groups.includes(selectedGroupKey)) {
          const chosen = students.find(s => s.id === selectedId);
          if (chosen) {
            selectedGroupKey = makeGroupKey(chosen.className, chosen.section);
          } else {
            selectedGroupKey = groups[0] || '';
          }
        }

        let html = '';
        groups.forEach(g => {
          const p = parseGroupKey(g);
          const count = students.filter(s => getEffectiveClass(s.className) === p.className.toLowerCase() &&
                                             getEffectiveSection(s.section) === p.section.toLowerCase()).length;
          const label = \`Class \${p.className || '—'} - Section \${p.section || '—'} (\${count})\`;
          html += \`<option value="\${g}" \${g === selectedGroupKey ? 'selected' : ''}>\${escapeHtml(label)}</option>\`;
        });
        select.innerHTML = html;
      }

      function getFilteredStudents() {
        if (!selectedGroupKey) return students;
        const p = parseGroupKey(selectedGroupKey);
        return students.filter(s => getEffectiveClass(s.className) === p.className.toLowerCase() &&
                                   getEffectiveSection(s.section) === p.section.toLowerCase());
      }

      // Render Subject Editor Table Inputs
      function buildSubjectEditorFields() {
        const tbody = $('subjectFieldsBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        SUBJECTS.forEach((sub, i) => {
          const tr = document.createElement('tr');
          tr.innerHTML = \`
            <td class="sub-name-cell">\${sub}</td>
            <td><input id="sub_ut1_\${i}" type="number" min="0" max="100" value="0" aria-label="\${sub} UT1"></td>
            <td><input id="sub_ut2_\${i}" type="number" min="0" max="100" value="0" aria-label="\${sub} UT2"></td>
            <td><input id="sub_theory_\${i}" type="number" min="0" max="100" value="0" aria-label="\${sub} Theory"></td>
            <td><input id="sub_practical_\${i}" type="number" min="0" max="100" value="0" aria-label="\${sub} Practical"></td>
            <td class="cell-total" id="sub_total_cell_\${i}">0</td>
            <td class="cell-grade" id="sub_grade_cell_\${i}">D2</td>
          \`;
          tbody.appendChild(tr);

          // Add live input listeners
          ['ut1', 'ut2', 'theory', 'practical'].forEach(field => {
            const inp = tr.querySelector(\`#sub_\${field}_\${i}\`);
            inp.addEventListener('focus', function() { if (this.value === '0') this.select(); });
            inp.addEventListener('input', () => updateSubjectRowCalculations(i));
            inp.addEventListener('blur', function() { if (this.value.trim() === '') this.value = '0'; updateSubjectRowCalculations(i); });
          });
        });
      }

      function updateSubjectRowCalculations(i) {
        const tVal = Math.min(100, Math.max(0, parseInt($(\`sub_theory_\${i}\`).value, 10) || 0));
        const pVal = Math.min(100, Math.max(0, parseInt($(\`sub_practical_\${i}\`).value, 10) || 0));
        const total = Math.min(100, tVal + pVal);
        const grade = getGrade(total);

        const totalCell = $(\`sub_total_cell_\${i}\`);
        const gradeCell = $(\`sub_grade_cell_\${i}\`);
        if (totalCell) totalCell.textContent = String(total);
        if (gradeCell) gradeCell.textContent = grade;

        updateLiveSummary();
      }

      function readSubjectDetailsFromForm() {
        return SUBJECTS.map((sub, i) => {
          const ut1 = Math.max(0, parseInt($(\`sub_ut1_\${i}\`)?.value, 10) || 0);
          const ut2 = Math.max(0, parseInt($(\`sub_ut2_\${i}\`)?.value, 10) || 0);
          const theory = Math.min(100, Math.max(0, parseInt($(\`sub_theory_\${i}\`)?.value, 10) || 0));
          const practical = Math.min(100, Math.max(0, parseInt($(\`sub_practical_\${i}\`)?.value, 10) || 0));
          const total = Math.min(100, theory + practical);
          const grade = getGrade(total);
          return { name: sub, ut1, ut2, theory, practical, total, grade };
        });
      }

      function updateLiveSummary() {
        const details = readSubjectDetailsFromForm();
        const total = details.reduce((sum, d) => sum + d.total, 0);
        const max = 600;
        const pct = (total / max) * 100;
        const grade = getGrade(pct);

        if ($('liveTotal')) $('liveTotal').textContent = String(total);
        if ($('livePct')) $('livePct').textContent = pct.toFixed(2) + '%';
        if ($('liveGrade')) $('liveGrade').textContent = grade;

        if (editingId) {
          const s = students.find(x => x.id === editingId);
          if (s) {
            s.subjectDetails = details;
            s.marks = details.map(d => d.total);
            calculateRanks();
            if (selectedId === editingId) {
              const scaler = $('previewScaler');
              if (scaler) scaler.innerHTML = reportHtml(s);
            }
          }
        }
      }

      // EXACT PIXEL-FAITHFUL REPORT HTML
      function reportHtml(s) {
        const school = readSchool();
        const studentClass = s.className || school.className || '';
        const studentSection = s.section || school.section || '';

        // Normalize subject details
        let details = s.subjectDetails;
        if (!Array.isArray(details) || details.length !== 6) {
          const mList = Array.isArray(s.marks) ? s.marks : [0,0,0,0,0,0];
          details = SUBJECTS.map((sub, i) => {
            const total = Number(mList[i] || 0);
            return {
              name: sub,
              ut1: 0,
              ut2: 0,
              theory: total,
              practical: 0,
              total: total,
              grade: getGrade(total)
            };
          });
        }

        return \`
    <article class="report-card" data-student-id="\${escapeHtml(s.id)}">
      \${logoData ? \`<img src="\${logoData}" class="school-logo" alt="School Emblem">\` : ''}
      
      <div class="school-header">
        <div class="school-name">\${escapeHtml(school.name)}</div>
        <div class="school-address">\${escapeHtml(school.address)}</div>
        <div class="exam-title">\${escapeHtml(school.exam)} (\${escapeHtml(school.session)})</div>
        <div class="progress-box-wrap">
          <div class="progress-box">PROGRESS REPORT</div>
        </div>
      </div>

      <div class="udise-box">U-DISE No.:-\${escapeHtml(school.udise)}</div>

      <div class="student-info">
        <div class="info-row">
          <span class="info-label">STUDENT 'S NAME</span>
          <span class="info-colon">:</span>
          <span class="info-val">\${escapeHtml(String(s.name || '').toUpperCase())}</span>
        </div>
        <div class="info-row">
          <span class="info-label">FATHER'S NAME</span>
          <span class="info-colon">:</span>
          <span class="info-val">\${escapeHtml(String(s.father || '').toUpperCase())}</span>
        </div>
        <div class="info-row">
          <span class="info-label">MOTHER'S NAME</span>
          <span class="info-colon">:</span>
          <span class="info-val">\${escapeHtml(String(s.mother || '').toUpperCase())}</span>
        </div>
        <div class="info-row class-row-split">
          <div class="class-part">
            <span class="info-label">CLASS</span>
            <span class="info-colon">:</span>
            <span class="info-val">\${escapeHtml(String(studentClass).toUpperCase())}</span>
          </div>
          <div class="roll-part">
            <span>ROLL : &nbsp;\${escapeHtml(s.roll || '')}</span>
          </div>
          <div class="sec-part">
            <span>SECTION : &nbsp;\${escapeHtml(String(studentSection).toUpperCase())}</span>
          </div>
        </div>
      </div>

      <div class="tables-container">
        <!-- Left Table: SUBJECT, UT-1, UT-2 -->
        <table class="left-table">
          <thead>
            <tr>
              <th class="col-sub">SUBJECT</th>
              <th class="col-ut1">UT-1</th>
              <th class="col-ut2">UT-2</th>
            </tr>
          </thead>
          <tbody>
            \${details.map(d => \`
              <tr>
                <td class="cell-sub">\${escapeHtml(d.name)}</td>
                <td class="cell-ut">\${d.ut1 ?? ''}</td>
                <td class="cell-ut">\${d.ut2 ?? ''}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>

        <!-- Right Table: FIRST TERM, THEORY, PRACTICAL, TOTAL(100), GRADE -->
        <table class="right-table">
          <thead>
            <tr>
              <th colspan="4" class="head-term">FIRST TERM</th>
            </tr>
            <tr>
              <th class="head-sub col-theory">THEORY</th>
              <th class="head-sub col-practical">PRACTICAL</th>
              <th class="head-sub col-total">TOTAL(100)</th>
              <th class="head-sub col-grade">GRADE</th>
            </tr>
          </thead>
          <tbody>
            \${details.map(d => \`
              <tr>
                <td>\${d.theory ?? 0}</td>
                <td>\${d.practical ?? 0}</td>
                <td>\${d.total ?? 0}</td>
                <td>\${escapeHtml(d.grade || getGrade(d.total ?? 0))}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </div>

      <div class="remarks-box">
        <span>REMARKS:- &nbsp;\${escapeHtml(String(s.remarks || 'EXCELLENT!').toUpperCase())}</span>
      </div>

      <table class="grade-table">
        <thead>
          <tr>
            <th class="scale-first">MARKS RANGE</th>
            <th>91-100</th>
            <th>81-90</th>
            <th>71-80</th>
            <th>61-70</th>
            <th>51-60</th>
            <th>41-50</th>
            <th>33-40</th>
            <th>BELOW 33</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="scale-first">GRADE</td>
            <td>A1</td>
            <td>A2</td>
            <td>B1</td>
            <td>B2</td>
            <td>C1</td>
            <td>C2</td>
            <td>D1</td>
            <td>D2</td>
          </tr>
        </tbody>
      </table>

      <footer class="report-footer">
        <div class="footer-issued">ISSUED DATE:- &nbsp;\${escapeHtml(school.issueDate || '')}</div>
        <div class="sig-col">
          <div class="sig-slot">
            \${teacherSigData ? \`<img src="\${teacherSigData}" alt="Class Teacher Sign">\` : ''}
          </div>
          <span>CLASS TEACHER'S SIGN</span>
        </div>
        <div class="sig-col">
          <div class="sig-slot">
            \${principalSigData ? \`<img src="\${principalSigData}" alt="Principal Sign">\` : ''}
          </div>
          <span>PRINCIPAL'S SIGN</span>
        </div>
      </footer>
    </article>
        \`;
      }

      function updatePreviewScale() {
        const scaler = $('previewScaler');
        const preview = $('preview');
        if (!scaler || !preview) return;

        const zoomVal = $('zoomSelect')?.value || 'fit';
        let scale = 1;

        if (zoomVal === 'fit') {
          const containerWidth = preview.clientWidth - 48; // padding
          const cardWidthMm = 297;
          const cardWidthPx = cardWidthMm * 3.7795275591; // ~1122.5px
          scale = Math.min(1, Math.max(0.35, containerWidth / cardWidthPx));
        } else {
          scale = parseInt(zoomVal, 10) / 100;
        }

        scaler.style.transform = \`scale(\${scale})\`;
        const cardHeightPx = 210 * 3.7795275591;
        scaler.style.marginBottom = \`\${-(cardHeightPx * (1 - scale))}px\`;
      }

      function render() {
        calculateRanks();
        updateGroupDropdown();

        // 1. Render Student List
        const list = $('studentList');
        const countSpan = $('studentCount');
        const filtered = getFilteredStudents();

        if (countSpan) countSpan.textContent = \`(\${filtered.length})\`;

        if (!filtered.length) {
          list.innerHTML = '<div class="student-row">No students in this group. Add manually or upload Excel/CSV.</div>';
        } else {
          list.innerHTML = filtered.map(s => {
            const t = calculateTotals(s);
            const isSel = s.id === selectedId;
            return \`
              <div class="student-row \${isSel ? 'selected' : ''}" data-select="\${escapeHtml(s.id)}">
                <div class="s-info">
                  <span class="s-name">\${escapeHtml(s.name)}</span>
                  <span class="s-meta">Roll: \${escapeHtml(s.roll || '—')} · Class: \${escapeHtml(s.className || 'IX')}-\${escapeHtml(s.section || 'A')} · \${t.pct.toFixed(1)}% (\${t.grade})</span>
                </div>
                <div class="s-actions">
                  <button class="secondary edit-btn" data-edit="\${escapeHtml(s.id)}" title="Edit student">Edit</button>
                  <button class="danger del-btn" data-del="\${escapeHtml(s.id)}" title="Delete student">&times;</button>
                </div>
              </div>
            \`;
          }).join('');

          // Bind events
          list.querySelectorAll('[data-select]').forEach(el => {
            el.addEventListener('click', e => {
              if (e.target.closest('.s-actions')) return;
              selectedId = el.getAttribute('data-select');
              renderPreview();
              renderListSelection();
              saveToStorage();
            });
          });

          list.querySelectorAll('[data-edit]').forEach(el => {
            el.addEventListener('click', e => {
              e.stopPropagation();
              const id = el.getAttribute('data-edit');
              loadStudentToForm(id);
            });
          });

          list.querySelectorAll('[data-del]').forEach(el => {
            el.addEventListener('click', e => {
              e.stopPropagation();
              const id = el.getAttribute('data-del');
              deleteStudent(id);
            });
          });
        }

        renderPreview();
      }

      function renderListSelection() {
        document.querySelectorAll('.student-row').forEach(row => {
          const id = row.getAttribute('data-select');
          if (id === selectedId) {
            row.classList.add('selected');
          } else {
            row.classList.remove('selected');
          }
        });
      }

      function renderPreview() {
        const scaler = $('previewScaler');
        if (!scaler) return;

        const filtered = getFilteredStudents();
        const current = filtered.find(s => s.id === selectedId) || filtered[0] || students[0];

        if (!current) {
          scaler.innerHTML = '<div class="empty">No student selected. Add a student or upload an Excel file to view marksheet.</div>';
          return;
        }

        scaler.innerHTML = reportHtml(current);
        updatePreviewScale();
      }

      function resetForm() {
        editingId = null;
        $('studentName').value = '';
        $('fatherName').value = '';
        $('motherName').value = '';
        $('studentClass').value = $('className').value || 'IX';
        $('studentSection').value = $('section').value || 'A';
        $('rollNo').value = '';
        $('admissionNo').value = '';
        $('remarks').value = 'EXCELLENT!';
        $('saveStudent').textContent = 'Add Student';

        SUBJECTS.forEach((_, i) => {
          if ($(\`sub_ut1_\${i}\`)) $(\`sub_ut1_\${i}\`).value = '0';
          if ($(\`sub_ut2_\${i}\`)) $(\`sub_ut2_\${i}\`).value = '0';
          if ($(\`sub_theory_\${i}\`)) $(\`sub_theory_\${i}\`).value = '0';
          if ($(\`sub_practical_\${i}\`)) $(\`sub_practical_\${i}\`).value = '0';
          if ($(\`sub_total_cell_\${i}\`)) $(\`sub_total_cell_\${i}\`).textContent = '0';
          if ($(\`sub_grade_cell_\${i}\`)) $(\`sub_grade_cell_\${i}\`).textContent = 'D2';
        });

        updateLiveSummary();
        const hint = $('rollHint');
        if (hint) hint.style.display = 'none';
        const dupWarn = $('duplicateWarning');
        if (dupWarn) dupWarn.style.display = 'none';
      }

      function loadStudentToForm(id) {
        const s = students.find(x => x.id === id);
        if (!s) return;
        editingId = s.id;
        selectedId = s.id;
        $('studentName').value = s.name || '';
        $('fatherName').value = s.father || '';
        $('motherName').value = s.mother || '';
        $('studentClass').value = s.className || '';
        $('studentSection').value = s.section || '';
        $('rollNo').value = s.roll || '';
        $('admissionNo').value = s.admission || '';
        $('remarks').value = s.remarks || 'EXCELLENT!';
        $('saveStudent').textContent = 'Save Changes';

        const details = s.subjectDetails || [];
        SUBJECTS.forEach((_, i) => {
          const d = details[i] || { ut1: 0, ut2: 0, theory: s.marks?.[i] ?? 0, practical: 0, total: s.marks?.[i] ?? 0, grade: 'D2' };
          if ($(\`sub_ut1_\${i}\`)) $(\`sub_ut1_\${i}\`).value = d.ut1 ?? 0;
          if ($(\`sub_ut2_\${i}\`)) $(\`sub_ut2_\${i}\`).value = d.ut2 ?? 0;
          if ($(\`sub_theory_\${i}\`)) $(\`sub_theory_\${i}\`).value = d.theory ?? 0;
          if ($(\`sub_practical_\${i}\`)) $(\`sub_practical_\${i}\`).value = d.practical ?? 0;
          if ($(\`sub_total_cell_\${i}\`)) $(\`sub_total_cell_\${i}\`).textContent = String(d.total ?? 0);
          if ($(\`sub_grade_cell_\${i}\`)) $(\`sub_grade_cell_\${i}\`).textContent = d.grade || getGrade(d.total ?? 0);
        });

        updateLiveSummary();
        renderPreview();
        renderListSelection();
        $('studentName').focus();
      }

      function deleteStudent(id) {
        const s = students.find(x => x.id === id);
        if (!s) return;
        if (confirm(\`Delete record for "\${s.name}"?\`)) {
          students = students.filter(x => x.id !== id);
          if (selectedId === id) {
            selectedId = students[0]?.id || null;
          }
          if (editingId === id) {
            resetForm();
          }
          saveToStorage();
          render();
          setStatus(\`Student "\${s.name}" removed.\`);
        }
      }

      // Save Student Form Action
      $('saveStudent').addEventListener('click', () => {
        const name = clean($('studentName').value);
        if (!name) {
          setStatus('Please enter the Student Name.', true);
          $('studentName').focus();
          return;
        }

        const roll = clean($('rollNo').value);
        if (!roll) {
          setStatus('Please enter a Roll Number.', true);
          $('rollNo').focus();
          return;
        }

        const cls = clean($('studentClass').value) || clean($('className').value) || 'IX';
        const sec = clean($('studentSection').value) || clean($('section').value) || 'A';

        // Check duplicate roll
        const dup = findDuplicateStudent({ roll, className: cls, section: sec }, editingId);
        if (dup) {
          setStatus(\`Roll \${roll} already exists for Class \${cls}-\${sec} (\${dup.name}). Please assign a unique roll number.\`, true);
          $('rollNo').focus();
          return;
        }

        const details = readSubjectDetailsFromForm();
        const marks = details.map(d => d.total);

        if (editingId) {
          const s = students.find(x => x.id === editingId);
          if (s) {
            s.name = name;
            s.father = clean($('fatherName').value);
            s.mother = clean($('motherName').value);
            s.className = cls;
            s.section = sec;
            s.roll = roll;
            s.admission = clean($('admissionNo').value);
            s.subjectDetails = details;
            s.marks = marks;
            s.remarks = clean($('remarks').value) || 'EXCELLENT!';
          }
          setStatus(\`Updated student "\${name}".\`);
        } else {
          const newStudent = {
            id: 's' + Date.now() + Math.random().toString(16).slice(2, 6),
            name: name,
            father: clean($('fatherName').value),
            mother: clean($('motherName').value),
            className: cls,
            section: sec,
            roll: roll,
            admission: clean($('admissionNo').value),
            subjectDetails: details,
            marks: marks,
            remarks: clean($('remarks').value) || 'EXCELLENT!'
          };
          students.push(newStudent);
          selectedId = newStudent.id;
          setStatus(\`Added student "\${name}".\`);
        }

        selectedGroupKey = makeGroupKey(cls, sec);
        saveToStorage();
        render();
        resetForm();
      });

      $('resetForm').addEventListener('click', resetForm);

      // School Settings Inputs Live Update
      ['schoolName', 'schoolAddress', 'examName', 'session', 'udiseNo', 'className', 'section', 'issueDate'].forEach(id => {
        const el = $(id);
        if (!el) return;
        el.addEventListener('input', () => {
          if (id === 'session') $('headerSession').textContent = el.value || '2026-2027';
          saveToStorage();
          renderPreview();
        });
      });

      // Logo Controls
      $('logoInput')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          logoData = ev.target?.result || '';
          saveToStorage();
          renderPreview();
          setStatus('Custom school logo updated.');
        };
        reader.readAsDataURL(file);
      });

      $('resetLogoBtn')?.addEventListener('click', () => {
        logoData = DEFAULT_LOGO;
        if ($('logoInput')) $('logoInput').value = '';
        saveToStorage();
        renderPreview();
        setStatus('Restored default school emblem.');
      });

      $('removeLogoBtn')?.addEventListener('click', () => {
        logoData = '';
        if ($('logoInput')) $('logoInput').value = '';
        saveToStorage();
        renderPreview();
        setStatus('School logo removed.');
      });

      // Signature Background Removal Helper
      function makeSignatureTransparent(dataUrl) {
        return new Promise(resolve => {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const maxDim = 1200;
                let targetW = img.naturalWidth || img.width;
                let targetH = img.naturalHeight || img.height;
                if (targetW > maxDim || targetH > maxDim) {
                  if (targetW >= targetH) {
                    targetH = Math.round((targetH * maxDim) / targetW);
                    targetW = maxDim;
                  } else {
                    targetW = Math.round((targetW * maxDim) / targetH);
                    targetH = maxDim;
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, targetW, targetH);
                const imgData = ctx.getImageData(0, 0, targetW, targetH);
                const data = imgData.data;

                // Corner background estimation
                let sampleR = 0, sampleG = 0, sampleB = 0, sampleCount = 0;
                const samplePts = [
                  [0, 0], [targetW - 1, 0], [0, targetH - 1], [targetW - 1, targetH - 1],
                  [Math.floor(targetW / 2), 0], [0, Math.floor(targetH / 2)],
                  [targetW - 1, Math.floor(targetH / 2)], [Math.floor(targetW / 2), targetH - 1]
                ];
                samplePts.forEach(([px, py]) => {
                  const idx = (py * targetW + px) * 4;
                  if (data[idx + 3] > 128) {
                    sampleR += data[idx]; sampleG += data[idx + 1]; sampleB += data[idx + 2];
                    sampleCount++;
                  }
                });
                const bgR = sampleCount ? sampleR / sampleCount : 255;
                const bgG = sampleCount ? sampleG / sampleCount : 255;
                const bgB = sampleCount ? sampleB / sampleCount : 255;
                const paperLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

                for (let i = 0; i < data.length; i += 4) {
                  const r = data[i], g = data[i + 1], b = data[i + 2], origA = data[i + 3];
                  if (origA < 10) continue;
                  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
                  const distWhite = Math.hypot(255 - r, 255 - g, 255 - b);
                  const isPaper = (lum >= paperLum - 14 && chroma < 22) || (distWhite < 25);
                  data[i + 3] = isPaper ? 0 : origA;
                }
                ctx.putImageData(imgData, 0, 0);
                resolve(canvas.toDataURL('image/png'));
              } catch (e) {
                resolve(dataUrl);
              }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
          } catch (e) {
            resolve(dataUrl);
          }
        });
      }

      function handleSignatureUpload(file, role, roleName) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const raw = String(reader.result || '');
            const proc = await makeSignatureTransparent(raw);
            if (role === 'teacher') {
              teacherSigData = proc;
              updateSigPreviewUI('teacher');
            } else {
              principalSigData = proc;
              updateSigPreviewUI('principal');
            }
            saveToStorage();
            renderPreview();
            setStatus(\`\${roleName} signature updated.\`);
          } catch (err) {
            setStatus(\`Failed to process \${roleName} signature.\`, true);
          }
        };
        reader.readAsDataURL(file);
      }

      $('teacherSigInput')?.addEventListener('change', e => {
        handleSignatureUpload(e.target.files?.[0], 'teacher', 'Class Teacher');
      });
      $('removeTeacherSigBtn')?.addEventListener('click', () => {
        teacherSigData = '';
        updateSigPreviewUI('teacher');
        saveToStorage();
        renderPreview();
        setStatus('Class Teacher signature removed.');
      });

      $('principalSigInput')?.addEventListener('change', e => {
        handleSignatureUpload(e.target.files?.[0], 'principal', 'Principal');
      });
      $('removePrincipalSigBtn')?.addEventListener('click', () => {
        principalSigData = '';
        updateSigPreviewUI('principal');
        saveToStorage();
        renderPreview();
        setStatus('Principal signature removed.');
      });

      // ==============================================================
      // EXCEL TEMPLATE GENERATION & BULK DOWNLOAD
      // ==============================================================

      const EXCEL_HEADERS = [
        'Student Name',
        "Father's Name",
        "Mother's Name",
        'Class',
        'Section',
        'Roll Number',
        'Admission No',
        'Maths UT1', 'Maths UT2', 'Maths Theory', 'Maths Practical',
        'Science UT1', 'Science UT2', 'Science Theory', 'Science Practical',
        'English UT1', 'English UT2', 'English Theory', 'English Practical',
        'Hindi UT1', 'Hindi UT2', 'Hindi Theory', 'Hindi Practical',
        'SST UT1', 'SST UT2', 'SST Theory', 'SST Practical',
        'Computer UT1', 'Computer UT2', 'Computer Theory', 'Computer Practical',
        'Remarks'
      ];

      function buildSampleTemplateRows() {
        return [
          EXCEL_HEADERS,
          [
            'ABHIJEET PANDEY', 'ANUJ KUMAR PANDEY', 'SANGITA DEVI', 'IX', 'A', 2, 'ADM-002',
            15, 15, 48, 14,
            13, 15, 49, 14,
            19, 22, 73, 17,
            23, 20, 62, 17,
            20, 15, 42, 15,
            16, 21, 41, 45,
            'EXCELLENT!'
          ],
          [
            'SEEMA KUMARI', 'RAMESH KUMAR', 'GEETA DEVI', 'IX', 'A', 1, 'ADM-001',
            18, 17, 55, 18,
            16, 18, 52, 16,
            21, 23, 78, 18,
            22, 22, 68, 18,
            21, 18, 50, 16,
            19, 23, 52, 46,
            'OUTSTANDING!'
          ]
        ];
      }

      $('downloadExcelTemplate')?.addEventListener('click', () => {
        if (!window.XLSX) {
          setStatus('Excel library not loaded. Please download CSV template instead.', true);
          return;
        }
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(buildSampleTemplateRows());
        XLSX.utils.book_append_sheet(wb, ws, 'Student_Marks');
        XLSX.writeFile(wb, 'Radhakrishnan_Academy_Student_Template.xlsx');
        setStatus('Downloaded Excel (.xlsx) template.');
      });

      $('downloadCsvTemplate')?.addEventListener('click', () => {
        const rows = buildSampleTemplateRows();
        const csv = rows.map(r => r.map(c => {
          const s = String(c ?? '');
          return /[",\\n\\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',')).join('\\r\\n');
        download('Radhakrishnan_Academy_Student_Template.csv', csv);
        setStatus('Downloaded CSV template.');
      });

      $('exportExcel')?.addEventListener('click', () => {
        if (!students.length) {
          setStatus('No students available to export.', true);
          return;
        }
        if (!window.XLSX) {
          setStatus('Excel library not ready.', true);
          return;
        }
        const rows = [
          EXCEL_HEADERS,
          ...students.map(s => {
            const d = s.subjectDetails || [];
            return [
              s.name, s.father, s.mother, s.className, s.section, s.roll, s.admission,
              d[0]?.ut1 ?? 0, d[0]?.ut2 ?? 0, d[0]?.theory ?? 0, d[0]?.practical ?? 0,
              d[1]?.ut1 ?? 0, d[1]?.ut2 ?? 0, d[1]?.theory ?? 0, d[1]?.practical ?? 0,
              d[2]?.ut1 ?? 0, d[2]?.ut2 ?? 0, d[2]?.theory ?? 0, d[2]?.practical ?? 0,
              d[3]?.ut1 ?? 0, d[3]?.ut2 ?? 0, d[3]?.theory ?? 0, d[3]?.practical ?? 0,
              d[4]?.ut1 ?? 0, d[4]?.ut2 ?? 0, d[4]?.theory ?? 0, d[4]?.practical ?? 0,
              d[5]?.ut1 ?? 0, d[5]?.ut2 ?? 0, d[5]?.theory ?? 0, d[5]?.practical ?? 0,
              s.remarks || ''
            ];
          })
        ];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Students_Export');
        XLSX.writeFile(wb, \`Student_Results_Export_\${readSchool().session}.xlsx\`);
        setStatus(\`Exported \${students.length} student record(s) to Excel.\`);
      });

      // ==============================================================
      // EXCEL BULK UPLOAD & VALIDATION MODAL
      // ==============================================================

      function normalizeHeader(h) {
        return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      function extractField(row, aliases) {
        for (const k of Object.keys(row)) {
          const nk = normalizeHeader(k);
          if (aliases.includes(nk) && row[k] != null && String(row[k]).trim() !== '') {
            return row[k];
          }
        }
        return '';
      }

      function parseSubjectMark(row, subName, fieldKey) {
        const subClean = subName.toLowerCase().replace(/[^a-z]/g, '');
        const target = subClean + fieldKey;
        for (const k of Object.keys(row)) {
          const nk = normalizeHeader(k);
          if (nk === target || nk === target + 'marks' || nk === target + 'mark') {
            const v = Number(row[k]);
            return Number.isFinite(v) ? v : 0;
          }
        }
        // Check generic subject marks if field is theory/total
        if (fieldKey === 'theory' || fieldKey === 'total') {
          for (const k of Object.keys(row)) {
            const nk = normalizeHeader(k);
            if (nk === subClean || nk === subClean + 'marks' || nk === subClean + 'mark') {
              const v = Number(row[k]);
              return Number.isFinite(v) ? v : 0;
            }
          }
        }
        return 0;
      }

      function validateAndParseImportedRow(rawRow, index, existingRollSet) {
        const errors = [];
        const warnings = [];

        const name = clean(extractField(rawRow, ['studentname', 'name', 'student', 'fullname']));
        if (!name) {
          errors.push('Missing Student Name');
        }

        const cls = clean(extractField(rawRow, ['class', 'classname', 'standard', 'grade'])) || clean($('className').value) || 'IX';
        const sec = clean(extractField(rawRow, ['section', 'sec'])) || clean($('section').value) || 'A';
        const roll = clean(extractField(rawRow, ['rollnumber', 'rollno', 'roll']));

        if (!roll) {
          errors.push('Missing Roll Number');
        }

        // Check duplicate roll within file or existing students
        const rollKey = \`\${cls.toUpperCase()}__\${sec.toUpperCase()}__\${normalizeRoll(roll)}\`;
        if (roll && existingRollSet.has(rollKey)) {
          warnings.push(\`Duplicate Roll \${roll} in Class \${cls}-\${sec}\`);
        }

        // Subject breakdown
        const subjectDetails = SUBJECTS.map(sub => {
          const ut1 = parseSubjectMark(rawRow, sub, 'ut1');
          const ut2 = parseSubjectMark(rawRow, sub, 'ut2');
          const theory = parseSubjectMark(rawRow, sub, 'theory');
          const practical = parseSubjectMark(rawRow, sub, 'practical');
          const totalRaw = parseSubjectMark(rawRow, sub, 'total');
          const total = totalRaw > 0 ? totalRaw : Math.min(100, theory + practical);
          const grade = getGrade(total);

          if (theory < 0 || theory > 100) errors.push(\`\${sub} Theory must be 0-100\`);
          if (practical < 0 || practical > 100) errors.push(\`\${sub} Practical must be 0-100\`);

          return { name: sub, ut1, ut2, theory, practical, total, grade };
        });

        const marks = subjectDetails.map(d => d.total);
        const remarks = clean(extractField(rawRow, ['remarks', 'remark', 'comments'])) || 'EXCELLENT!';

        const student = {
          id: 's' + Date.now() + Math.random().toString(16).slice(2, 6) + '_' + index,
          name: name,
          father: clean(extractField(rawRow, ['fathername', 'father', 'fathersname'])),
          mother: clean(extractField(rawRow, ['mothername', 'mother', 'mothersname'])),
          className: cls,
          section: sec,
          roll: roll,
          admission: clean(extractField(rawRow, ['admissionno', 'admissionnumber', 'admno'])),
          subjectDetails: subjectDetails,
          marks: marks,
          remarks: remarks
        };

        return {
          index: index + 1,
          student: student,
          errors: errors,
          warnings: warnings,
          status: errors.length ? 'error' : (warnings.length ? 'duplicate' : 'valid')
        };
      }

      $('fileInput')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('Reading and validating file...');
        try {
          let rawRows = [];
          if (/\\.csv$/i.test(file.name)) {
            const text = await file.text();
            rawRows = parseCsv(text);
          } else {
            if (!window.XLSX) throw new Error('Excel library not loaded.');
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const firstSheet = wb.Sheets[wb.SheetNames[0]];
            rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          }

          if (!rawRows.length) {
            throw new Error('The selected file contains no readable data.');
          }

          // Track existing roll numbers for duplicate detection
          const existingRollSet = new Set();
          students.forEach(s => {
            const key = \`\${getEffectiveClass(s.className).toUpperCase()}__\${getEffectiveSection(s.section).toUpperCase()}__\${normalizeRoll(s.roll)}\`;
            existingRollSet.add(key);
          });

          // Process and validate rows
          const inBatchRollSet = new Set();
          pendingImportRows = rawRows.map((r, i) => {
            const parsed = validateAndParseImportedRow(r, i, existingRollSet);
            // Also check duplicates within the uploaded file itself
            const rRoll = parsed.student.roll;
            if (rRoll) {
              const batchKey = \`\${parsed.student.className.toUpperCase()}__\${parsed.student.section.toUpperCase()}__\${normalizeRoll(rRoll)}\`;
              if (inBatchRollSet.has(batchKey)) {
                parsed.warnings.push(\`Duplicate Roll \${rRoll} appears multiple times in file\`);
                if (parsed.status === 'valid') parsed.status = 'duplicate';
              } else {
                inBatchRollSet.add(batchKey);
              }
            }
            return parsed;
          });

          openImportModal();
        } catch (err) {
          setStatus(err.message || 'Error processing file.', true);
        } finally {
          e.target.value = '';
        }
      });

      function openImportModal() {
        const modal = $('importModal');
        if (!modal) return;

        const total = pendingImportRows.length;
        const valid = pendingImportRows.filter(r => r.status === 'valid').length;
        const duplicates = pendingImportRows.filter(r => r.status === 'duplicate').length;
        const errors = pendingImportRows.filter(r => r.status === 'error').length;

        $('modalStatTotal').textContent = total;
        $('modalStatValid').textContent = valid;
        $('modalStatDuplicates').textContent = duplicates;
        $('modalStatErrors').textContent = errors;

        $('countTabAll').textContent = total;
        $('countTabValid').textContent = valid;
        $('countTabDuplicates').textContent = duplicates;
        $('countTabErrors').textContent = errors;

        $('conflictBox').style.display = duplicates > 0 ? 'block' : 'none';

        renderImportModalTable('all');
        modal.style.display = 'flex';
      }

      function renderImportModalTable(filter) {
        const tbody = $('modalPreviewTableBody');
        if (!tbody) return;

        let filtered = pendingImportRows;
        if (filter === 'valid') filtered = pendingImportRows.filter(r => r.status === 'valid');
        if (filter === 'duplicates') filtered = pendingImportRows.filter(r => r.status === 'duplicate');
        if (filter === 'errors') filtered = pendingImportRows.filter(r => r.status === 'error');

        if (!filtered.length) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: #94a3b8;">No rows matching this filter.</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map(row => {
          const s = row.student;
          let badge = '';
          if (row.status === 'valid') badge = '<span class="badge-status badge-valid">✓ Ready</span>';
          else if (row.status === 'duplicate') badge = '<span class="badge-status badge-warn">⚠ Duplicate Roll</span>';
          else badge = '<span class="badge-status badge-error">✗ Error</span>';

          const issues = [...row.errors, ...row.warnings].join('; ') || 'None';
          const t = calculateTotals(s);

          return \`
            <tr>
              <td>\${row.index}</td>
              <td>\${badge}</td>
              <td><strong>\${escapeHtml(s.name || '—')}</strong></td>
              <td>\${escapeHtml(s.className)}-\${escapeHtml(s.section)}</td>
              <td>\${escapeHtml(s.roll || '—')}</td>
              <td>\${t.total}/600 (\${t.grade})</td>
              <td style="color: \${row.errors.length ? '#dc2626' : (row.warnings.length ? '#b45309' : '#15803d')};">
                \${escapeHtml(issues)}
              </td>
            </tr>
          \`;
        }).join('');
      }

      // Modal Tab Filtering
      document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderImportModalTable(btn.getAttribute('data-tab'));
        });
      });

      $('modalCloseBtn')?.addEventListener('click', () => { $('importModal').style.display = 'none'; });
      $('modalCancelBtn')?.addEventListener('click', () => { $('importModal').style.display = 'none'; });

      // Confirm & Execute Bulk Import
      $('modalConfirmBtn')?.addEventListener('click', () => {
        const conflictChoice = document.querySelector('input[name="conflictChoice"]:checked')?.value || 'skip';
        let importedCount = 0;
        let skippedCount = 0;
        let overwrittenCount = 0;

        pendingImportRows.forEach(row => {
          if (row.status === 'error') {
            skippedCount++;
            return;
          }

          const cand = row.student;
          const dupExisting = findDuplicateStudent(cand);

          if (dupExisting) {
            if (conflictChoice === 'skip') {
              skippedCount++;
              return;
            } else if (conflictChoice === 'overwrite') {
              Object.assign(dupExisting, cand, { id: dupExisting.id });
              overwrittenCount++;
              importedCount++;
              return;
            }
          }

          students.push(cand);
          importedCount++;
        });

        $('importModal').style.display = 'none';
        if (students.length && !selectedId) {
          selectedId = students[0].id;
        }

        saveToStorage();
        render();

        let msg = \`Successfully imported \${importedCount} student(s).\`;
        if (overwrittenCount) msg += \` (\${overwrittenCount} updated)\`;
        if (skippedCount) msg += \` \${skippedCount} row(s) skipped/rejected.\`;
        setStatus(msg);
      });

      function parseCsv(text) {
        const rows = [];
        let row = [], cell = '', quoted = false;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (quoted) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') { quoted = false; }
            else { cell += c; }
          } else if (c === '"') {
            quoted = true;
          } else if (c === ',') {
            row.push(cell); cell = '';
          } else if (c === '\\n') {
            row.push(cell.replace(/\\r$/, ''));
            rows.push(row); row = []; cell = '';
          } else {
            cell += c;
          }
        }
        if (cell.length || row.length) {
          row.push(cell.replace(/\\r$/, ''));
          rows.push(row);
        }
        if (rows.length < 2) return [];
        const keys = rows[0].map(k => clean(k));
        return rows.slice(1).filter(r => r.some(v => clean(v))).map(r => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
      }

      function download(name, content, type = 'text/csv;charset=utf-8;') {
        const blob = new Blob(['\\ufeff', content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      // Backup JSON Export & Import
      $('exportBackup')?.addEventListener('click', () => {
        const backup = {
          appName: 'S. Radhakrishnan Academy Result Printing',
          version: 2,
          exportedAt: new Date().toISOString(),
          schoolSettings: readSchool(),
          logoData: logoData || '',
          teacherSigData: teacherSigData || '',
          principalSigData: principalSigData || '',
          students: students
        };
        download(\`Radhakrishnan_Academy_Backup_\${readSchool().session}.json\`, JSON.stringify(backup, null, 2), 'application/json');
        setStatus('Database backup JSON exported successfully.');
      });

      $('backupFileInput')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const backup = JSON.parse(text);
          if (!backup || typeof backup !== 'object') throw new Error('Invalid backup file.');

          if (backup.schoolSettings) {
            const s = backup.schoolSettings;
            if (s.schoolName) $('schoolName').value = s.schoolName;
            if (s.schoolAddress) $('schoolAddress').value = s.schoolAddress;
            if (s.examName) $('examName').value = s.examName;
            if (s.session) $('session').value = s.session;
            if (s.udiseNo) $('udiseNo').value = s.udiseNo;
            if (s.className) $('className').value = s.className;
            if (s.section) $('section').value = s.section;
            if (s.issueDate) $('issueDate').value = s.issueDate;
          }
          if (backup.logoData !== undefined) logoData = backup.logoData;
          if (backup.teacherSigData !== undefined) teacherSigData = backup.teacherSigData;
          if (backup.principalSigData !== undefined) principalSigData = backup.principalSigData;
          if (Array.isArray(backup.students)) students = backup.students;

          updateSigPreviewUI('all');
          saveToStorage();
          render();
          setStatus(\`Backup restored: \${students.length} student record(s) loaded.\`);
        } catch (err) {
          setStatus('Failed to restore backup: ' + (err.message || 'Parse error'), true);
        } finally {
          e.target.value = '';
        }
      });

      // ==============================================================
      // PDF GENERATION & PRINTING
      // ==============================================================

      function waitForImages(container, callback) {
        const imgs = Array.from(container.querySelectorAll('img'));
        if (!imgs.length) { callback(); return; }
        let remaining = imgs.length;
        let done = false;
        const check = () => {
          remaining--;
          if (remaining <= 0 && !done) { done = true; callback(); }
        };
        imgs.forEach(img => {
          if (img.complete && img.naturalHeight !== 0) check();
          else {
            img.addEventListener('load', check, { once: true });
            img.addEventListener('error', check, { once: true });
          }
        });
        setTimeout(() => { if (!done) { done = true; callback(); } }, 350);
      }

      function triggerPrintAll() {
        const toPrint = getFilteredStudents();
        if (!toPrint.length) {
          setStatus('No students in this group to print.', true);
          return;
        }
        calculateRanks();
        const scaler = $('previewScaler');
        scaler.innerHTML = toPrint.map(s => reportHtml(s)).join('');

        waitForImages(scaler, () => {
          setTimeout(() => { window.print(); }, 60);
        });
      }

      function triggerPrintSelected() {
        const filtered = getFilteredStudents();
        const chosen = filtered.find(s => s.id === selectedId) || filtered[0] || students[0];
        if (!chosen) {
          setStatus('No student selected to print.', true);
          return;
        }
        calculateRanks();
        const scaler = $('previewScaler');
        scaler.innerHTML = reportHtml(chosen);

        waitForImages(scaler, () => {
          setTimeout(() => { window.print(); }, 60);
        });
      }

      // Direct PDF Downloads using html2pdf
      $('downloadSinglePdf')?.addEventListener('click', () => {
        const filtered = getFilteredStudents();
        const s = filtered.find(x => x.id === selectedId) || filtered[0] || students[0];
        if (!s) {
          setStatus('No student selected to download.', true);
          return;
        }
        if (!window.html2pdf) {
          triggerPrintSelected();
          return;
        }
        setStatus('Generating PDF for ' + s.name + '...');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reportHtml(s);
        document.body.appendChild(tempDiv);
        const card = tempDiv.querySelector('.report-card');

        const opt = {
          margin: 0,
          filename: \`\${s.name.replace(/\\s+/g, '_')}_Roll_\${s.roll || '0'}.pdf\`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        html2pdf().set(opt).from(card).save().then(() => {
          document.body.removeChild(tempDiv);
          setStatus('PDF downloaded for ' + s.name + '.');
        }).catch(e => {
          document.body.removeChild(tempDiv);
          console.error(e);
          triggerPrintSelected();
        });
      });

      $('downloadBulkPdf')?.addEventListener('click', () => {
        const toPrint = getFilteredStudents();
        if (!toPrint.length) {
          setStatus('No students available to download.', true);
          return;
        }
        if (!window.html2pdf) {
          triggerPrintAll();
          return;
        }
        setStatus(\`Generating bulk PDF for \${toPrint.length} students...\`);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = toPrint.map(s => reportHtml(s)).join('');
        document.body.appendChild(tempDiv);

        const opt = {
          margin: 0,
          filename: \`Class_\${readSchool().className}_\${readSchool().section}_Results.pdf\`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(tempDiv).save().then(() => {
          document.body.removeChild(tempDiv);
          setStatus(\`Bulk PDF downloaded for \${toPrint.length} students.\`);
        }).catch(e => {
          document.body.removeChild(tempDiv);
          console.error(e);
          triggerPrintAll();
        });
      });

      window.addEventListener('afterprint', () => {
        renderPreview();
      });

      $('printAll')?.addEventListener('click', triggerPrintAll);
      $('printAllTop')?.addEventListener('click', triggerPrintAll);
      $('printPreview')?.addEventListener('click', triggerPrintSelected);

      $('groupSelect')?.addEventListener('change', e => {
        selectedGroupKey = e.target.value;
        const filtered = getFilteredStudents();
        selectedId = filtered[0]?.id || null;
        render();
        saveToStorage();
      });

      $('zoomSelect')?.addEventListener('change', updatePreviewScale);
      window.addEventListener('resize', updatePreviewScale);

      $('clearAll')?.addEventListener('click', () => {
        if (!students.length) return;
        if (confirm('Clear all student records? This cannot be undone.')) {
          students = [];
          selectedId = null;
          resetForm();
          saveToStorage();
          render();
          setStatus('All student records cleared.');
        }
      });

      // Initial Setup
      buildSubjectEditorFields();
      loadFromStorage();
      render();
      resetForm();
    })();
  </script>
</body>
</html>
`;

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
if (scriptStart === -1 || scriptEnd === -1) {
  console.error('Failed to extract script');
  process.exit(1);
}
const scriptContent = html.substring(scriptStart + '<script>'.length, scriptEnd);

try {
  new vm.Script(scriptContent);
  console.log('✓ Script syntax is 100% valid JavaScript!');
} catch (e) {
  console.error('✗ Syntax error in script:', e);
  process.exit(1);
}

// Write to both paths
const rootPath = path.resolve('index.html');
const nestedPath = path.resolve('result-printing-website', 'index.html');

fs.writeFileSync(rootPath, html, 'utf8');
console.log('✓ Saved to root index.html');

if (fs.existsSync('result-printing-website')) {
  fs.writeFileSync(nestedPath, html, 'utf8');
  console.log('✓ Saved to nested result-printing-website/index.html');
}
