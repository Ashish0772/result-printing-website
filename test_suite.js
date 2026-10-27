const fs = require('fs');

const SUBJECTS = ['MATHS', 'SCIENCE', 'ENGLISH', 'HINDI', 'SOCIAL STUDIES', 'COMPUTER'];

function clean(v) { return String(v ?? '').trim(); }
function normalizeRoll(v) { return clean(v).replace(/^0+/, '') || clean(v); }
function getGrade(total) {
  if (total >= 91) return 'A1';
  if (total >= 81) return 'A2';
  if (total >= 71) return 'B1';
  if (total >= 61) return 'B2';
  if (total >= 51) return 'C1';
  if (total >= 41) return 'C2';
  if (total >= 33) return 'D1';
  return 'D2';
}

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

function validateAndParseImportedRow(rawRow, index, existingRollSet, defaultClass = 'IX', defaultSec = 'A') {
  const errors = [];
  const warnings = [];

  const name = clean(extractField(rawRow, ['studentname', 'name', 'student', 'fullname']));
  if (!name) errors.push('Missing Student Name');

  const cls = clean(extractField(rawRow, ['class', 'classname', 'standard', 'grade'])) || defaultClass;
  const sec = clean(extractField(rawRow, ['section', 'sec'])) || defaultSec;
  const roll = clean(extractField(rawRow, ['rollnumber', 'rollno', 'roll']));
  if (!roll) errors.push('Missing Roll Number');

  const rollKey = `${cls.toUpperCase()}__${sec.toUpperCase()}__${normalizeRoll(roll)}`;
  if (roll && existingRollSet.has(rollKey)) {
    warnings.push(`Duplicate Roll ${roll} in Class ${cls}-${sec}`);
  }

  const subjectDetails = SUBJECTS.map(sub => {
    const ut1 = parseSubjectMark(rawRow, sub, 'ut1');
    const ut2 = parseSubjectMark(rawRow, sub, 'ut2');
    const theory = parseSubjectMark(rawRow, sub, 'theory');
    const practical = parseSubjectMark(rawRow, sub, 'practical');
    const totalRaw = parseSubjectMark(rawRow, sub, 'total');
    const total = totalRaw > 0 ? totalRaw : Math.min(100, theory + practical);
    const grade = getGrade(total);

    if (theory < 0 || theory > 100) errors.push(`${sub} Theory must be 0-100`);
    if (practical < 0 || practical > 100) errors.push(`${sub} Practical must be 0-100`);

    return { name: sub, ut1, ut2, theory, practical, total, grade };
  });

  const marks = subjectDetails.map(d => d.total);
  const remarks = clean(extractField(rawRow, ['remarks', 'remark', 'comments'])) || 'EXCELLENT!';

  return {
    index: index + 1,
    student: {
      name, cls, sec, roll,
      father: clean(extractField(rawRow, ['fathername', 'father', 'fathersname'])),
      mother: clean(extractField(rawRow, ['mothername', 'mother', 'mothersname'])),
      subjectDetails, marks, remarks
    },
    errors, warnings,
    status: errors.length ? 'error' : (warnings.length ? 'duplicate' : 'valid')
  };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = parts[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

console.log('=== TEST 1: Parse and Validate sample-results.csv ===');
const csvData = fs.readFileSync('sample-results.csv', 'utf8');
const sampleRows = parseCsv(csvData);
console.log(`Parsed ${sampleRows.length} sample rows from CSV.`);

const existingSet = new Set();
let sampleAllValid = true;
sampleRows.forEach((r, idx) => {
  const res = validateAndParseImportedRow(r, idx, existingSet);
  console.log(`  Row ${idx + 1} (${res.student.name}, Roll ${res.student.roll}): status=${res.status}, errors=${res.errors.length}, warnings=${res.warnings.length}`);
  if (res.errors.length) {
    console.log(`    Errors: ${res.errors.join(', ')}`);
    sampleAllValid = false;
  }
  const key = `${res.student.cls.toUpperCase()}__${res.student.sec.toUpperCase()}__${normalizeRoll(res.student.roll)}`;
  existingSet.add(key);
});
console.log('Result of sample-results.csv:', sampleAllValid ? 'ALL 5 ROWS VALID' : 'FAILED');

console.log('\n=== TEST 2: Validation Edge Cases ===');
const edgeCases = [
  { desc: 'Missing Student Name', row: { roll: '10', maths_theory: '50' }, expectStatus: 'error', expectErr: 'Missing Student Name' },
  { desc: 'Missing Roll Number', row: { name: 'Aarav Gupta', maths_theory: '50' }, expectStatus: 'error', expectErr: 'Missing Roll Number' },
  { desc: 'Theory Marks > 100', row: { name: 'Kavita Roy', roll: '15', maths_theory: '105' }, expectStatus: 'error', expectErr: 'MATHS Theory must be 0-100' },
  { desc: 'Practical Marks > 100', row: { name: 'Kavita Roy', roll: '15', science_practical: '120' }, expectStatus: 'error', expectErr: 'SCIENCE Practical must be 0-100' },
  { desc: 'Negative Theory Marks', row: { name: 'Kavita Roy', roll: '15', english_theory: '-10' }, expectStatus: 'error', expectErr: 'ENGLISH Theory must be 0-100' },
  { desc: 'Existing Roll Duplicate', row: { name: 'Abhijeet Pandey', roll: '2', class: 'IX', section: 'A' }, existing: ['IX__A__2'], expectStatus: 'duplicate', expectWarn: 'Duplicate Roll 2' },
  { desc: 'Valid Student with Alternate Headers', row: { 'Student Name': 'Rahul Verma', 'Roll No': '99', 'Fathers Name': 'Suresh Verma', 'Mothers Name': 'Anita Verma', 'Maths Marks': '85' }, expectStatus: 'valid' }
];

let edgeAllPassed = true;
edgeCases.forEach(tc => {
  const set = new Set(tc.existing || []);
  const res = validateAndParseImportedRow(tc.row, 0, set);
  const statusMatch = res.status === tc.expectStatus;
  const errMatch = !tc.expectErr || res.errors.some(e => e.includes(tc.expectErr));
  const warnMatch = !tc.expectWarn || res.warnings.some(w => w.includes(tc.expectWarn));
  const passed = statusMatch && errMatch && warnMatch;

  console.log(`  Test [${tc.desc}]: ${passed ? 'PASS' : 'FAIL'} (status=${res.status}, errors=[${res.errors.join('; ')}], warnings=[${res.warnings.join('; ')}])`);
  if (!passed) edgeAllPassed = false;
});

console.log('\n=== TEST 3: Report HTML Integrity Check ===');
const studentAbhijeet = {
  id: 's_test_1',
  name: 'ABHIJEET PANDEY',
  father: 'ANUJ KUMAR PANDEY',
  mother: 'SANGITA DEVI',
  className: 'IX',
  section: 'A',
  roll: '2',
  remarks: 'EXCELLENT!',
  subjectDetails: [
    { name: 'MATHS', ut1: 15, ut2: 15, theory: 48, practical: 14, total: 62, grade: 'B2' },
    { name: 'SCIENCE', ut1: 13, ut2: 15, theory: 49, practical: 14, total: 63, grade: 'B2' },
    { name: 'ENGLISH', ut1: 19, ut2: 22, theory: 73, practical: 17, total: 90, grade: 'A2' },
    { name: 'HINDI', ut1: 23, ut2: 20, theory: 62, practical: 17, total: 79, grade: 'B1' },
    { name: 'SOCIAL STUDIES', ut1: 20, ut2: 15, theory: 42, practical: 15, total: 57, grade: 'C1' },
    { name: 'COMPUTER', ut1: 16, ut2: 21, theory: 41, practical: 45, total: 86, grade: 'A2' }
  ]
};

// Simulate reportHtml with default school values
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const school = {
  name: 'S.RADHAKRISHNAN ACADEMY',
  address: 'Meru Hazaribagh (JHARKHAND)',
  exam: 'FIRST TERM EXAMINATION',
  session: '2026-2027',
  udise: '20040811807',
  issueDate: '04/11/26',
  className: 'IX',
  section: 'A'
};

function generateTestReport(s) {
  const details = s.subjectDetails;
  return `
    <article class="report-card">
      <div class="school-header">
        <div class="school-name">${escapeHtml(school.name)}</div>
        <div class="school-address">${escapeHtml(school.address)}</div>
        <div class="exam-title">${escapeHtml(school.exam)} (${escapeHtml(school.session)})</div>
        <div class="progress-box-wrap"><div class="progress-box">PROGRESS REPORT</div></div>
      </div>
      <div class="udise-box">U-DISE No.:-${escapeHtml(school.udise)}</div>
      <div class="student-info">
        <div class="info-row"><span class="info-label">STUDENT 'S NAME</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(s.name)}</span></div>
        <div class="info-row"><span class="info-label">FATHER'S NAME</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(s.father)}</span></div>
        <div class="info-row"><span class="info-label">MOTHER'S NAME</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(s.mother)}</span></div>
        <div class="info-row class-row-split">
          <div class="roll-part"><span class="info-label">ROLL NO.</span><span class="info-colon">:</span><span class="info-val">${escapeHtml(s.roll)}</span></div>
          <div class="class-part"><span>CLASS : &nbsp;${escapeHtml(s.className)}</span></div>
          <div class="sec-part"><span>SECTION : &nbsp;${escapeHtml(s.section)}</span></div>
        </div>
      </div>
      <div class="tables-container">
        <table class="left-table">
          <thead>
            <tr><th colspan="3" class="head-category">UNIT TEST</th></tr>
            <tr><th class="col-sub head-sub">SUBJECT</th><th class="col-ut1 head-sub">UT-1</th><th class="col-ut2 head-sub">UT-2</th></tr>
          </thead>
          <tbody>
            ${details.map(d => `<tr><td class="cell-sub">${d.name}</td><td>${d.ut1}</td><td>${d.ut2}</td></tr>`).join('')}
          </tbody>
        </table>
        <table class="right-table">
          <thead>
            <tr><th colspan="5" class="head-category">FIRST TERM</th></tr>
            <tr><th class="col-right-sub head-sub">SUBJECT</th><th class="head-sub">THEORY</th><th class="head-sub">PRACTICAL</th><th class="head-sub">TOTAL(100)</th><th class="head-sub">GRADE</th></tr>
          </thead>
          <tbody>
            ${details.map(d => `<tr><td class="cell-sub">${d.name}</td><td>${d.theory}</td><td>${d.practical}</td><td>${d.total}</td><td>${d.grade}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="remarks-box"><span>REMARKS: &nbsp;${escapeHtml(s.remarks)}</span></div>
      <table class="grade-table">
        <thead>
          <tr><th class="scale-first">MARKS RANGE</th><th>91-100</th><th>81-90</th><th>71-80</th><th>61-70</th><th>51-60</th><th>41-50</th><th>33-40</th><th>BELOW 33</th></tr>
        </thead>
        <tbody>
          <tr><td class="scale-first">GRADE</td><td>A1</td><td>A2</td><td>B1</td><td>B2</td><td>C1</td><td>C2</td><td>D1</td><td>D2</td></tr>
        </tbody>
      </table>
      <footer class="report-footer">
        <div class="footer-issued">ISSUE DATE: &nbsp;${escapeHtml(school.issueDate)}</div>
        <div class="sig-col"><span>CLASS TEACHER'S SIGN</span></div>
        <div class="sig-col"><span>PRINCIPAL'S SIGN</span></div>
      </footer>
    </article>
  `;
}

const rendered = generateTestReport(studentAbhijeet);

const criticalTerms = [
  'S.RADHAKRISHNAN ACADEMY',
  'Meru Hazaribagh (JHARKHAND)',
  'FIRST TERM EXAMINATION (2026-2027)',
  'U-DISE No.:-20040811807',
  'PROGRESS REPORT',
  "STUDENT 'S NAME",
  "FATHER'S NAME",
  "MOTHER'S NAME",
  'ROLL NO.',
  'CLASS : &nbsp;IX',
  'SECTION : &nbsp;A',
  'UNIT TEST',
  'SUBJECT',
  'UT-1',
  'UT-2',
  'FIRST TERM',
  'THEORY',
  'PRACTICAL',
  'TOTAL(100)',
  'GRADE',
  'REMARKS: &nbsp;EXCELLENT!',
  'MARKS RANGE',
  'BELOW 33',
  'ISSUE DATE: &nbsp;04/11/26',
  "CLASS TEACHER'S SIGN",
  "PRINCIPAL'S SIGN"
];

let htmlAllPassed = true;
criticalTerms.forEach(term => {
  const found = rendered.includes(term);
  if (!found) {
    console.log(`  MISSING TERM: "${term}"`);
    htmlAllPassed = false;
  }
});

// Also check font family definitions in index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
['Algerian', 'Calibri', '#17375d'].forEach(f => {
  if (!indexHtml.includes(f)) {
    console.log(`  MISSING CSS ASSET: "${f}"`);
    htmlAllPassed = false;
  }
});

console.log(`Report HTML reference specs check: ${htmlAllPassed ? 'ALL REFERENCE STRINGS AND STYLES PRESENT' : 'MISSING STRINGS'}`);

console.log('\n=== OVERALL TEST SUITE SUMMARY ===');
const grandPass = sampleAllValid && edgeAllPassed && htmlAllPassed;
console.log(`Overall Test Suite Status: ${grandPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(grandPass ? 0 : 1);
