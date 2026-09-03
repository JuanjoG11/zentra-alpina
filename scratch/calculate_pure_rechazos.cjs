const ExcelJS = require('exceljs');
const file = 'C:/Users/Juanjo/Downloads/CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-08-01_a_2026-08-31_user_60_b7cfc4cd.xlsx';

async function run() {
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(file, { entries: 'emit' });
  const execMap = {};
  let totalRows = 0;
  let colIndices = {};

  const excludedFromRechazos = new Set([
    'DEV. M.E. POR VENCIMIENTO',
    'DESCUENTO FINANCIERO',
    'DESCUENTO A CLIENTE (NC)',
    'NO ENTREGADO POR CALAMIDAD',
    'SIN MERCANCIA EN BODEGA',
    'NO ENTREGADO POR BODEGA',
    'FALTANTE AUTORIZADO',
    'MAL ESTADO POR CALIDAD',
    'MAL ESTADO POR MANEJO'
  ]);

  for await (const worksheet of workbook) {
    for await (const row of worksheet) {
      totalRows++;
      if (totalRows === 1) {
        row.values.forEach((v, idx) => { if (v) colIndices[String(v).trim()] = idx; });
        continue;
      }
      const vals = row.values;
      const zone = String(vals[colIndices['nbZona']] || '').trim();
      const seller = String(vals[colIndices['nmZona']] || '').trim();
      const motivo = String(vals[colIndices['motivo']] || '').trim();
      const vlrAntesIva = parseFloat(vals[colIndices['vlrAntesIva']]) || 0;
      
      const key = zone || seller || 'OTRO';
      if (!execMap[key]) {
        execMap[key] = { zone, seller, ventas: 0, rechazos: 0, cambios: 0, otrosDev: 0 };
      }
      if (!motivo && vlrAntesIva > 0) {
        execMap[key].ventas += vlrAntesIva;
      }
      if (motivo !== '' && vlrAntesIva < 0) {
        const absVal = Math.abs(vlrAntesIva);
        if (motivo === 'DEV. M.E. POR VENCIMIENTO') {
          execMap[key].cambios += absVal;
        } else if (!excludedFromRechazos.has(motivo)) {
          execMap[key].rechazos += absVal;
        } else {
          execMap[key].otrosDev += absVal;
        }
      }
    }
  }

  const rows = Object.values(execMap).map(e => ({
    zona: e.zone,
    nombre: e.seller,
    ventas: Math.round(e.ventas),
    rechazos: Math.round(e.rechazos),
    pctRech: e.ventas > 0 ? ((e.rechazos / e.ventas) * 100).toFixed(2) + '%' : '0%',
    cambios: Math.round(e.cambios),
    otros: Math.round(e.otrosDev),
    devoluciones: Math.round(e.rechazos + e.cambios)
  })).sort((a,b) => a.zona.localeCompare(b.zona));

  console.table(rows);
  const totV = rows.reduce((s, r) => s + r.ventas, 0);
  const totR = rows.reduce((s, r) => s + r.rechazos, 0);
  const totC = rows.reduce((s, r) => s + r.cambios, 0);
  const totO = rows.reduce((s, r) => s + r.otros, 0);
  console.log('TOTAL VENTAS:', totV);
  console.log('TOTAL RECHAZOS:', totR, 'Pct:', ((totR/totV)*100).toFixed(2) + '%');
  console.log('TOTAL CAMBIOS:', totC, 'Pct:', ((totC/totV)*100).toFixed(2) + '%');
  console.log('TOTAL OTROS EXCLUIDOS:', totO);
  console.log('TOTAL DEV (Rechazos + Cambios):', totR + totC, 'Pct:', (((totR+totC)/totV)*100).toFixed(2) + '%');
}
run();
