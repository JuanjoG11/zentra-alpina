#!/usr/bin/env node
// Simple Express server to receive webhook with storage path and process the file
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const xlsx = require('xlsx');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/process', async (req, res) => {
  try {
    const { bucket, path: filePath } = req.body;
    if (!bucket || !filePath) return res.status(400).send('Missing bucket or path');

    // Download file
    const { data: getData, error: errUrl } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (errUrl) {
      console.error('Error getting public URL', errUrl);
      return res.status(500).send('Error getting public URL');
    }
    const publicURL = getData && (getData.publicUrl || getData.publicURL || getData.url);
    if (!publicURL) {
      console.error('No public URL returned for', filePath);
      return res.status(500).send('No public URL');
    }

    const tmpFile = path.join(process.cwd(), 'tmp_download.xlsx');
    const writer = fs.createWriteStream(tmpFile);
    const response = await axios.get(publicURL, { responseType: 'stream' });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Parse and convert sheets to JSON and call load_to_db flow
    const wb = xlsx.readFile(tmpFile, { cellDates: true });
    const tmpDir = path.join(process.cwd(), 'tmp_processed');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    wb.SheetNames.forEach(name => {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[name], { defval: null });
      const fname = `${name.replace(/[^a-z0-9]/gi, '_')}.json`;
      fs.writeFileSync(path.join(tmpDir, fname), JSON.stringify(rows, null, 2));
    });

    // Now call local loader (reuse scripts/load_to_db.js) by spawning a child process
    const { spawn } = require('child_process');
    const loader = spawn('node', [path.join(process.cwd(), 'scripts', 'load_to_db.js'), tmpDir], { stdio: 'inherit' });
    loader.on('close', (code) => {
      if (code === 0) {
        res.send('Processed');
      } else {
        res.status(500).send('Loader failed');
      }
    });

  } catch (e) {
    console.error(e);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Process server listening on', PORT));
