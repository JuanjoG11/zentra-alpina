import pandas as pd
import os
import glob

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
    df = pd.read_csv(csv_file, sep=';', usecols=['nmProducto', 'nmGrupoArticulo', 'nmTpMarca', 'nmTpFamilia', 'vlrTotalconIva'])
    print("Unique Groups in nmGrupoArticulo:")
    g_sums = df.groupby('nmGrupoArticulo')['vlrTotalconIva'].sum().sort_values(ascending=False)
    print(g_sums)
    
    print("\nUnique Groups in nmTpMarca (top 20):")
    m_sums = df.groupby('nmTpMarca')['vlrTotalconIva'].sum().sort_values(ascending=False).head(20)
    print(m_sums)
    
    print("\nUnique Groups in nmTpFamilia (top 20):")
    f_sums = df.groupby('nmTpFamilia')['vlrTotalconIva'].sum().sort_values(ascending=False).head(20)
    print(f_sums)
