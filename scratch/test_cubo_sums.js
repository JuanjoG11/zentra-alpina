const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const excelPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-06-01_a_2026-06-17_user_60_a46bcd22.xlsx';

if (!fs.existsSync(excelPath)) {
  console.log('Excel file not found at:', excelPath);
  process.exit(1);
}

async function run() {
  console.log('Reading file...');
  const buffer = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(buffer);
  
  // read shared strings
  let sharedStrings = [];
  if (zip.files['xl/sharedStrings.xml']) {
    const ssXml = await zip.files['xl/sharedStrings.xml'].async('string');
    const siMatches = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)];
    sharedStrings = siMatches.map(m => {
      const tMatches = [...m[1].matchAll(/<t(?:[^>]*)>([\s\S]*?)<\/t>/g)];
      return tMatches.map(t => t[1]).join('')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    });
  }

  // Find worksheet
  const sheetXml = await zip.files['xl/worksheets/sheet1.xml'].async('string');
  console.log('Parsing rows...');

  const rowMatches = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
  let headers = [];
  let idxMotivo = -1;
  let idxVal = -1;

  let rechazosSum = 0;
  let cambiosSum = 0;

  const colToIdx = (col) => {
    let idx = 0;
    for (let i = 0; i < col.length; i++) idx = idx * 26 + (col.charCodeAt(i) - 64);
    return idx - 1;
  };

  rowMatches.forEach((rMatch, rowIdx) => {
    const rowContent = rMatch[1];
    const cellMatches = [...rowContent.matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)];
    
    const rowObj = {};
    cellMatches.forEach(cM => {
      const attrs = cM[1];
      const content = cM[2];
      const refMatch = attrs.match(/r="([A-Z]+)(\d+)"/);
      const colRef = refMatch ? refMatch[1] : null;
      const typeMatch = attrs.match(/t="([^"]*)"/);
      const cellType = typeMatch ? typeMatch[1] : 'n';

      const vMatch = content.match(/<v>([\s\S]*?)<\/v>/);
      let val = vMatch ? vMatch[1] : null;
      if (val !== null) {
        if (cellType === 's') val = sharedStrings[parseInt(val)] ?? val;
        else if (cellType !== 'str') val = parseFloat(val);
      }
      if (colRef) rowObj[colToIdx(colRef)] = val;
    });

    if (rowIdx === 0) {
      Object.keys(rowObj).forEach(colIdx => {
        headers[colIdx] = String(rowObj[colIdx]).trim();
      });
      idxMotivo = headers.indexOf('motivo');
      idxVal = headers.indexOf('vlrAntesIva');
      console.log('idxMotivo:', idxMotivo, 'idxVal:', idxVal);
    } else {
      const motivo = rowObj[idxMotivo];
      const val = rowObj[idxVal];
      if (motivo && val && typeof val === 'number' && val !== 0) {
        const mStr = String(motivo).toUpperCase();
        const absVal = Math.abs(val);
        if (mStr.includes('VENCIMIENTO') || mStr.includes('M.E.')) {
          cambiosSum += absVal;
        } else {
          rechazosSum += absVal;
        }
      }
    }
  });

  console.log('--- RESULTS FROM EXCEL ---');
  console.log('Rechazos Total (Otros Motivos):', rechazosSum.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }));
  console.log('Cambios Total (Vencimiento / M.E.):', cambiosSum.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }));
  console.log('Total Devolución:', (rechazosSum + cambiosSum).toLocaleString('es-CO', { style: 'currency', currency: 'COP' }));
}

run().catch(console.error);
