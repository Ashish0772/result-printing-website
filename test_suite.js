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

function getRemarkForPercentage(pct) {
  if (pct === null || pct === undefined || pct === '') return '';
  const p = Number(pct);
  if (!Number.isFinite(p) || p < 0) return '';
  if (p >= 90) return 'EXCELLENT';
  if (p >= 75) return 'VERY GOOD';
  if (p >= 50) return 'GOOD';
  return 'POOR';
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
  const subAliases = subClean === 'socialstudies' ? ['socialstudies', 'sst'] : [subClean];
  for (const subAlias of subAliases) {
    const target = subAlias + fieldKey;
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
        if (nk === subAlias || nk === subAlias + 'marks' || nk === subAlias + 'mark') {
          const v = Number(row[k]);
          return Number.isFinite(v) ? v : 0;
        }
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
  const student = {
    name, cls, sec, roll,
    father: clean(extractField(rawRow, ['fathername', 'father', 'fathersname'])),
    mother: clean(extractField(rawRow, ['mothername', 'mother', 'mothersname'])),
    subjectDetails, marks,
    remarks: ''
  };
  student.remarks = getStudentRemark(student);

  return {
    index: index + 1,
    student,
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
  remarks: 'GOOD',
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

function getStudentTotalMarks(s) {
  if (!s || typeof s !== 'object') return 0;
  if (Array.isArray(s.subjectDetails) && s.subjectDetails.length > 0) {
    return s.subjectDetails.reduce((sum, d) => sum + (Number(d?.total) || 0), 0);
  }
  if (Array.isArray(s.marks) && s.marks.length > 0) {
    return s.marks.reduce((sum, m) => sum + (Number(m) || 0), 0);
  }
  return 0;
}

function getStudentMaxMarks(s) {
  if (!s || typeof s !== 'object') return 600;
  if (Array.isArray(s.subjectDetails) && s.subjectDetails.length > 0) {
    return s.subjectDetails.length * 100;
  }
  if (Array.isArray(s.marks) && s.marks.length > 0) {
    return s.marks.length * 100;
  }
  return 600;
}

function getStudentRemark(s) {
  if (!s || typeof s !== 'object') return '';
  if (s.status === 'error' || s.isInvalid) return '';

  const details = Array.isArray(s.subjectDetails) ? s.subjectDetails : null;
  const marks = Array.isArray(s.marks) ? s.marks : null;
  if (!details && !marks) return '';
  if (details && details.length === 0) return '';
  if (marks && marks.length === 0) return '';

  if (details) {
    for (const d of details) {
      if (!d || typeof d !== 'object') return '';
      if (d.total === undefined || d.total === null || d.total === '') return '';
      const t = Number(d.total);
      if (!Number.isFinite(t) || t < 0) return '';
    }
  } else if (marks) {
    for (const m of marks) {
      if (m === undefined || m === null || m === '') return '';
      const num = Number(m);
      if (!Number.isFinite(num) || num < 0) return '';
    }
  }

  const total = getStudentTotalMarks(s);
  const max = getStudentMaxMarks(s);
  if (!Number.isFinite(total) || !Number.isFinite(max) || max <= 0) return '';

  const pct = (total / max) * 100;
  if (!Number.isFinite(pct)) return '';

  return getRemarkForPercentage(pct);
}

function calculateTotals(s) {
  const total = getStudentTotalMarks(s);
  const max = getStudentMaxMarks(s);
  const pct = max > 0 ? (total / max) * 100 : 0;
  const grade = getGrade(pct);
  const remark = getStudentRemark(s);
  return { total, max, pct, grade, remark };
}

function isValidStudentRecord(s) {
  if (!s || typeof s !== 'object') return false;
  if (s.status === 'error' || s.isInvalid) return false;
  const name = clean(s.name);
  if (!name) return false;
  const cls = clean(s.className || s.cls);
  const sec = clean(s.section || s.sec);
  if (!cls || !sec) return false;

  const details = Array.isArray(s.subjectDetails) ? s.subjectDetails : null;
  const marks = Array.isArray(s.marks) ? s.marks : null;
  if (!details && !marks) return false;
  if (details && details.length === 0) return false;
  if (marks && marks.length === 0) return false;

  if (details) {
    for (const d of details) {
      if (!d || typeof d !== 'object') return false;
      const t = Number(d.total);
      if (!Number.isFinite(t) || t < 0) return false;
    }
  }
  if (marks) {
    for (const m of marks) {
      const num = Number(m);
      if (!Number.isFinite(num) || num < 0) return false;
    }
  }
  const total = getStudentTotalMarks(s);
  if (!Number.isFinite(total) || total < 0) return false;
  return true;
}

function calculateRanksForList(studentList) {
  const groups = new Map();
  studentList.forEach(s => {
    const cls = clean(s.className || s.cls).toUpperCase();
    const sec = clean(s.section || s.sec).toUpperCase();
    const key = `${cls}__${sec}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });

  groups.forEach(groupStudents => {
    const validStudents = groupStudents.filter(isValidStudentRecord);

    groupStudents.forEach(s => {
      if (!isValidStudentRecord(s)) {
        s.rank = null;
        return;
      }
      const sTotal = getStudentTotalMarks(s);
      // Formula: Rank = 1 + number of valid students in the same class and section having strictly higher total obtained marks.
      const strictlyHigherCount = validStudents.filter(other => {
        if (other === s) return false;
        return getStudentTotalMarks(other) > sTotal;
      }).length;
      s.rank = 1 + strictlyHigherCount;
    });
  });
}

function getStudentRank(s, contextList = []) {
  if (!isValidStudentRecord(s)) return null;
  const cls = clean(s.className || s.cls).toUpperCase();
  const sec = clean(s.section || s.sec).toUpperCase();
  if (!cls || !sec) return null;

  if (!Array.isArray(contextList) || contextList.length === 0) {
    if (s.rank && Number.isInteger(Number(s.rank)) && Number(s.rank) >= 1) {
      return Number(s.rank);
    }
    return null;
  }

  const validCohort = contextList.filter(other => {
    if (!isValidStudentRecord(other)) return false;
    return clean(other.className || other.cls).toUpperCase() === cls &&
           clean(other.section || other.sec).toUpperCase() === sec;
  });

  const sTotal = getStudentTotalMarks(s);
  const strictlyHigherCount = validCohort.filter(other => {
    if (s.id && other.id === s.id) return false;
    if (other === s) return false;
    return getStudentTotalMarks(other) > sTotal;
  }).length;

  return 1 + strictlyHigherCount;
}

function generateTestReport(s, contextList = []) {
  let details = s.subjectDetails;
  if (!Array.isArray(details) || details.length !== 6) {
    const mList = Array.isArray(s.marks) ? s.marks : [0, 0, 0, 0, 0, 0];
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

  const total = getStudentTotalMarks(s);
  const max = getStudentMaxMarks(s);
  const totalMarksStr = `${total} / ${max}`;

  let displayRank = 'Rank unavailable';
  if (isValidStudentRecord(s)) {
    if (s.rank && Number.isInteger(Number(s.rank)) && Number(s.rank) >= 1) {
      displayRank = String(s.rank);
    } else if (Array.isArray(contextList) && contextList.length > 0) {
      const computed = getStudentRank(s, contextList);
      if (computed && computed >= 1) {
        displayRank = String(computed);
      }
    }
  }

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
          <div class="class-part"><span>CLASS : &nbsp;${escapeHtml(s.className || s.cls)}</span></div>
          <div class="sec-part"><span>SECTION : &nbsp;${escapeHtml(s.section || s.sec)}</span></div>
          <div class="rank-part"><span>CLASS RANK: ${escapeHtml(String(displayRank))}</span></div>
          <div class="total-marks-part"><span>TOTAL MARKS: ${escapeHtml(String(totalMarksStr))}</span></div>
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

// Abhijeet in a single student class context has Rank 1
studentAbhijeet.rank = 1;
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
  'CLASS RANK: 1',
  'TOTAL MARKS: 437 / 600',
  'UNIT TEST',
  'SUBJECT',
  'UT-1',
  'UT-2',
  'FIRST TERM',
  'THEORY',
  'PRACTICAL',
  'TOTAL(100)',
  'GRADE',
  'REMARKS: &nbsp;GOOD',
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

// Also check font family definitions and rank classes in index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
['Algerian', 'Calibri', '#17375d', '.rank-part', '.total-marks-part', 'CLASS RANK:', 'TOTAL MARKS:'].forEach(f => {
  if (!indexHtml.includes(f)) {
    console.log(`  MISSING CSS/HTML ASSET: "${f}"`);
    htmlAllPassed = false;
  }
});

console.log(`Report HTML reference specs check: ${htmlAllPassed ? 'ALL REFERENCE STRINGS AND STYLES PRESENT' : 'MISSING STRINGS'}`);

console.log('\n=== TEST 4: Student Rank Calculation & Competition Ranking ===');
let rankAllPassed = true;

// 4.1 Specification Example: Class 10-A
// Student A: 550 marks → Rank 1
// Student B: 520 marks → Rank 2
// Student C: 520 marks → Rank 2
// Student D: 480 marks → Rank 4
// Student E: 450 marks → Rank 5
const testStudents10A = [
  { id: '1', name: 'Student A', className: '10', section: 'A', marks: [100, 95, 95, 90, 85, 85] }, // 550
  { id: '2', name: 'Student B', className: '10', section: 'A', marks: [90, 90, 85, 85, 85, 85] },  // 520
  { id: '3', name: 'Student C', className: '10', section: 'A', marks: [92, 88, 85, 85, 85, 85] },  // 520
  { id: '4', name: 'Student D', className: '10', section: 'A', marks: [80, 80, 80, 80, 80, 80] },  // 480
  { id: '5', name: 'Student E', className: '10', section: 'A', marks: [75, 75, 75, 75, 75, 75] }   // 450
];

calculateRanksForList(testStudents10A);

const expectedRanks = { 'Student A': 1, 'Student B': 2, 'Student C': 2, 'Student D': 4, 'Student E': 5 };
let t4_1Passed = true;
testStudents10A.forEach(s => {
  const exp = expectedRanks[s.name];
  const pass = s.rank === exp;
  console.log(`  Test 4.1 [Class 10-A Competition Rank]: ${s.name} (${getStudentTotalMarks(s)} marks) -> Expected Rank ${exp}, got ${s.rank} : ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) t4_1Passed = false;
});
if (!t4_1Passed) rankAllPassed = false;

// 4.2 Equal marks at Rank 1 (Tied winners)
const tiedWinners = [
  { id: 't1', name: 'Topper 1', className: 'X', section: 'B', marks: [100, 100, 100, 100, 100, 100] }, // 600
  { id: 't2', name: 'Topper 2', className: 'X', section: 'B', marks: [100, 100, 100, 100, 100, 100] }, // 600
  { id: 't3', name: 'Follower', className: 'X', section: 'B', marks: [90, 90, 90, 90, 90, 90] }         // 540
];
calculateRanksForList(tiedWinners);
const t4_2Passed = tiedWinners[0].rank === 1 && tiedWinners[1].rank === 1 && tiedWinners[2].rank === 3;
console.log(`  Test 4.2 [Tied Rank 1 -> Next Rank 3]: ${t4_2Passed ? 'PASS' : 'FAIL'} (ranks=[${tiedWinners.map(s => s.rank).join(', ')}])`);
if (!t4_2Passed) rankAllPassed = false;

// 4.3 Section and Class Isolation (Compare only within same Class and Section)
const mixedCohort = [
  { id: 'm1', name: 'Class IX-A Star', className: 'IX', section: 'A', marks: [50, 50, 50, 50, 50, 50] }, // 300 -> Rank 1 in IX-A
  { id: 'm2', name: 'Class IX-A Runner', className: 'IX', section: 'A', marks: [40, 40, 40, 40, 40, 40] }, // 240 -> Rank 2 in IX-A
  { id: 'm3', name: 'Class IX-B High', className: 'IX', section: 'B', marks: [90, 90, 90, 90, 90, 90] }, // 540 -> Rank 1 in IX-B
  { id: 'm4', name: 'Class X-A Topper', className: 'X', section: 'A', marks: [95, 95, 95, 95, 95, 95] }   // 570 -> Rank 1 in X-A
];
calculateRanksForList(mixedCohort);
const t4_3Passed = mixedCohort[0].rank === 1 && mixedCohort[1].rank === 2 && mixedCohort[2].rank === 1 && mixedCohort[3].rank === 1;
console.log(`  Test 4.3 [Section & Class Independence]: ${t4_3Passed ? 'PASS' : 'FAIL'} (IX-A Star Rank=${mixedCohort[0].rank}, IX-B High Rank=${mixedCohort[2].rank}, X-A Topper Rank=${mixedCohort[3].rank})`);
if (!t4_3Passed) rankAllPassed = false;

// 4.4 Incomplete / Invalid records handling
const cohortWithInvalid = [
  { id: 'v1', name: 'Valid High', className: 'IX', section: 'C', marks: [80, 80, 80, 80, 80, 80] }, // 480 -> Rank 1
  { id: 'inv1', name: '', className: 'IX', section: 'C', marks: [90, 90, 90, 90, 90, 90] },         // Missing name -> Invalid
  { id: 'inv2', name: 'No Marks', className: 'IX', section: 'C', marks: [] },                         // Missing marks -> Invalid
  { id: 'v2', name: 'Valid Low', className: 'IX', section: 'C', marks: [60, 60, 60, 60, 60, 60] }   // 360 -> Rank 2
];
calculateRanksForList(cohortWithInvalid);
const t4_4Passed = cohortWithInvalid[0].rank === 1 &&
                   cohortWithInvalid[1].rank === null &&
                   cohortWithInvalid[2].rank === null &&
                   cohortWithInvalid[3].rank === 2;
console.log(`  Test 4.4 [Invalid records ignored and given null rank]: ${t4_4Passed ? 'PASS' : 'FAIL'} (validHigh=${cohortWithInvalid[0].rank}, invalid1=${cohortWithInvalid[1].rank}, validLow=${cohortWithInvalid[3].rank})`);
if (!t4_4Passed) rankAllPassed = false;

// 4.5 "Rank unavailable" when class data unavailable or record invalid
const standaloneStudent = { name: 'Lone Ranger', marks: [50, 50, 50, 50, 50, 50], className: 'IX', section: 'A' };
const standaloneReport = generateTestReport(standaloneStudent, []);
const t4_5Passed = standaloneReport.includes('CLASS RANK: Rank unavailable');
console.log(`  Test 4.5 [Display 'Rank unavailable' when class data unavailable]: ${t4_5Passed ? 'PASS' : 'FAIL'}`);
if (!t4_5Passed) rankAllPassed = false;

// 4.6 Dynamic recalculation after Adding, Editing, Deleting
const dynamicList = [
  { id: 'd1', name: 'Alpha', className: 'VIII', section: 'A', marks: [60, 60, 60, 60, 60, 60] }, // 360
  { id: 'd2', name: 'Beta', className: 'VIII', section: 'A', marks: [50, 50, 50, 50, 50, 50] }   // 300
];
calculateRanksForList(dynamicList);
const initialPassed = dynamicList[0].rank === 1 && dynamicList[1].rank === 2;

// ADD new student Gamma with 400 marks
dynamicList.push({ id: 'd3', name: 'Gamma', className: 'VIII', section: 'A', marks: [70, 70, 70, 70, 60, 60] }); // 400
calculateRanksForList(dynamicList);
const afterAddPassed = dynamicList.find(s => s.name === 'Gamma').rank === 1 &&
                       dynamicList.find(s => s.name === 'Alpha').rank === 2 &&
                       dynamicList.find(s => s.name === 'Beta').rank === 3;

// EDIT Beta's marks to 500
const beta = dynamicList.find(s => s.name === 'Beta');
beta.marks = [90, 90, 80, 80, 80, 80]; // 500
calculateRanksForList(dynamicList);
const afterEditPassed = dynamicList.find(s => s.name === 'Beta').rank === 1 &&
                        dynamicList.find(s => s.name === 'Gamma').rank === 2 &&
                        dynamicList.find(s => s.name === 'Alpha').rank === 3;

// DELETE Beta
const dynamicRemaining = dynamicList.filter(s => s.name !== 'Beta');
calculateRanksForList(dynamicRemaining);
const afterDeletePassed = dynamicRemaining.find(s => s.name === 'Gamma').rank === 1 &&
                          dynamicRemaining.find(s => s.name === 'Alpha').rank === 2;

const t4_6Passed = initialPassed && afterAddPassed && afterEditPassed && afterDeletePassed;
console.log(`  Test 4.6 [Recalculation on Add, Edit, Delete]: ${t4_6Passed ? 'PASS' : 'FAIL'}`);
if (!t4_6Passed) rankAllPassed = false;

// 4.7 Bulk Import sample-results.csv verification
const importedStudents = sampleRows.map((r, i) => validateAndParseImportedRow(r, i, new Set()).student);
calculateRanksForList(importedStudents);
const seema = importedStudents.find(s => s.name === 'SEEMA KUMARI');
const abhijeet = importedStudents.find(s => s.name === 'ABHIJEET PANDEY');
const rohan = importedStudents.find(s => s.name === 'ROHAN SHARMA');
const priya = importedStudents.find(s => s.name === 'PRIYA KUMARI');
const vikram = importedStudents.find(s => s.name === 'VIKRAM SINGH');

const t4_7Passed = seema.rank === 1 && abhijeet.rank === 2 && rohan.rank === 3 &&
                   priya.rank === 1 && vikram.rank === 2;
console.log(`  Test 4.7 [sample-results.csv Ranks]: ${t4_7Passed ? 'PASS' : 'FAIL'} (IX-A: Seema=${seema.rank}, Abhijeet=${abhijeet.rank}, Rohan=${rohan.rank} | IX-B: Priya=${priya.rank}, Vikram=${vikram.rank})`);
if (!t4_7Passed) rankAllPassed = false;

// 4.8 Marksheet Display contains TOTAL MARKS and CLASS RANK
const abhijeetReport = generateTestReport(abhijeet, importedStudents);
const hasTotalMarksField = abhijeetReport.includes('TOTAL MARKS: 437 / 600');
const hasClassRankField = abhijeetReport.includes('CLASS RANK: 2');
const t4_8Passed = hasTotalMarksField && hasClassRankField;
console.log(`  Test 4.8 [Marksheet display fields TOTAL MARKS and CLASS RANK]: ${t4_8Passed ? 'PASS' : 'FAIL'} (totalMarks=${hasTotalMarksField}, classRank=${hasClassRankField})`);
if (!t4_8Passed) rankAllPassed = false;

console.log('\n=== TEST 5: Automatic Student Performance Remarks Verification ===');
let remarksAllPassed = true;

// 5.1 Test specified percentages: 95% (EXCELLENT), 80% (VERY GOOD), 65% (GOOD), 40% (POOR)
const tierTests = [
  { pct: 95, expected: 'EXCELLENT', label: '95% -> EXCELLENT' },
  { pct: 80, expected: 'VERY GOOD', label: '80% -> VERY GOOD' },
  { pct: 65, expected: 'GOOD', label: '65% -> GOOD' },
  { pct: 40, expected: 'POOR', label: '40% -> POOR' }
];
let t5_1Passed = true;
tierTests.forEach(tc => {
  const actual = getRemarkForPercentage(tc.pct);
  const pass = actual === tc.expected;
  console.log(`  Test 5.1 [${tc.label}]: Expected "${tc.expected}", got "${actual}" : ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) t5_1Passed = false;
});
if (!t5_1Passed) remarksAllPassed = false;

// 5.2 Test boundary values: 100%, 90% (EXCELLENT), 89.99%, 75% (VERY GOOD), 74.99%, 50% (GOOD), 49.99%, 0% (POOR)
const boundaryTests = [
  { pct: 100, expected: 'EXCELLENT', label: 'Boundary 100% -> EXCELLENT' },
  { pct: 90, expected: 'EXCELLENT', label: 'Boundary 90% -> EXCELLENT' },
  { pct: 89.99, expected: 'VERY GOOD', label: 'Boundary 89.99% -> VERY GOOD' },
  { pct: 75, expected: 'VERY GOOD', label: 'Boundary 75% -> VERY GOOD' },
  { pct: 74.99, expected: 'GOOD', label: 'Boundary 74.99% -> GOOD' },
  { pct: 50, expected: 'GOOD', label: 'Boundary 50% -> GOOD' },
  { pct: 49.99, expected: 'POOR', label: 'Boundary 49.99% -> POOR' },
  { pct: 0, expected: 'POOR', label: 'Boundary 0% -> POOR' }
];
let t5_2Passed = true;
boundaryTests.forEach(tc => {
  const actual = getRemarkForPercentage(tc.pct);
  const pass = actual === tc.expected;
  console.log(`  Test 5.2 [${tc.label}]: Expected "${tc.expected}", got "${actual}" : ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) t5_2Passed = false;
});
if (!t5_2Passed) remarksAllPassed = false;

// 5.3 Missing / Invalid marks handling (safe handling, no misleading remark)
const invalidRecords = [
  { desc: 'Missing marks array', student: { name: 'No Marks', className: 'IX', section: 'A', marks: [] } },
  { desc: 'Null student object', student: null },
  { desc: 'Student with error status', student: { name: 'Err', className: 'IX', section: 'A', status: 'error', marks: [80, 80] } },
  { desc: 'Student with isInvalid flag', student: { name: 'Inv', className: 'IX', section: 'A', isInvalid: true, marks: [80, 80] } },
  { desc: 'Negative marks', student: { name: 'Neg', className: 'IX', section: 'A', marks: [50, -10, 60] } },
  { desc: 'Missing mark entry (null in marks)', student: { name: 'Hole', className: 'IX', section: 'A', marks: [90, null, 90] } },
  { desc: 'Non-numeric mark', student: { name: 'NaNMark', className: 'IX', section: 'A', marks: [90, 'abc', 90] } },
  { desc: 'Invalid subjectDetails item', student: { name: 'BadSub', className: 'IX', section: 'A', subjectDetails: [{ total: 80 }, { total: null }] } }
];
let t5_3Passed = true;
invalidRecords.forEach(tc => {
  const actual = getStudentRemark(tc.student);
  const pass = actual === '';
  console.log(`  Test 5.3 [Safe missing/invalid marks - ${tc.desc}]: Expected "", got "${actual}" : ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) t5_3Passed = false;
});
if (!t5_3Passed) remarksAllPassed = false;

// 5.4 Dynamic calculation when student marks are edited
const dynamicStudent = {
  id: 'dyn_1',
  name: 'Dynamic Student',
  className: 'IX',
  section: 'A',
  roll: '10',
  marks: [95, 95, 95, 95, 95, 95] // 570 / 600 = 95% -> EXCELLENT
};
const r1 = getStudentRemark(dynamicStudent);
const step1 = r1 === 'EXCELLENT';

// Edit to 80% (total 480)
dynamicStudent.marks = [80, 80, 80, 80, 80, 80];
const r2 = getStudentRemark(dynamicStudent);
const step2 = r2 === 'VERY GOOD';

// Edit to 65% (total 390)
dynamicStudent.marks = [65, 65, 65, 65, 65, 65];
const r3 = getStudentRemark(dynamicStudent);
const step3 = r3 === 'GOOD';

// Edit to 40% (total 240)
dynamicStudent.marks = [40, 40, 40, 40, 40, 40];
const r4 = getStudentRemark(dynamicStudent);
const step4 = r4 === 'POOR';

const t5_4Passed = step1 && step2 && step3 && step4;
console.log(`  Test 5.4 [Dynamic update on mark change]: 95%->${r1}, 80%->${r2}, 65%->${r3}, 40%->${r4} : ${t5_4Passed ? 'PASS' : 'FAIL'}`);
if (!t5_4Passed) remarksAllPassed = false;

// 5.5 Marksheet PDF / HTML display test
const student95 = { name: 'Top Student', marks: [95, 95, 95, 95, 95, 95], remarks: 'EXCELLENT' };
const student80 = { name: 'High Student', marks: [80, 80, 80, 80, 80, 80], remarks: 'VERY GOOD' };
const student65 = { name: 'Mid Student', marks: [65, 65, 65, 65, 65, 65], remarks: 'GOOD' };
const student40 = { name: 'Low Student', marks: [40, 40, 40, 40, 40, 40], remarks: 'POOR' };

const rep95 = generateTestReport(student95);
const rep80 = generateTestReport(student80);
const rep65 = generateTestReport(student65);
const rep40 = generateTestReport(student40);

const has95 = rep95.includes('REMARKS: &nbsp;EXCELLENT');
const has80 = rep80.includes('REMARKS: &nbsp;VERY GOOD');
const has65 = rep65.includes('REMARKS: &nbsp;GOOD');
const has40 = rep40.includes('REMARKS: &nbsp;POOR');
const t5_5Passed = has95 && has80 && has65 && has40;
console.log(`  Test 5.5 [Report card HTML remarks display]: 95%=${has95}, 80%=${has80}, 65%=${has65}, 40%=${has40} : ${t5_5Passed ? 'PASS' : 'FAIL'}`);
if (!t5_5Passed) remarksAllPassed = false;

// 5.6 Bulk Import sample-results.csv dynamic remarks check
// Seema: 487/600 = 81.17% -> VERY GOOD
// Priya: 517/600 = 86.17% -> VERY GOOD
// Abhijeet: 437/600 = 72.83% -> GOOD
// Rohan: 416/600 = 69.33% -> GOOD
// Vikram: 349/600 = 58.17% -> GOOD
const t5_6Passed = seema.remarks === 'VERY GOOD' &&
                   priya.remarks === 'VERY GOOD' &&
                   abhijeet.remarks === 'GOOD' &&
                   rohan.remarks === 'GOOD' &&
                   vikram.remarks === 'GOOD';
console.log(`  Test 5.6 [sample-results.csv Bulk Import Remarks]: ${t5_6Passed ? 'PASS' : 'FAIL'}`);
console.log(`    Seema (${getStudentTotalMarks(seema)}/600 = 81.17%): ${seema.remarks} (Expected: VERY GOOD)`);
console.log(`    Priya (${getStudentTotalMarks(priya)}/600 = 86.17%): ${priya.remarks} (Expected: VERY GOOD)`);
console.log(`    Abhijeet (${getStudentTotalMarks(abhijeet)}/600 = 72.83%): ${abhijeet.remarks} (Expected: GOOD)`);
console.log(`    Rohan (${getStudentTotalMarks(rohan)}/600 = 69.33%): ${rohan.remarks} (Expected: GOOD)`);
console.log(`    Vikram (${getStudentTotalMarks(vikram)}/600 = 58.17%): ${vikram.remarks} (Expected: GOOD)`);
if (!t5_6Passed) remarksAllPassed = false;

// 5.7 Additional Bulk Import test with all four tiers: EXCELLENT (95%), VERY GOOD (80%), GOOD (65%), POOR (40%)
const tierCsvRows = [
  { name: 'Topper', roll: '101', maths_total: '95', science_total: '95', english_total: '95', hindi_total: '95', sst_total: '95', computer_total: '95', remarks: 'MANUAL TYPED WRONG' },
  { name: 'Achiever', roll: '102', maths_total: '80', science_total: '80', english_total: '80', hindi_total: '80', sst_total: '80', computer_total: '80', remarks: 'HARDCODED BAD' },
  { name: 'Passer', roll: '103', maths_total: '65', science_total: '65', english_total: '65', hindi_total: '65', sst_total: '65', computer_total: '65', remarks: 'OLD REMARK' },
  { name: 'Struggler', roll: '104', maths_total: '40', science_total: '40', english_total: '40', hindi_total: '40', sst_total: '40', computer_total: '40', remarks: 'SHOULD BE OVERRIDDEN' }
];
const parsedTierStudents = tierCsvRows.map((r, i) => validateAndParseImportedRow(r, i, new Set()).student);
const topperPass = parsedTierStudents[0].remarks === 'EXCELLENT';
const achieverPass = parsedTierStudents[1].remarks === 'VERY GOOD';
const passerPass = parsedTierStudents[2].remarks === 'GOOD';
const strugglerPass = parsedTierStudents[3].remarks === 'POOR';
const t5_7Passed = topperPass && achieverPass && passerPass && strugglerPass;
console.log(`  Test 5.7 [Bulk Import overrides manual/CSV remarks with accurate calculated remarks]: ${t5_7Passed ? 'PASS' : 'FAIL'} (Topper=${parsedTierStudents[0].remarks}, Achiever=${parsedTierStudents[1].remarks}, Passer=${parsedTierStudents[2].remarks}, Struggler=${parsedTierStudents[3].remarks})`);
if (!t5_7Passed) remarksAllPassed = false;

console.log('\n=== OVERALL TEST SUITE SUMMARY ===');
const grandPass = sampleAllValid && edgeAllPassed && htmlAllPassed && rankAllPassed && remarksAllPassed;
console.log(`Overall Test Suite Status: ${grandPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
process.exit(grandPass ? 0 : 1);
