import pandas as pd
import numpy as np

excel_path = r"C:\Users\Juanjo\Downloads\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-05-01_a_2026-05-27_user_60_e3679ba8.xlsx"

print("Reading Excel...")
df = pd.read_excel(excel_path)
print(f"Loaded {len(df)} rows.")

print("\n--- Columns & Types ---")
print(df.dtypes)

print("\n--- Unique values in nbFormaPago ---")
print(df['nbFormaPago'].value_counts(dropna=False))

print("\n--- Unique values in boAfectaVenta ---")
print(df['boAfectaVenta'].value_counts(dropna=False))

print("\n--- Unique values in estadoPlanilla ---")
print(df['estadoPlanilla'].value_counts(dropna=False))

print("\n--- Motivos de Devolucion (when present) ---")
print(df['motivo'].value_counts(dropna=False).head(20))

print("\n--- Unique values in nmProveedor ---")
print(df['nmProveedor'].value_counts(dropna=False))

print("\n--- Date Range of dtFactura ---")
print("Min:", df['dtFactura'].min())
print("Max:", df['dtFactura'].max())

print("\n--- Sales Stats ---")
print("Sum of vlrAntesIva:", df['vlrAntesIva'].sum())
print("Sum of vlrTotalconIva:", df['vlrTotalconIva'].sum())

# Let's save a summary file
summary_path = r"C:\Users\Juanjo\Documents\zentra alpina\data\cubo_summary.txt"
with open(summary_path, 'w', encoding='utf-8') as f:
    f.write(f"Total Rows: {len(df)}\n")
    f.write(f"Date Range: {df['dtFactura'].min()} to {df['dtFactura'].max()}\n")
    f.write(f"Payment Forms:\n{df['nbFormaPago'].value_counts(dropna=False).to_string()}\n")
    f.write(f"Affects Sale:\n{df['boAfectaVenta'].value_counts(dropna=False).to_string()}\n")
    f.write(f"Providers:\n{df['nmProveedor'].value_counts(dropna=False).to_string()}\n")
print(f"Summary written to {summary_path}")
