# School Result Printing Website

A standalone browser-based result-card tool modeled on the supplied S. Radhakrishnan Academy report-card layout.

## Features
- **Reliable LocalStorage Persistence**: All student records, marks, remarks, school details, examination settings, custom logo, and active selection are automatically saved to browser LocalStorage. Changes remain saved across page refreshes, tab closures, browser restarts, and computer reboots.
- **Export & Import Backup (JSON)**: Easily download a complete JSON backup of all student records and school settings for safekeeping, sharing, or moving across computers. Restore backups with validation and confirmation.
- Edit school name, address, exam, session, class, section, and issue date.
- School logo emblem customization (uploaded logo is saved to LocalStorage).
- Add/edit/delete students manually with automatic input validation.
- Bulk import `.csv`, `.xlsx`, and `.xls` student data.
- Automatically calculate subject grades, total marks (out of 600), percentage, and ranks (with tied ranks handled properly).
- Exact pixel-faithful print layout modeled directly after the original S. Radhakrishnan Academy report card.
- Single-student and bulk multi-page printing with exactly one student per A4 portrait page.
- Export student data to CSV and download a starter CSV template.
- 100% client-side: all data remains safe on your computer.

## How to Run & Use
1. Extract the ZIP file.
2. Open `index.html` in Google Chrome, Microsoft Edge, or any modern web browser.
3. **Data Persistence**: As you add students, modify marks, or edit school information, everything is automatically saved to your browser's local storage.
4. **Export Backup (Recommended)**: Click **Export Backup (JSON)** in the toolbar anytime to save a timestamped copy of your school results to your computer.
5. **Restore Backup**: Use **Import Backup** to load a previously exported JSON backup.
6. **Bulk Upload**: Click **Upload Excel / CSV** to import entire classes at once. You can also click **Download CSV Template** to get the exact header columns.
7. **Printing / Saving as PDF**:
   - Click **Print All Students / Save PDF** (or **Print Preview** for a single student).
   - In the print dialog, select Destination: **Save as PDF** or your printer.
   - Paper size: **A4**, Orientation: **Portrait**, Margins: **None** or **Default**.
   - Check **Background graphics** to preserve table header and border shading.

## Import columns
Use these headers (case-insensitive; spaces and punctuation are ignored):

`studentName, fatherName, motherName, rollNo, admissionNo, class, section, mathMarks, englishMarks, scienceMarks, hindiMarks, sstMarks, computerMarks, remarks`

The first worksheet is imported from an Excel workbook. Missing marks are treated as zero. Each subject is out of 100.

## Grade scale
- 91–100: A1
- 81–90: A2
- 71–80: B1
- 61–70: B2
- 51–60: C1
- 41–50: C2
- 33–40: D1
- Below 33: D2

Grades and ranges follow the supplied report card. Rank is automatically calculated based on total marks, with ties sharing the same rank.
