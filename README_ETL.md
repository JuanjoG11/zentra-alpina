# ETL for CUBO_DE_VENTAS

Quick loader to process the Excel "CUBO_DE_VENTAS" file, export Parquet partitions and optionally upsert to Supabase.

Usage

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Place the file `CUBO_DE_VENTAS*.xlsx` into the project `data/` folder (the script picks the newest match).

3. Run locally:

```bash
python data/etl.py
```

4. To write partitioned Parquet and upload to Supabase (requires env vars):

```bash
export SUPABASE_URL="https://..."
export SUPABASE_KEY="..."
python data/etl.py --upload --supabase-table sales --conflict-cols invoice_id
```

Notes
- If the file is too large for memory, convert to CSV first or use a streaming approach.
- The script writes `data/parquet_output/` and an audit file `data/load_audit.csv`.
