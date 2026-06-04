#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const inputDir = process.argv[2] || path.join(process.cwd(), 'tmp_processed');
if (!fs.existsSync(inputDir)) {
  console.error('Input directory not found:', inputDir);
  process.exit(1);
}

const chunkArray = (arr, size = 500) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(n) ? n : null;
};

const normalize = (rows) => rows.map(r => {
  const out = {};
  for (const k of Object.keys(r)) {
    const key = k.trim();
    const val = r[k];
    // try to convert numeric-looking fields
    if (typeof val === 'string' && val.match(/^\s*[0-9\.,-]+\s*$/)) out[key] = toNumber(val);
    else out[key] = val;
  }
  return out;
});

async function upsertTable(table, rows, onConflict) {
  if (!rows.length) return { inserted: 0 };
  const chunks = chunkArray(rows, 500);
  let total = 0;
  for (const chunk of chunks) {
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      console.error(`Error upserting into ${table}:`, error.message || error);
      // try fallback to insert to see failing row
      // continue to next chunk
    } else {
      total += chunk.length;
      console.log(`Upserted ${chunk.length} rows into ${table}`);
    }
  }
  return { inserted: total };
}

(async () => {
  console.log('Loading JSON files from', inputDir);
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));
  const summary = {};

  for (const file of files) {
    const name = file.replace(/\.json$/i, '');
    const raw = JSON.parse(fs.readFileSync(path.join(inputDir, file), 'utf8'));
    const rows = normalize(raw);
    try {
      if (/providers?/i.test(name)) {
        const res = await upsertTable('providers', rows, 'proveedor');
        summary['providers'] = res.inserted;
      } else if (/zones?/i.test(name) || /zone/i.test(name)) {
        const res = await upsertTable('zones', rows, 'zona');
        summary['zones'] = res.inserted;
      } else if (/returns_sellers|returnsellers|returns_seller|devoluciones/i.test(name)) {
        // onConflict composite: nombre+ejecutivo (requires DB unique index)
        const res = await upsertTable('returns_sellers', rows, ['nombre', 'ejecutivo']);
        summary['returns_sellers'] = res.inserted;
      } else if (/sales_daily|salesdaily|sales_daily/i.test(name)) {
        // unique by fecha+proveedor+vendedor
        const res = await upsertTable('sales_daily', rows, ['fecha', 'proveedor', 'vendedor']);
        summary['sales_daily'] = res.inserted;
      } else {
        // Unknown sheet — upload to storage as raw JSON under a bucket 'raw_sheets' or skip
        console.log(`Skipping unknown sheet ${file} — consider mapping it manually.`);
        summary[name] = rows.length;
      }
    } catch (e) {
      console.error('Error processing', file, e.message || e);
    }
  }

  console.log('Load summary:', summary);
  console.log('Done.');
})();
