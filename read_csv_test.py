import os
import glob
import time
import pandas as pd

downloads_dir = r"C:\Users\Juanjo\Downloads"
patterns = [
    os.path.join(downloads_dir, "CUBO_DE_VENTAS*.csv"),
]

csv_file = None
for p in patterns:
    files = glob.glob(p)
    if files:
        files.sort(key=os.path.getmtime, reverse=True)
        csv_file = files[0]
        break

if csv_file:
    t0 = time.time()
    # Read first 5 rows with semicolon separator
    df = pd.read_csv(csv_file, sep=';', nrows=5)
    print(f"Loaded 5 rows in {time.time() - t0:.4f} seconds!")
    print("Columns count:", len(df.columns))
    print("Columns list:", df.columns.tolist()[:10], "... and more")
    print("\nFirst row sample:")
    for col in df.columns[:8]:
        print(f"  {col}: {df.iloc[0][col]}")
