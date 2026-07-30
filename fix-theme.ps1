$files = Get-ChildItem -Path 'c:\Users\Juanjo\Documents\zentra alpina\src' -Recurse -Include '*.jsx' | Where-Object { $_.Name -ne 'TVDashboard.jsx' -and $_.Name -ne 'Login.jsx' }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content

    # ── BACKGROUND REPLACEMENTS ──
    $content = $content -replace 'bg-slate-950/85', 'bg-white'
    $content = $content -replace 'bg-slate-950/70', 'bg-white'
    $content = $content -replace 'bg-slate-950/60', 'bg-white/80'
    $content = $content -replace 'bg-slate-950', 'bg-white'
    $content = $content -replace 'bg-slate-900/50', 'bg-slate-50'
    $content = $content -replace 'bg-slate-900/40', 'bg-slate-50'
    $content = $content -replace 'bg-slate-900/30', 'bg-slate-50'
    $content = $content -replace 'bg-slate-900/20', 'bg-slate-50'
    $content = $content -replace 'bg-slate-900/10', 'bg-slate-50'
    $content = $content -replace 'bg-slate-900', 'bg-slate-100'
    $content = $content -replace 'bg-slate-800/60', 'bg-slate-100'
    $content = $content -replace 'bg-slate-800/50', 'bg-slate-100'
    $content = $content -replace 'bg-slate-800/40', 'bg-slate-50'
    $content = $content -replace 'bg-slate-800', 'bg-slate-200'
    $content = $content -replace 'bg-\[#0f172a\]', 'bg-white'
    $content = $content -replace 'bg-\[#1e293b\]', 'bg-slate-100'

    # ── BORDER REPLACEMENTS ──
    $content = $content -replace 'border-slate-900/60', 'border-slate-200'
    $content = $content -replace 'border-slate-900', 'border-slate-200'
    $content = $content -replace 'border-slate-800/80', 'border-slate-200'
    $content = $content -replace 'border-slate-800/70', 'border-slate-200'
    $content = $content -replace 'border-slate-800/60', 'border-slate-200'
    $content = $content -replace 'border-slate-800', 'border-slate-200'
    $content = $content -replace 'border-slate-700', 'border-slate-300'

    # ── TEXT COLOR REPLACEMENTS ──
    $content = $content -replace 'text-white', 'text-slate-900'
    $content = $content -replace 'text-slate-300', 'text-slate-700'
    $content = $content -replace 'text-slate-400', 'text-slate-600'
    $content = $content -replace 'text-slate-500', 'text-slate-600'

    # ── SHADOW REPLACEMENTS ──
    $content = $content -replace 'shadow-slate-950/20', 'shadow-slate-200/50'
    $content = $content -replace 'shadow-slate-950', 'shadow-slate-200'

    # ── HOVER REPLACEMENTS ──
    $content = $content -replace 'hover:bg-slate-900/10', 'hover:bg-slate-50'
    $content = $content -replace 'hover:bg-slate-700/80', 'hover:bg-slate-100'
    $content = $content -replace 'hover:border-slate-700/80', 'hover:border-slate-300'
    $content = $content -replace 'hover:text-slate-200', 'hover:text-slate-900'

    # ── DIVIDE REPLACEMENTS ──
    $content = $content -replace 'divide-slate-900/60', 'divide-slate-200'
    $content = $content -replace 'divide-slate-900', 'divide-slate-200'
    $content = $content -replace 'divide-slate-800', 'divide-slate-200'

    # ── SVG STROKE ──
    $content = $content -replace 'stroke="#1e293b"', 'stroke="#e2e8f0"'

    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline -Encoding UTF8
        Write-Output "Updated: $($file.Name)"
    }
}
Write-Output 'DONE - All files updated to light theme'
