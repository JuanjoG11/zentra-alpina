import pandas as pd
import glob
import os

print("Listing CSV files in data/...")
csv_files = glob.glob("data/*.csv")
for f in csv_files:
    print(f"\n--- File: {f} ---")
    try:
        # read first 10 lines as plain text to see headers and metadata
        with open(f, 'r', encoding='utf-8', errors='ignore') as file:
            lines = [file.readline().strip() for _ in range(12)]
        print("First 12 lines:")
        for idx, l in enumerate(lines):
            print(f"{idx+1}: {l}")
    except Exception as e:
        print("Error reading:", e)
