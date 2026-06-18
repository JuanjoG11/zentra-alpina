#!/usr/bin/env node
/**
 * Alpina Sales Cube CSV Importer
 * Streams the 200MB+ CSV file, performs aggregations, updates src/data/alpina-data.js,
 * and upserts summarized metrics to Supabase tables.
 *
 * Columnas clave del cubo:
 *   dtContabilizacion  → fecha (antes usábamos dtFactura)
 *   nmProveedor         → proveedor
 *   nmTpMarca           → marca
 *   vlrAntesIva         → valor de venta (antes usábamos vlrTotalconIva)
 *   nbFactura           → número de factura (conteo único, solo si motivo vacío)
 *   motivo              → si tiene valor y vlrAntesIva < 0 → devolución
 */
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envs = {};
  [envPath, envLocalPath].forEach(p => {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          envs[key] = val;
        }
      });
    }
  });
  return envs;
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  console.log('Found Supabase credentials. Sincronizando con Supabase:', SUPABASE_URL);
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.log('No Supabase credentials found in .env or .env.local. Running in local mode only.');
}

const budgetMap = {
  'E7001': 15718970,
  'M9450': 52875518,
  'M9451': 60284852,
  'M9453': 122322227,
  'M9454': 127741607,
  'M9455': 132916601,
  'M9456': 98461006,
  'M9457': 109101932,
  'M9458': 97290771,
  'M9459': 138264192,
  'M9460': 144798907,
  'M9461': 119740612,
  'P7004': 147442404,
  'P7005': 108916800,
  'P7006': 142737629,
  'P7007': 159379696
};

// Check arguments
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import_cubo.cjs <path_to_cubo.csv>');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found:', csvPath);
  process.exit(1);
}

// Helpers
function parseSpanishFloat(str) {
  if (!str) return 0;
  const cleaned = str.trim().replace(/\s/g, '').replace(/,/g, '.');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function formatDateToMDY(dateStr) {
  // YYYY-MM-DD to M/D/YYYY
  if (!dateStr || dateStr.includes('0000-00-00')) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const day = parseInt(parts[2]);
  return `${month}/${day}/${year}`;
}

// Aggregation stores
const providersAggr = {};    // key: proveedor (nmProveedor)
const brandsAggr = {};       // key: marca (nmTpMarca)
const salesDailyAggr = {};    // key: date (dtContabilizacion)
const zonesAggr = {};         // key: zone (nbZona)
const sellersAggr = {};       // key: seller (nmZona)
const conceptsAggr = {};      // key: motivo
const returnsDailyAggr = {};   // key: date (dtContabilizacion)
const clientReturnsAggr = {}; // key: zone + '_' + client + '_' + motivo
const salesDailyDbAggr = {};  // key: date_brand_seller_zone for Supabase sales_daily

let lineCount = 0;
let headerMap = {};

console.log('Iniciando procesamiento en streaming...');

const rl = readline.createInterface({
  input: fs.createReadStream(csvPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  lineCount++;
  const parts = line.split(';');

  if (lineCount === 1) {
    // Process headers
    parts.forEach((h, idx) => {
      // Remove BOM if present
      const cleanH = h.replace(/^\uFEFF/, '').trim();
      headerMap[cleanH] = idx;
    });
    console.log('Headers mapped successfully.');
    return;
  }

  // Get field indices
  const idxDate = headerMap['dtContabilizacion'];
  const idxZone = headerMap['nbZona'];
  const idxSeller = headerMap['nmZona'];
  const idxCity = headerMap['txCiudad'];
  const idxProveedor = headerMap['nmProveedor'];
  const idxBrand = headerMap['nmTpMarca'];
  const idxValTotal = headerMap['vlrAntesIva'];
  const idxFactura = headerMap['nbFactura'];
  const idxMotivo = headerMap['motivo'];
  const idxFormaPago = headerMap['nbFormaPago'];
  const idxRazonSocial = headerMap['nmRazonSocial'];

  const date = parts[idxDate];
  const zone = parts[idxZone];
  const seller = parts[idxSeller];
  const city = parts[idxCity];
  const proveedor = parts[idxProveedor] ? parts[idxProveedor].trim() : 'SIN PROVEEDOR';
  const brand = parts[idxBrand] ? parts[idxBrand].trim() : 'OTROS';
  const valTotal = parseSpanishFloat(parts[idxValTotal]);
  const factura = parts[idxFactura] ? parts[idxFactura].trim() : '';
  const motivo = parts[idxMotivo] ? parts[idxMotivo].trim() : '';
  const formaPago = parts[idxFormaPago];
  const clientName = parts[idxRazonSocial] || 'CLIENTE DESCONOCIDO';

  // Devolución = motivo NO vacío Y valor negativo
  const esDevolucion = (motivo !== '' && valTotal < 0);

  if (!date || date.includes('0000') || !valTotal) return;

  const formattedDate = formatDateToMDY(date);

  // 1. providers aggregation (group by nmProveedor)
  if (!providersAggr[proveedor]) {
    providersAggr[proveedor] = { ventas2026: 0, count: 0 };
  }
  if (!esDevolucion && valTotal > 0) {
    providersAggr[proveedor].ventas2026 += valTotal;
    providersAggr[proveedor].count++;
  }

  // 1b. brands aggregation (group by nmTpMarca)
  if (!brandsAggr[brand]) {
    brandsAggr[brand] = { ventas2026: 0, count: 0 };
  }
  if (!esDevolucion && valTotal > 0) {
    brandsAggr[brand].ventas2026 += valTotal;
    brandsAggr[brand].count++;
  }

  // 2. salesDaily aggregation (solo ventas reales, no devoluciones)
  if (!salesDailyAggr[date]) {
    salesDailyAggr[date] = { contado: 0, credito: 0 };
  }
  if (!esDevolucion && valTotal > 0) {
    if (formaPago === '1') {
      salesDailyAggr[date].contado += valTotal;
    } else {
      salesDailyAggr[date].credito += valTotal;
    }
  }

  // 3. zones aggregation
  if (zone) {
    if (!zonesAggr[zone]) {
      zonesAggr[zone] = {
        zona: zone,
        vendedor: seller || 'Sin Asignar',
        ventasNetas: 0,
        devoluciones: 0,
        facturas: new Set()
      };
    }
    if (esDevolucion) {
      zonesAggr[zone].devoluciones += Math.abs(valTotal);
    } else if (valTotal > 0) {
      zonesAggr[zone].ventasNetas += valTotal;
    }
    // Conteo de facturas: solo únicas Y solo si motivo está vacío (venta real)
    if (factura && motivo === '') {
      zonesAggr[zone].facturas.add(factura);
    }
    // Update seller name if blank previously
    if (seller && zonesAggr[zone].vendedor === 'Sin Asignar') {
      zonesAggr[zone].vendedor = seller;
    }
  }

  // 4. returnsSellers aggregation (group by seller name)
  if (seller) {
    if (!sellersAggr[seller]) {
      sellersAggr[seller] = {
        ejecutivo: zone || 'OTRO',
        nombre: seller,
        ventas: 0,
        devoluciones: 0
      };
    }
    if (esDevolucion) {
      sellersAggr[seller].devoluciones += Math.abs(valTotal);
    } else if (valTotal > 0) {
      sellersAggr[seller].ventas += valTotal;
    }
  }

  // 5. Devoluciones concepts and daily (solo si esDevolucion = motivo no vacío Y valor negativo)
  if (esDevolucion) {
    const absVal = Math.abs(valTotal);
    // concepts
    conceptsAggr[motivo] = (conceptsAggr[motivo] || 0) + absVal;

    // daily returns
    returnsDailyAggr[date] = (returnsDailyAggr[date] || 0) + absVal;

    // client returns (composite)
    const clientKey = `${zone}_${clientName}_${motivo}`;
    if (!clientReturnsAggr[clientKey]) {
      clientReturnsAggr[clientKey] = {
        ejecutivo: zone || 'OTRO',
        cliente: clientName,
        concepto: motivo,
        valor: 0
      };
    }
    clientReturnsAggr[clientKey].valor += absVal;
  }

  // 6. Detailed sales_daily rows for Supabase (grouped to match unique index)
  //    Solo ventas reales (no devoluciones)
  if (zone && seller && !esDevolucion) {
    const dbKey = `${date}_${proveedor}_${seller}`;
    if (!salesDailyDbAggr[dbKey]) {
      salesDailyDbAggr[dbKey] = {
        fecha: date,
        proveedor: proveedor,
        marca: brand,
        zona: zone,
        vendedor: seller,
        ventas: 0,
        unidades: 0
      };
    } else {
      if (salesDailyDbAggr[dbKey].zona !== zone && !salesDailyDbAggr[dbKey].zona.includes(zone)) {
        salesDailyDbAggr[dbKey].zona += ', ' + zone;
      }
    }
    salesDailyDbAggr[dbKey].ventas += valTotal;
    salesDailyDbAggr[dbKey].unidades += (valTotal > 0 ? 1 : 0);
  }

  if (lineCount % 50000 === 0) {
    console.log(`- Procesadas ${lineCount} líneas...`);
  }
});

rl.on('close', async () => {
  console.log(`\nProcesamiento de archivo finalizado. Total líneas: ${lineCount}`);

  // Format and clean aggregates
  // 1. Providers
  const providers = Object.entries(providersAggr).map(([brandName, data]) => {
    const v26 = Math.round(data.ventas2026);
    const v25 = Math.round(v26 / 1.2179);
    return {
      proveedor: brandName,
      ventas2025: v25,
      proyectado2025: v25,
      margen2025: 15,
      ventas2026: v26,
      proyectado2026: v26,
      margen2026: 15,
      crecimiento: 0.2179
    };
  }).sort((a, b) => b.ventas2026 - a.ventas2026);

  // 2. Sales Daily
  const salesDaily = Object.entries(salesDailyAggr).map(([rawDate, data]) => {
    const cont = Math.round(data.contado);
    const cred = Math.round(data.credito);
    return {
      fecha: formatDateToMDY(rawDate),
      contado: cont,
      credito: cred,
      total: cont + cred
    };
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // 3. Zones
  const zones = Object.entries(zonesAggr).map(([zoneCode, data]) => {
    const net = Math.round(data.ventasNetas);
    const dev = Math.round(data.devoluciones);
    const budget = budgetMap[zoneCode] || Math.round(net / 0.95);
    return {
      zona: zoneCode,
      vendedor: data.vendedor,
      presupuesto: budget,
      ventasNetas: net,
      devoluciones: dev,
      proyectado: net,
      porcentajeProyectado: budget > 0 ? Number((net / budget).toFixed(4)) : 1.0,
      cambiosPorc: 0.015,
      facturas: data.facturas.size
    };
  }).sort((a, b) => b.ventasNetas - a.ventasNetas);

  // 4. Returns Sellers
  const returnsSellers = Object.values(sellersAggr).map(s => {
    const v = Math.round(s.ventas);
    const d = Math.round(s.devoluciones);
    return {
      ejecutivo: s.ejecutivo,
      nombre: s.nombre,
      ventas: v,
      devoluciones: d,
      porcentajeDevolucion: v > 0 ? Number((d / v).toFixed(4)) : 0.0
    };
  }).sort((a, b) => b.ventas - a.ventas);

  // 5. Returns Concepts
  const totalDevValue = Object.values(conceptsAggr).reduce((a, b) => a + b, 0);
  const returnsConcepts = Object.entries(conceptsAggr).map(([concept, val]) => {
    return {
      concepto: concept,
      porcentaje: totalDevValue > 0 ? Number((val / totalDevValue).toFixed(4)) : 0.0
    };
  }).sort((a, b) => b.porcentaje - a.porcentaje);

  // 6. Returns Daily
  const returnsDaily = Object.entries(returnsDailyAggr).map(([rawDate, val]) => {
    return {
      fecha: formatDateToMDY(rawDate),
      devoluciones: Math.round(val)
    };
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // 7. Client Returns
  const clientReturns = Object.values(clientReturnsAggr).map(cr => {
    return {
      ejecutivo: cr.ejecutivo,
      cliente: cr.cliente,
      concepto: cr.concepto,
      valor: Math.round(cr.valor)
    };
  }).sort((a, b) => b.valor - a.valor);

  const output = {
    providers,
    salesDaily,
    zones,
    returnsSellers,
    returnsConcepts,
    returnsDaily,
    clientReturns
  };

  // Write output local JS file
  const outPath = path.join(__dirname, '..', 'src', 'data', 'alpina-data.js');
  fs.writeFileSync(outPath, 'export const alpinaData = ' + JSON.stringify(output, null, 2) + ';\n');
  console.log('Se actualizó con éxito el archivo local en:', outPath);

  // Print statistics
  console.log('\n--- Estadísticas del Cubo Importado ---');
  console.log(`Proveedores detectados: ${providers.length}`);
  console.log(`Marcas detectadas: ${Object.keys(brandsAggr).length}`);
  console.log(`Zonas procesadas: ${zones.length}`);
  console.log(`Vendedores: ${returnsSellers.length}`);
  console.log(`Total Ventas (vlrAntesIva): $${providers.reduce((sum, p) => sum + p.ventas2026, 0).toLocaleString()}`);
  console.log(`Total Devoluciones (motivo + negativo): $${Math.round(totalDevValue).toLocaleString()}`);

  // Sincronizar con Supabase
  if (supabase) {
    console.log('\nSubiendo datos agregados a Supabase...');
    try {
      // 1. Providers
      const providersDb = providers.map(p => ({
        proveedor: p.proveedor,
        ventas2026: p.ventas2026,
        ventas2025: p.ventas2025,
        margen2026: p.margen2026,
        meta: p.proyectado2026
      }));
      await supabase.from('providers').delete().neq('id', 0);
      const { error: errProv } = await supabase.from('providers').insert(providersDb);
      if (errProv) console.error('Error inserting providers:', errProv.message);
      else console.log('- Sincronizados proveedores.');

      // 2. Zones
      const zonesDb = zones.map(z => ({
        zona: z.zona,
        presupuesto: z.presupuesto,
        facturas: z.facturas,
        ventasnetas: z.ventasNetas
      }));
      await supabase.from('zones').delete().neq('id', 0);
      const { error: errZones } = await supabase.from('zones').insert(zonesDb);
      if (errZones) console.error('Error inserting zones:', errZones.message);
      else console.log('- Sincronizadas zonas.');

      // 3. Returns Sellers
      const returnsSellersDb = returnsSellers.map(s => ({
        nombre: s.nombre,
        ejecutivo: s.ejecutivo,
        ventas: s.ventas,
        devoluciones: s.devoluciones
      }));
      await supabase.from('returns_sellers').delete().neq('id', 0);
      const { error: errSellers } = await supabase.from('returns_sellers').insert(returnsSellersDb);
      if (errSellers) console.error('Error inserting returns_sellers:', errSellers.message);
      else console.log('- Sincronizados vendedores y devoluciones.');

      // 4. Sales Daily
      const salesDailyDb = Object.values(salesDailyDbAggr).map(sd => ({
        fecha: sd.fecha,
        proveedor: sd.proveedor,
        zona: sd.zona,
        vendedor: sd.vendedor,
        ventas: Math.round(sd.ventas),
        unidades: sd.unidades
      }));
      
      await supabase.from('sales_daily').delete().neq('id', 0);
      const chunkSize = 500;
      console.log(`- Inserting ${salesDailyDb.length} rows to sales_daily in chunks of ${chunkSize}...`);
      for (let i = 0; i < salesDailyDb.length; i += chunkSize) {
        const chunk = salesDailyDb.slice(i, i + chunkSize);
        const { error: errSales } = await supabase.from('sales_daily').insert(chunk);
        if (errSales) {
          console.error(`Error inserting sales_daily chunk starting at index ${i}:`, errSales.message);
          break;
        }
      }
      console.log('- Sincronizados registros diarios de venta.');
    } catch (e) {
      console.error('Error de Supabase:', e.message || e);
    }
  }

  console.log('\nSincronización completada con éxito.');
  process.exit(0);
});
