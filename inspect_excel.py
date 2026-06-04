import pandas as pd
import time

excel_path = r"C:\Users\Juanjo\Downloads\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-05-01_a_2026-05-27_user_60_e3679ba8.xlsx"

print("Loading first 5 rows of Excel...")
t0 = time.time()
try:
    df = pd.read_excel(excel_path, nrows=5)
    print(f"Loaded successfully in {time.time() - t0:.2f} seconds.")
    print("Columns:")
    print(df.columns.tolist())
    print("\nFirst 3 rows:")
    print(df.head(3).to_string())
except Exception as e:
    print("Error:", e)
