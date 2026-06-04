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
    print("Reading CSV...")
    df = pd.read_csv(csv_file, sep=';', usecols=['nmProducto', 'nmGrupoArticulo', 'nmTpMarca', 'nmTpFamilia', 'vlrTotalconIva'])
    
    # Clean vlrTotalconIva
    # Replace commas, spaces, currency symbols, and convert to float
    def clean_val(val):
        if pd.isna(val):
            return 0.0
        val_str = str(val).strip()
        # Remove '$', spaces
        val_str = val_str.replace('$', '').replace(' ', '').replace('"', '')
        # Since Excel CSV might use dot as thousand and comma as decimal, or comma as thousand and dot as decimal
        # Let's inspect values: '16869', '11246' - they don't seem to have decimal parts or maybe they do
        # Let's try standard float conversion, replacing comma with dot or vice versa if needed
        # In Spanish, sometimes '11.246' is 11246. Let's see
        # Let's do a simple replace: if it has ',' and '.' let's handle it, or just remove commas if they are thousand separators
        # Let's print a few raw values first to check
        return val_str

    print("Raw values sample:")
    print(df['vlrTotalconIva'].dropna().head(10).tolist())
    
    # Let's convert to numeric
    # Let's assume standard float conversion after stripping spaces
    df['vlrTotalconIva_numeric'] = pd.to_numeric(df['vlrTotalconIva'].astype(str).str.replace(',', '.'), errors='coerce')
    # If that results in NaN, try just replacing commas with empty or standard conversion
    if df['vlrTotalconIva_numeric'].isna().sum() > 0.5 * len(df):
        # maybe it is comma as thousand separator
        df['vlrTotalconIva_numeric'] = pd.to_numeric(df['vlrTotalconIva'].astype(str).str.replace(',', ''), errors='coerce')
        
    df['vlrTotalconIva_numeric'] = df['vlrTotalconIva_numeric'].fillna(0.0)

    print("\nCalculated Sum per Grupo:")
    g_sums = df.groupby('nmGrupoArticulo')['vlrTotalconIva_numeric'].sum().sort_values(ascending=False)
    
    print("\nCalculated Sum per Marca (top 25):")
    m_sums = df.groupby('nmTpMarca')['vlrTotalconIva_numeric'].sum().sort_values(ascending=False).head(25)
    
    print("\nCalculated Sum per Familia (top 25):")
    f_sums = df.groupby('nmTpFamilia')['vlrTotalconIva_numeric'].sum().sort_values(ascending=False).head(25)
    
    # Save summary to UTF-8 file to avoid Windows encoding issues
    out_path = r"C:\Users\Juanjo\Documents\zentra alpina\data\categories_summary.txt"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("=== GRUPOS ===\n")
        f.write(g_sums.to_string() + "\n\n")
        f.write("=== MARCAS ===\n")
        f.write(m_sums.to_string() + "\n\n")
        f.write("=== FAMILIAS ===\n")
        f.write(f_sums.to_string() + "\n\n")
        
        # also print a few products sample for each group
        f.write("=== PRODUCTS SAMPLES ===\n")
        for group in df['nmGrupoArticulo'].dropna().unique():
            samples = df[df['nmGrupoArticulo'] == group]['nmProducto'].dropna().unique()[:5]
            f.write(f"Group: {group}\n")
            for s in samples:
                f.write(f"  - {s}\n")
            f.write("\n")
            
    print(f"Summary written to {out_path}")
