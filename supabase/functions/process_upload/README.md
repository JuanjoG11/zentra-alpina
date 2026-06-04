Process Upload Edge Function (stub)

This folder contains a placeholder for a processing function that will be called after an upload.

Strategy options:
- Supabase Edge Function (Deno): implement a Deno script that uses Supabase JS/REST to download the file from Storage, parse using streaming parser and write to Postgres.
- Cloud Run / Cloud Function (Node): deploy `scripts/process_upload_server.js` to a server that will be triggered by Storage webhook.

The repo includes a Node server script `scripts/process_upload_server.js` you can deploy to Cloud Run. If you prefer Edge Functions, translate it to Deno.
