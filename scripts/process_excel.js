#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

if (process.argv.length < 3) {
  console.error('Usage: node process_excel.js path/to/file.xlsx');
  process.exit(1);
}

const infile = process.argv[2];
if (!fs.existsSync(infile)) {
  console.error('File not found:', infile);
  process.exit(1);
}

console.log('Reading', infile);
const wb = xlsx.readFile(infile, { cellDates: true });

// Heurística simple: mapear hojas por nombre y exportar JSON
const outputDir = path.join(process.cwd(), 'tmp_processed');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const sheetNames = wb.SheetNames;
console.log('Sheets found:', sheetNames.join(', '));

const normalizeRows = (rows) => {
  // Normal minimal cleaning: trim string values
  return rows.map(r => {
    const out = {};
    Object.keys(r).forEach(k => {
      const v = r[k];
      if (typeof v === 'string') out[k.trim()] = v.trim();
      else out[k.trim()] = v;
    });
    return out;
  });
};

sheetNames.forEach(name => {
  try {
    const ws = wb.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: null });
    const normalized = normalizeRows(rows);
    const fname = `${name.replace(/[^a-z0-9]/gi, '_')}.json`;
    fs.writeFileSync(path.join(outputDir, fname), JSON.stringify(normalized, null, 2));
    console.log('Wrote', fname, 'rows:', normalized.length);
  } catch (e) {
    console.error('Error processing sheet', name, e.message);
  }
});

console.log('Processing finished. Output in', outputDir);

// Optional: print summary counts
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.json'));
const summary = {};
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(outputDir, f)));
  summary[f] = data.length;
});
console.log('Summary:', summary);

// Next steps guidance printed for user
console.log('\nNext steps:');
console.log('- Inspect files in ./tmp_processed');
console.log('- Map JSON fields to DB schema and load into Postgres/Supabase');
console.log('- If file is very large, consider streaming or chunked parsing (node streams + CSV conversion)');
