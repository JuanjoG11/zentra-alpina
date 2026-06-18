import pandas as pd

excel_path = r"C:\Users\Juanjo\Downloads\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-06-01_a_2026-06-17_user_60_a46bcd22.xlsx"
print("Loading workbook with pandas (nrows=5)...")
try:
    df = pd.read_excel(excel_path, nrows=5)
    print("Columns:")
    print(list(df.columns))
    print("\nFirst row:")
    print(df.iloc[0].to_dict())
except Exception as e:
    print("Error:", e)
