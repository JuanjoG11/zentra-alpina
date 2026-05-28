# Alpina BI Platform - Automated Python ETL Pipeline
# Ingests, cleans, and normalizes Excel/CSV files into Supabase PostgreSQL

import os
import re
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Requires service role key to bypass RLS for inserts

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment. ETL running in test mode.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ----------------- Cleaning Helpers -----------------

def clean_money(val):
    """Converts money strings (e.g. '$ 184,814,613' or '-$ 5,945') to float."""
    if pd.isna(val) or val == '' or val == '-':
        return 0.0
    
    val_str = str(val).strip()
    is_negative = '-' in val_str
    
    # Remove currency symbol, spaces, negative sign, and commas
    cleaned = re.sub(r'[-\$\"\s]', '', val_str).replace(',', '')
    try:
        num = float(cleaned)
        return -num if is_negative else num
    except ValueError:
        return 0.0

def clean_percent(val):
    """Converts percent strings (e.g. '47.1%' or '0.5%') to float ratio (e.g. 0.471)."""
    if pd.isna(val) or val == '':
        return 0.0
    
    val_str = str(val).replace('%', '').strip()
    try:
        return float(val_str) / 100.0
    except ValueError:
        return 0.0

def clean_integer(val):
    """Converts integers safely."""
    if pd.isna(val):
        return 0
    try:
        return int(str(val).replace(',', '').strip())
    except ValueError:
        return 0

# ----------------- ETL Execution -----------------

def etl_ventas_proveedor():
    print("Processing: ventas_proveedor.csv...")
    df = pd.read_csv("data/ventas_proveedor.csv", skiprows=8) # Skips summary lines
    
    records = []
    for _, row in df.iterrows():
        name = str(row.iloc[0]).strip()
        if (
            pd.isna(row.iloc[0]) or 
            name in ['Etiquetas de fila', 'Total general'] or
            name.startswith('SEGUIMIENTO') or 
            name.startswith('CIUDAD') or 
            name.startswith('MES')
        ):
            continue
            
        provider_data = {
            "nombre": name,
            "categoria": "General"
        }
        # Insert provider master (ignore conflicts)
        if supabase:
            try:
                supabase.table("proveedores").upsert(provider_data, on_conflict="nombre").execute()
            except Exception as e:
                print(f"Error upserting provider {name}: {e}")
        else:
            print(f"Mock: Upsert provider {name}")

def etl_ventas_credito_contado():
    print("Processing: ventas_credito_contado.csv...")
    # Read CSV and locate the daily section
    df = pd.read_csv("data/ventas_credito_contado.csv")
    
    # Find row index where daily data starts
    start_idx = None
    for idx, row in df.iterrows():
        if str(row.iloc[0]).startswith("FECHA"):
            start_idx = idx
            break
            
    if start_idx is None:
        print("Error: Could not locate daily sales header.")
        return
        
    df_daily = pd.read_csv("data/ventas_credito_contado.csv", skiprows=start_idx + 1)
    
    sales_rows = []
    for _, row in df_daily.iterrows():
        fecha = str(row.iloc[0]).strip()
        if pd.isna(row.iloc[0]) or fecha == 'Total general' or fecha == '':
            continue
            
        # Sales credit vs cash rows
        # Cash record
        cash_val = clean_money(row.iloc[1])
        if cash_val != 0:
            sales_rows.append({
                "fecha": pd.to_datetime(fecha, format="%m/%d/%Y").strftime("%Y-%m-%d"),
                "ciudad": "PEREIRA",
                "zona": "EJE",
                "vendedor": "General",
                "proveedor": "Varios",
                "producto": "Ventas Contado",
                "cantidad": 1,
                "valor": cash_val,
                "tipo_pago": "CONTADO",
                "facturas": 1
            })
            
        # Credit record
        credit_val = clean_money(row.iloc[2])
        if credit_val != 0:
            sales_rows.append({
                "fecha": pd.to_datetime(fecha, format="%m/%d/%Y").strftime("%Y-%m-%d"),
                "ciudad": "PEREIRA",
                "zona": "EJE",
                "vendedor": "General",
                "proveedor": "Varios",
                "producto": "Ventas Crédito",
                "cantidad": 1,
                "valor": credit_val,
                "tipo_pago": "CREDITO",
                "facturas": 1
            })

    if supabase and sales_rows:
        try:
            supabase.table("ventas").insert(sales_rows).execute()
            print(f"Successfully inserted {len(sales_rows)} sales records into Supabase.")
        except Exception as e:
            print(f"Error inserting sales: {e}")
    else:
        print(f"Mock: Prepared {len(sales_rows)} sales records for insert.")

def etl_devoluciones():
    print("Processing: devoluciones.csv...")
    df = pd.read_csv("data/devoluciones.csv")
    
    # Extract client returns section starting with 'EJECUTIVO,NOMCLIENTE'
    start_idx = None
    for idx, row in df.iterrows():
        if str(row.iloc[0]).startswith("EJECUTIVO") and str(row.iloc[1]).startswith("NOMCLIENTE"):
            start_idx = idx
            break
            
    if start_idx is None:
        print("Error: Could not locate client returns section.")
        return
        
    df_clients = pd.read_csv("data/devoluciones.csv", skiprows=start_idx + 1)
    
    return_rows = []
    for _, row in df_clients.iterrows():
        ejecutivo = str(row.iloc[0]).strip()
        cliente = str(row.iloc[1]).strip()
        concepto = str(row.iloc[2]).strip()
        valor = clean_money(row.iloc[3])
        
        if pd.isna(row.iloc[0]) or ejecutivo == 'EJECUTIVO' or ejecutivo == 'Total general' or valor == 0:
            continue
            
        return_rows.append({
            "concepto": concepto,
            "proveedor": "ALPINA", # Primary provider associated with returns sheet
            "vendedor": ejecutivo,
            "ciudad": "MANIZALES",
            "valor": valor,
            "porcentaje": 0.0 # Can be calculated relatively
        })

    if supabase and return_rows:
        try:
            # Batch inserts to avoid payload size limit
            batch_size = 100
            for i in range(0, len(return_rows), batch_size):
                supabase.table("devoluciones").insert(return_rows[i:i+batch_size]).execute()
            print(f"Successfully inserted {len(return_rows)} returns records into Supabase.")
        except Exception as e:
            print(f"Error inserting returns: {e}")
    else:
        print(f"Mock: Prepared {len(return_rows)} returns records for insert.")

if __name__ == "__main__":
    print("--- Starting ETL Pipeline ---")
    etl_ventas_proveedor()
    etl_ventas_credito_contado()
    etl_devoluciones()
    print("--- ETL Pipeline Completed ---")
