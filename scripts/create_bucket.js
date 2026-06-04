#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_KEY in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  const bucket = 'uploads';
  const { data, error } = await supabase.storage.createBucket(bucket, { public: false });
  if (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('Bucket already exists:', bucket);
    } else {
      console.error('Error creating bucket:', error.message || error);
      process.exit(1);
    }
  } else {
    console.log('Created bucket:', data.name);
  }
})();
