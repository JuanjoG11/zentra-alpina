const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envLocalPath = path.resolve(__dirname, '..', '.env.local');
  const envPath = path.resolve(__dirname, '..', '.env');
  const env = {};
  [envPath, envLocalPath].forEach(p => {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          let v = parts.slice(1).join('=').trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          env[k] = v;
        }
      });
    }
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env['VITE_SUPABASE_URL'] || env['SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'] || env['SUPABASE_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const file = 'C:/Users/Juanjo/Downloads/CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-08-01_a_2026-08-31_user_60_b7cfc4cd.xlsx';

async function main() {
  console.log('Procesando archivo de Excel con filtro de Rechazo Puro Comercial y de Ruta...');
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(file, { entries: 'emit' });
  
  const execMap = {};
  const dailyDevMap = {}; // fecha -> devoluciones (rechazos + cambios)
  const zoneMap = {};     // zona -> { ventasBrutas, devoluciones }

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
      const date = String(vals[colIndices['dtContabilizacion']] || '').trim();
      const zone = String(vals[colIndices['nbZona']] || '').trim();
      const seller = String(vals[colIndices['nmZona']] || '').trim();
      const motivo = String(vals[colIndices['motivo']] || '').trim();
      const vlrAntesIva = parseFloat(vals[colIndices['vlrAntesIva']]) || 0;
      
      const key = seller || zone || 'OTRO';
      if (!execMap[key]) {
        execMap[key] = { zone, seller, ventas: 0, rechazos: 0, cambios: 0 };
      }

      if (zone) {
        if (!zoneMap[zone]) zoneMap[zone] = { ventasBrutas: 0, devoluciones: 0 };
      }

      if (!motivo && vlrAntesIva > 0) {
        execMap[key].ventas += vlrAntesIva;
        if (zone) zoneMap[zone].ventasBrutas += vlrAntesIva;
      }

      if (motivo !== '' && vlrAntesIva < 0) {
        const absVal = Math.abs(vlrAntesIva);
        let isDevolucionPura = false;

        if (motivo === 'DEV. M.E. POR VENCIMIENTO') {
          execMap[key].cambios += absVal;
          isDevolucionPura = true;
        } else if (!excludedFromRechazos.has(motivo)) {
          execMap[key].rechazos += absVal;
          isDevolucionPura = true;
        }

        if (isDevolucionPura) {
          if (date) {
            dailyDevMap[date] = (dailyDevMap[date] || 0) + absVal;
          }
          if (zone) {
            zoneMap[zone].devoluciones += absVal;
          }
        }
      }
    }
  }

  // Agrupar por ejecutivo único (nombre + zona)
  const sellersDb = Object.values(execMap).map(e => {
    const r = Math.round(e.rechazos);
    const c = Math.round(e.cambios);
    const d = r + c;
    const v = Math.round(e.ventas);
    return {
      nombre: e.seller,
      ejecutivo: e.zone,
      ventas: v,
      devoluciones: d,
      rechazos: r,
      cambios: c,
      periodo: '2026-08'
    };
  });

  const totV = sellersDb.reduce((s, r) => s + r.ventas, 0);
  const totR = sellersDb.reduce((s, r) => s + r.rechazos, 0);
  const totC = sellersDb.reduce((s, r) => s + r.cambios, 0);
  const totD = sellersDb.reduce((s, r) => s + r.devoluciones, 0);

  console.log('\n--- Totales Calculados 2026-08 ---');
  console.log(`Ventas Brutas: $${totV.toLocaleString()}`);
  console.log(`Rechazos Puros: $${totR.toLocaleString()} (${((totR/totV)*100).toFixed(2)}%)`);
  console.log(`Cambios M.E.: $${totC.toLocaleString()} (${((totC/totV)*100).toFixed(2)}%)`);
  console.log(`Total Devoluciones: $${totD.toLocaleString()} (${((totD/totV)*100).toFixed(2)}%)`);

  // 1. Actualizar returns_sellers en Supabase
  console.log('\nActualizando returns_sellers en Supabase para 2026-08...');
  await supabase.from('returns_sellers').delete().eq('periodo', '2026-08');
  const { error: errSellers } = await supabase.from('returns_sellers').insert(sellersDb);
  if (errSellers) {
    console.error('Error actualizando returns_sellers:', errSellers);
  } else {
    console.log(`✅ Actualizados ${sellersDb.length} ejecutivos en returns_sellers.`);
  }

  // 2. Actualizar returns_daily en Supabase
  console.log('Actualizando returns_daily en Supabase para 2026-08...');
  const dailyDb = Object.entries(dailyDevMap).map(([fecha, dev]) => ({
    fecha,
    devoluciones: Math.round(dev),
    periodo: '2026-08'
  })).sort((a,b) => a.fecha.localeCompare(b.fecha));

  await supabase.from('returns_daily').delete().eq('periodo', '2026-08');
  const { error: errDaily } = await supabase.from('returns_daily').insert(dailyDb);
  if (errDaily) {
    console.error('Error actualizando returns_daily:', errDaily);
  } else {
    console.log(`✅ Actualizados ${dailyDb.length} días en returns_daily.`);
  }

  // 3. Actualizar zones ventasnetas en Supabase
  console.log('Actualizando ventasnetas de zones en Supabase para 2026-08...');
  const { data: existingZones } = await supabase.from('zones').select('*').eq('periodo', '2026-08');
  if (existingZones && existingZones.length > 0) {
    for (const z of existingZones) {
      const zData = zoneMap[z.zona];
      if (zData) {
        const net = Math.max(0, Math.round(zData.ventasBrutas - zData.devoluciones));
        await supabase.from('zones').update({ ventasnetas: net }).eq('id', z.id);
      }
    }
    console.log(`✅ Actualizadas ventasnetas para ${existingZones.length} zonas.`);
  }

  console.log('\nSincronización completada con éxito.');
}

main().catch(console.error);
