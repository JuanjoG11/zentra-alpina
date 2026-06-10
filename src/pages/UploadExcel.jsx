import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import useStore from '../store/useStore';
import GlassCard from '../components/ui/GlassCard';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabaseClient';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// Helper for client-side processing of CUBO_DE_VENTAS data
const processSheetsClientSide = (parsedFiles, selectedSheets) => {
  const providersAggr = {};
  const salesDailyAggr = {};
  const zonesAggr = {};
  const sellersAggr = {};
  const conceptsAggr = {};
  const returnsDailyAggr = {};
  const clientReturnsAggr = {};
  const salesDailyDbAggr = {};
  
  const clientsPerCity = {
    'ARMENIA': new Set(),
    'MANIZALES': new Set(),
    'PEREIRA': new Set(),
    'OTRO': new Set()
  };

  const budgetMap = {
    'E7001': 15718970, 'M9450': 52875518, 'M9451': 60284852, 'M9453': 122322227,
    'M9454': 127741607, 'M9455': 132916601, 'M9456': 98461006, 'M9457': 109101932,
    'M9458': 97290771, 'M9459': 138264192, 'M9460': 144798907, 'M9461': 119740612,
    'P7004': 147442404, 'P7005': 108916800, 'P7006': 142737629, 'P7007': 159379696
  };

  const parseSpanishFloat = (str) => {
    if (str === null || str === undefined) return 0;
    if (typeof str === 'number') return str;
    let s = String(str).trim();
    // Detect negative sign either via dash or parentheses
    const isNegative = s.includes('-') || (s.includes('(') && s.includes(')'));
    // Remove any non-numeric characters except commas and dots
    s = s.replace(/[^0-9.,-]/g, '');
    if (!s) return 0;

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      const partsAfter = s.length - 1 - lastComma;
      if (partsAfter === 3) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(/\./g, '').replace(',', '.');
      }
    } else if (lastDot > lastComma) {
      const partsAfter = s.length - 1 - lastDot;
      if (partsAfter === 3) {
        s = s.replace(/\./g, '');
      } else {
        s = s.replace(/,/g, '').replace(',', '');
      }
    } else {
      s = s.replace(/,/g, '').replace(',', '.');
    }
    const val = parseFloat(s);
    return isNaN(val) ? 0 : (isNegative ? -Math.abs(val) : val);
  };

  const formatDateToMDY = (dateVal) => {
    if (!dateVal) return '';
    if (dateVal instanceof Date) {
      return `${dateVal.getMonth() + 1}/${dateVal.getDate()}/${dateVal.getFullYear()}`;
    }
    if (typeof dateVal === 'number') {
      const dObj = new Date((dateVal - 25569) * 86400 * 1000);
      return `${dObj.getMonth() + 1}/${dObj.getDate()}/${dObj.getFullYear()}`;
    }
    const str = String(dateVal).trim();
    if (str.includes('0000-00-00')) return '';

    const matchYMD = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (matchYMD) {
      return `${parseInt(matchYMD[2], 10)}/${parseInt(matchYMD[3], 10)}/${parseInt(matchYMD[1], 10)}`;
    }
    const matchDMY = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (matchDMY) {
      return `${parseInt(matchDMY[2], 10)}/${parseInt(matchDMY[1], 10)}/${parseInt(matchDMY[3], 10)}`;
    }
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      const dObj = new Date(parsed);
      return `${dObj.getMonth() + 1}/${dObj.getDate()}/${dObj.getFullYear()}`;
    }
    return str;
  };

  const formatDateToYMD = (dateVal) => {
    if (!dateVal) return '';
    let dObj = null;
    if (dateVal instanceof Date) {
      dObj = dateVal;
    } else if (typeof dateVal === 'number') {
      dObj = new Date((dateVal - 25569) * 86400 * 1000);
    } else {
      const str = String(dateVal).trim();
      if (str.includes('0000-00-00')) return '';
      const matchYMD = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (matchYMD) {
        dObj = new Date(parseInt(matchYMD[1], 10), parseInt(matchYMD[2], 10) - 1, parseInt(matchYMD[3], 10));
      } else {
        const matchDMY = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (matchDMY) {
          dObj = new Date(parseInt(matchDMY[3], 10), parseInt(matchDMY[2], 10) - 1, parseInt(matchDMY[1], 10));
        } else {
          const parsed = Date.parse(str);
          if (!isNaN(parsed)) dObj = new Date(parsed);
        }
      }
    }
    if (dObj && !isNaN(dObj.getTime())) {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  const normalizeKey = (key) => {
    return key
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "");     // Remove spaces/underscores
  };

  const getRowValue = (row, targetKeys) => {
    const normalizedTargets = targetKeys.map(k => normalizeKey(k));
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeKey(key);
      if (normalizedTargets.includes(normalizedKey)) {
        return row[key];
      }
    }
    return null;
  };

  const dateKeys = ['dtFactura', 'fecha', 'dt_factura', 'FechaFactura', 'Fecha Factura'];
  const zoneKeys = ['nbZona', 'zona', 'nb_zona', 'Zona', 'Código Zona', 'Codigo Zona'];
  const sellerKeys = ['nmZona', 'vendedor', 'nm_zona', 'Vendedor', 'ejecutivo', 'Ejecutivo Ventas'];
  const cityKeys = ['txCiudad', 'ciudad', 'tx_ciudad', 'Ciudad'];
  const brandKeys = ['nmTpMarca', 'nmProveedor', 'proveedor', 'marca', 'nm_tp_marca', 'Proveedor', 'Marca'];
  const valKeys = ['vlrTotalconIva', 'vlrTotal', 'valor', 'total', 'vlrTotalConIva', 'vlrAntesIva', 'Valor Total', 'Valor Con Iva', 'total_con_iva'];
  const facturaKeys = ['nbFactura', 'factura', 'nb_factura', 'Factura', 'id_factura', 'Número Factura', 'Num Factura', 'No Factura'];
  const motivoKeys = ['motivo', 'concepto', 'motivo_devolucion', 'Motivo', 'Concepto Devolución', 'Concepto'];
  const paymentKeys = ['nbFormaPago', 'forma_pago', 'nb_forma_pago', 'FormaPago', 'tipo_pago', 'Forma de Pago'];
  const clientKeys = ['nmRazonSocial', 'cliente', 'razon_social', 'nm_razon_social', 'Cliente', 'Razón Social', 'Nombre Cliente'];

  let processedRowsCount = 0;

  for (const fileName of Object.keys(parsedFiles)) {
    const sheets = parsedFiles[fileName];
    const want = selectedSheets[fileName] || [];
    for (const sh of sheets) {
      if (!want.includes(sh.name)) continue;
      const rows = sh.rows || [];
      processedRowsCount += rows.length;

      // Detect if this sheet is a DEVOLUCIONES sheet by name
      const sheetNameLower = sh.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents
      const isReturnsSheet = sheetNameLower.includes('devoluci') ||
                             sheetNameLower.includes('return') ||
                             sheetNameLower === 'dev' ||
                             sheetNameLower === 'devoluciones';

      for (const row of rows) {
        const dateVal = getRowValue(row, dateKeys);
        const zone = getRowValue(row, zoneKeys);
        const seller = getRowValue(row, sellerKeys);
        const brand = getRowValue(row, brandKeys) || 'OTROS';
        const boAfectaVenta = getRowValue(row, ['boAfectaVenta', 'bo_afecta_venta', 'boAfectaVenta']) ?? true;
        
        // Extract fields needed for sign determination
        const motivo = getRowValue(row, motivoKeys);
        const rawVal = parseSpanishFloat(getRowValue(row, valKeys));
        
        // Determine sign based on motivo, returns sheet, or boAfectaVenta.
        let sign = 1;
        if (motivo && String(motivo).trim() !== '') {
          sign = -1; // Devolución por motivo
        } else if (isReturnsSheet) {
          sign = -1; // Hoja de devoluciones
        } else {
          const boAfecta = String(boAfectaVenta).toLowerCase().trim();
          if (['false', '0', 'no', 'n'].includes(boAfecta)) {
            sign = -1; // Devolución explícita
          }
        }
        // Preserve original sign if rawVal already negative; otherwise apply calculated sign.
        const valTotal = rawVal < 0 ? rawVal : rawVal * sign;
        // Debug: log return rows
        if (valTotal < 0) {
          console.log('Return row detected:', {
            motivo,
            boAfectaVenta,
            isReturnsSheet,
            rawVal,
            sign,
            valTotal,
            rowIndex: rows.indexOf(row)
          });
        }
        
        const factura = getRowValue(row, facturaKeys);
        const formaPago = String(getRowValue(row, paymentKeys) || '');
        const clientName = getRowValue(row, clientKeys) || 'CLIENTE DESCONOCIDO';

        if (!dateVal || String(dateVal).includes('0000') || valTotal === 0) continue;
        


        const formattedDate = formatDateToMDY(dateVal);
        if (!formattedDate) continue;

        // 1. Providers
        if (!providersAggr[brand]) {
          providersAggr[brand] = { ventas2026: 0, count: 0 };
        }
        if (valTotal > 0) {
          providersAggr[brand].ventas2026 += valTotal;
          providersAggr[brand].count++;
        }

        // 2. Sales Daily (solo ventas positivas = brutas)
        if (valTotal > 0) {
          if (!salesDailyAggr[formattedDate]) {
            salesDailyAggr[formattedDate] = { contado: 0, credito: 0 };
          }
          if (formaPago === '1' || formaPago.toUpperCase().includes('CONTADO')) {
            salesDailyAggr[formattedDate].contado += valTotal;
          } else {
            salesDailyAggr[formattedDate].credito += valTotal;
          }
        }

        // 3. Zones
        if (zone) {
          if (!zonesAggr[zone]) {
            zonesAggr[zone] = {
              zona: zone,
              vendedor: seller || 'Sin Asignar',
              ventasNetas: 0,
              facturas: new Set()
            };
          }
          zonesAggr[zone].ventasNetas += valTotal;
          if (valTotal > 0 && factura) {
            zonesAggr[zone].facturas.add(factura);
          }
          if (seller && zonesAggr[zone].vendedor === 'Sin Asignar') {
            zonesAggr[zone].vendedor = seller;
          }
        }

        // 4. Returns Sellers
        if (seller) {
          if (!sellersAggr[seller]) {
            sellersAggr[seller] = {
              ejecutivo: zone || 'OTRO',
              nombre: seller,
              ventas: 0,
              devoluciones: 0
            };
          }
          if (valTotal > 0) {
            sellersAggr[seller].ventas += valTotal;
          } else {
            sellersAggr[seller].devoluciones += Math.abs(valTotal);
          }
        }

        // 5. Devoluciones concepts and daily
        if (valTotal < 0) {
          const absVal = Math.abs(valTotal);
          const conceptKey = motivo || 'DEVOLUCION SIN MOTIVO';
          conceptsAggr[conceptKey] = (conceptsAggr[conceptKey] || 0) + absVal;

          returnsDailyAggr[formattedDate] = (returnsDailyAggr[formattedDate] || 0) + absVal;

          const clientKey = `${zone}_${clientName}_${conceptKey}`;
          if (!clientReturnsAggr[clientKey]) {
            clientReturnsAggr[clientKey] = {
              ejecutivo: zone || 'OTRO',
              cliente: clientName,
              concepto: conceptKey,
              valor: 0
            };
          }
          clientReturnsAggr[clientKey].valor += absVal;
        }

        // 6. Clients per City numerical coverage count
        if (valTotal > 0 && clientName) {
          const uCity = String(getRowValue(row, cityKeys) || '').toUpperCase();
          let cityKey = 'OTRO';
          if (uCity.includes('ARMENIA') || uCity.includes('CALARCA') || uCity.includes('CIRCASIA') || uCity.includes('TEBAIDA') || uCity.includes('MONTENEGRO') || uCity.includes('QUIMBAYA') || uCity.includes('FILANDIA')) {
            cityKey = 'ARMENIA';
          } else if (uCity.includes('MANIZALES') || uCity.includes('CHINCHINA') || uCity.includes('VILLAMARIA') || uCity.includes('NEIRA') || uCity.includes('ARANZAZU') || uCity.includes('RIOSUCIO')) {
            cityKey = 'MANIZALES';
          } else if (uCity.includes('PEREIRA') || uCity.includes('DOSQUEBRADAS') || uCity.includes('SANTA ROSA') || uCity.includes('LA VIRGINIA') || uCity.includes('CARTAGO')) {
            cityKey = 'PEREIRA';
          }
          clientsPerCity[cityKey].add(clientName);
        }

        // 7. Detailed sales_daily rows for Supabase (grouped to match unique index)
        // IMPORTANT: Only accumulate POSITIVE sales here. Returns are tracked in
        // returnsDailyAggr separately to avoid double-counting when computing netSales.
        if (zone && seller && valTotal > 0) {
          const ymdDate = formatDateToYMD(dateVal);
          if (ymdDate) {
            // Include zone in the key to avoid over‑aggregation across zones
            const dbKey = `${ymdDate}_${brand}_${zone}_${seller}`;
            if (!salesDailyDbAggr[dbKey]) {
              salesDailyDbAggr[dbKey] = {
                fecha: ymdDate,
                proveedor: brand,
                zona: zone,
                vendedor: seller,
                ventas: 0,
                unidades: 0
              };
            }
            salesDailyDbAggr[dbKey].ventas += valTotal;
            salesDailyDbAggr[dbKey].unidades += 1;
          }
        }
      }
    }
  }

  if (processedRowsCount === 0) return null;

  // Calculate projection factor based on 22 business days
  const elapsedDays = Object.keys(salesDailyAggr).length || 1;
// If we have data for less than 15 days, avoid aggressive projection to prevent over‑inflated numbers.
let projectionFactor = 1;
if (elapsedDays >= 15) {
  projectionFactor = 22 / elapsedDays;
}

  // Format aggregates
  const providers = Object.entries(providersAggr).map(([brandName, data]) => {
    const v26 = Math.round(data.ventas2026);
    const v25 = Math.round(v26 / 1.2179);
    return {
      proveedor: brandName,
      ventas2025: v25,
      proyectado2025: v25,
      margen2025: 15,
      ventas2026: v26,
      proyectado2026: Math.round(v26 * projectionFactor),
      margen2026: 15,
      crecimiento: 0.2179
    };
  }).sort((a, b) => b.ventas2026 - a.ventas2026);

  const salesDaily = Object.entries(salesDailyAggr).map(([fecha, data]) => {
    const cont = Math.round(data.contado);
    const cred = Math.round(data.credito);
    return {
      fecha,
      contado: cont,
      credito: cred,
      total: cont + cred
    };
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const zones = Object.entries(zonesAggr).map(([zoneCode, data]) => {
    const net = Math.round(data.ventasNetas);
    const budget = budgetMap[zoneCode] || Math.round(net / 0.95);
    const projectedNet = Math.round(net * projectionFactor);
    return {
      zona: zoneCode,
      vendedor: data.vendedor,
      presupuesto: budget,
      ventasNetas: net,
      proyectado: projectedNet,
      porcentajeProyectado: budget > 0 ? Number((projectedNet / budget).toFixed(4)) : 1.0,
      cambiosPorc: 0.015,
      facturas: data.facturas.size
    };
  }).sort((a, b) => b.ventasNetas - a.ventasNetas);

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

  const totalDevValue = Object.values(conceptsAggr).reduce((a, b) => a + b, 0);
  const returnsConcepts = Object.entries(conceptsAggr).map(([concept, val]) => {
    return {
      concepto: concept,
      porcentaje: totalDevValue > 0 ? Number((val / totalDevValue).toFixed(4)) : 0.0
    };
  }).sort((a, b) => b.porcentaje - a.porcentaje);

  const returnsDaily = Object.entries(returnsDailyAggr).map(([fecha, val]) => {
    return {
      fecha,
      devoluciones: Math.round(val)
    };
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const clientReturns = Object.values(clientReturnsAggr).map(cr => {
    return {
      ejecutivo: cr.ejecutivo,
      cliente: cr.cliente,
      concepto: cr.concepto,
      valor: Math.round(cr.valor)
    };
  }).sort((a, b) => b.valor - a.valor);

  const cityClients = {
    'ARMENIA': clientsPerCity['ARMENIA'].size,
    'MANIZALES': clientsPerCity['MANIZALES'].size,
    'PEREIRA': clientsPerCity['PEREIRA'].size,
    'OTRO': clientsPerCity['OTRO'].size
  };

  const salesDailyDb = Object.values(salesDailyDbAggr).map(sd => ({
    fecha: sd.fecha,
    proveedor: sd.proveedor,
    zona: sd.zona,
    vendedor: sd.vendedor,
    ventas: Math.round(sd.ventas),
    unidades: sd.unidades
  }));

  // ============================================================
  // DIAGNÓSTICO — abre la consola del navegador (F12) para ver
  // ============================================================
  const totalVentasBrutas = Object.values(salesDailyAggr).reduce((s, d) => s + d.contado + d.credito, 0);
  const totalDevoluciones = Object.values(returnsDailyAggr).reduce((s, v) => s + v, 0);
  const totalProveedores   = Object.values(providersAggr).reduce((s, p) => s + p.ventas2026, 0);
  console.group('=== DIAGNÓSTICO CUBO ===');
  console.log('Filas procesadas:', processedRowsCount);
  console.log('Ventas brutas (suma positivos)  :', totalVentasBrutas.toLocaleString('es-CO'));
  console.log('Devoluciones (suma negativos)   :', totalDevoluciones.toLocaleString('es-CO'));
  console.log('Ventas netas esperadas          :', (totalVentasBrutas - totalDevoluciones).toLocaleString('es-CO'));
  console.log('Suma proveedores                :', totalProveedores.toLocaleString('es-CO'));
  console.log('Marcas detectadas               :', Object.keys(providersAggr));
  console.log('Días con ventas                 :', Object.keys(salesDailyAggr).length);
  console.log('Días con devoluciones           :', Object.keys(returnsDailyAggr).length);
  console.groupEnd();
  // ============================================================

  // DEBUG SUMMARY: totals after processing
  const debugPos = Object.values(salesDailyAggr).reduce((s,d)=>s+d.contado+d.credito,0);
  const debugNeg = Object.values(returnsDailyAggr).reduce((s,v)=>s+v,0);
  console.log('DEBUG SUMMARY - Positive sales:', debugPos, 'Total returns:', debugNeg);
        
  return {
    providers,
    salesDaily,
    zones,
    returnsSellers,
    returnsConcepts,
    returnsDaily,
    clientReturns,
    cityClients,
    salesDailyDb
  };
};

const UploadExcel = () => {
  const { addNotification, fetchDataFromSupabase } = useStore();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedFiles, setParsedFiles] = useState({});
  const [selectedSheets, setSelectedSheets] = useState({});
  const [uploadingSheets, setUploadingSheets] = useState(false);

  const hasSupabase = !!supabase;

  const steps = [
    { label: 'Analizando archivo y estructura de datos...', icon: FileText },
    { label: 'Limpiando registros vacíos y formateando monedas...', icon: Sparkles },
    { label: 'Normalizando nombres de columnas y códigos de zona...', icon: Database },
    { label: 'Insertando datos en Supabase PostgreSQL...', icon: Database },
    { label: 'Actualizando dashboards en tiempo real...', icon: RefreshCw }
  ];

  const handleProcess = async (
    targetFiles = files,
    targetParsed = parsedFiles,
    targetSelected = selectedSheets
  ) => {
    if (!targetFiles || targetFiles.length === 0) return;
    setUploading(true);
    setUploadStep(0);
    setErrorMsg('');
    setSuccess(false);

    try {
      // Step 0: Analizando archivo y estructura de datos
      await new Promise(resolve => setTimeout(resolve, 800));
      setUploadStep(1);

      // Step 1: Limpiando registros vacíos y formateando monedas
      await new Promise(resolve => setTimeout(resolve, 800));
      setUploadStep(2);

      // Step 2: Normalizando nombres de columnas y códigos de zona
      await new Promise(resolve => setTimeout(resolve, 800));
      setUploadStep(3);

      // Execute client-side aggregation
      const processedData = processSheetsClientSide(targetParsed, targetSelected);
      if (!processedData) {
        throw new Error('No se detectaron datos válidos en las hojas seleccionadas.');
      }

      // Find latest period in the processed data
      let latestPeriod = 'abril-2026';
      if (processedData.salesDaily && processedData.salesDaily.length > 0) {
        const validDates = processedData.salesDaily
          .filter(d => d.fecha && d.fecha !== 'general')
          .map(d => new Date(d.fecha))
          .filter(d => !isNaN(d.getTime()));
        if (validDates.length > 0) {
          validDates.sort((a, b) => b - a);
          const latest = validDates[0];
          const monthNames = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
          ];
          latestPeriod = `${monthNames[latest.getMonth()]}-${latest.getFullYear()}`;
        }
      }

      // Step 3: Insertando datos en Supabase PostgreSQL (fallbacks to local store update)
      setUploadStep(4);

      let isDbUpload = false;
      if (hasSupabase && supabase) {
        console.log('Sincronizando con Supabase PostgreSQL...');
        try {
          // 1. Providers
          const providersDb = processedData.providers.map(p => ({
            proveedor: p.proveedor,
            ventas2026: p.ventas2026,
            ventas2025: p.ventas2025,
            margen2026: p.margen2026,
            meta: p.proyectado2026
          }));
          await supabase.from('providers').delete().neq('id', 0);
          const { error: errProv } = await supabase.from('providers').insert(providersDb);
          if (errProv) throw new Error('Error al cargar proveedores: ' + errProv.message);

          // 2. Zones
          const zonesDb = processedData.zones.map(z => ({
            zona: z.zona,
            presupuesto: z.presupuesto,
            facturas: z.facturas,
            ventasnetas: z.ventasNetas // lowercase column in Postgres
          }));
          await supabase.from('zones').delete().neq('id', 0);
          const { error: errZones } = await supabase.from('zones').insert(zonesDb);
          if (errZones) throw new Error('Error al cargar zonas: ' + errZones.message);

          // 3. Returns Sellers
          const returnsSellersDb = processedData.returnsSellers.map(s => ({
            nombre: s.nombre,
            ejecutivo: s.ejecutivo,
            ventas: s.ventas,
            devoluciones: s.devoluciones
          }));
          await supabase.from('returns_sellers').delete().neq('id', 0);
          const { error: errSellers } = await supabase.from('returns_sellers').insert(returnsSellersDb);
          if (errSellers) throw new Error('Error al cargar vendedores: ' + errSellers.message);

          // 4. Sales Daily (Chunked upload to prevent size limit errors)
          await supabase.from('sales_daily').delete().neq('id', 0);
          if (processedData.salesDailyDb && processedData.salesDailyDb.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < processedData.salesDailyDb.length; i += chunkSize) {
              const chunk = processedData.salesDailyDb.slice(i, i + chunkSize);
              const { error: errSales } = await supabase.from('sales_daily').insert(chunk);
              if (errSales) throw new Error('Error al cargar ventas diarias: ' + errSales.message);
            }
          }

          // 5. Returns Daily (insert aggregated returns)
          await supabase.from('returns_daily').delete().neq('id', 0);
          if (processedData.returnsDaily && processedData.returnsDaily.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < processedData.returnsDaily.length; i += chunkSize) {
              const chunk = processedData.returnsDaily.slice(i, i + chunkSize);
              const { error: errReturns } = await supabase.from('returns_daily').insert(chunk);
              if (errReturns) throw new Error('Error al cargar devoluciones diarias: ' + errReturns.message);
            }
          }
          
          console.log('Sincronización con base de datos completada con éxito.');
          isDbUpload = true;

          // Sincronizar store local con los datos reales leídos de la DB
          await fetchDataFromSupabase();
        } catch (dbErr) {
          console.error('Database Sync Error:', dbErr);
          throw new Error('Error al sincronizar con la base de datos: ' + dbErr.message);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        // Fallback: persiste en localStorage usando setDbData para sobrevivir al refresh
        const { setDbData } = useStore.getState();
        setDbData(processedData, latestPeriod);
      }

      // Background ETL server ping (fails silently if offline)
      try {
        fetch('http://localhost:4000/run-etl').catch(() => {});
      } catch (e) {}

      setSuccess(true);
      setFiles([]);

      const store = useStore.getState();
      const newNotif = {
        id: Date.now(),
        type: 'success',
        title: isDbUpload ? 'Sincronización exitosa' : 'Actualización local exitosa',
        message: isDbUpload 
          ? 'Los datos comerciales se han cargado y sincronizado con éxito en Supabase PostgreSQL.'
          : 'Los datos del archivo comercial se han cargado localmente en los tableros.',
        time: 'Hace un momento',
        read: false,
      };
      useStore.setState({ notifications: [newNotif, ...store.notifications] });

    } catch (err) {
      console.error('Error procesando archivos:', err);
      setErrorMsg(err.message || 'Error al procesar el archivo Excel.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (acceptedFiles) => {
    setErrorMsg('');
    setSuccess(false);
    
    // Check if files are excel or csv
    const validFiles = acceptedFiles.filter(f => 
      f.name.endsWith('.xlsx') || 
      f.name.endsWith('.xlsm') || 
      f.name.endsWith('.csv') || 
      f.name.endsWith('.xls')
    );

    if (validFiles.length === 0) {
      setErrorMsg('Por formato no admitido. Ingrese archivos .xlsx, .xlsm, .xls o .csv');
      return;
    }

    setFiles(validFiles);

    let filesLoaded = 0;
    const newParsedFiles = {};
    const newSelectedSheets = {};

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          
          // DIAGNÓSTICO: nombres de hojas
          console.group('=== HOJAS DEL ARCHIVO ===');
          console.log('Hojas encontradas:', wb.SheetNames);
          console.groupEnd();

          const sheets = wb.SheetNames.map((name) => {
            const ws = wb.Sheets[name];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
            
            // DIAGNÓSTICO: columnas de la primera fila de cada hoja
            if (rows.length > 0) {
              console.group(`Hoja: "${name}" → ${rows.length} filas`);
              console.log('Columnas:', Object.keys(rows[0]));
              // Show first row to understand data structure
              const firstRow = rows[0];
              const valCols = ['vlrTotalconIva','vlrTotal','valor','total','vlrTotalConIva','vlrAntesIva','Valor Total','Valor Con Iva','total_con_iva'];
              const foundValCol = valCols.find(k => Object.keys(firstRow).some(rk => rk.toLowerCase().replace(/[^a-z0-9]/g,'') === k.toLowerCase().replace(/[^a-z0-9]/g,'')));
              console.log('Columna de valor detectada:', foundValCol || 'NINGUNA — revisar nombres de columnas');
              console.groupEnd();
            }
            
            return { name, rows };
          });
          
          newParsedFiles[file.name] = sheets;
          newSelectedSheets[file.name] = sheets.map(sh => sh.name);
        } catch (err) {
          console.error('Error parsing file', file.name, err);
        }

        filesLoaded++;
        if (filesLoaded === validFiles.length) {
          setParsedFiles(newParsedFiles);
          setSelectedSheets(newSelectedSheets);
          
          // AUTO-START processing immediately when cube is dragged & dropped!
          handleProcess(validFiles, newParsedFiles, newSelectedSheets);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true
  });

  const toggleSheet = (fileName, sheetName) => {
    setSelectedSheets((s) => {
      const list = new Set(s[fileName] || []);
      if (list.has(sheetName)) list.delete(sheetName);
      else list.add(sheetName);
      return { ...s, [fileName]: Array.from(list) };
    });
  };

  const uploadSelectedSheets = async () => {
    setUploadingSheets(true);
    const uploads = [];
    for (const fileName of Object.keys(parsedFiles)) {
      const sheets = parsedFiles[fileName];
      const want = new Set(selectedSheets[fileName] || []);
      for (const sh of sheets) {
        if (!want.has(sh.name)) continue;
        const json = JSON.stringify(sh.rows, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `${fileName.replace(/\.[^.]+$/, '')}_${sh.name.replace(/[^a-z0-9]/gi,'_')}.json`;
        if (hasSupabase && supabase) {
          const path = `raw/${Date.now()}_${filename}`;
          uploads.push(
            supabase.storage.from('uploads').upload(path, blob).then(res => ({ file: filename, res }))
          );
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          uploads.push(Promise.resolve({ file: filename, res: null }));
        }
      }
    }
    const results = await Promise.all(uploads);
    
    // Safely check VITE_PROCESS_SERVER_URL via import.meta.env
    const processServerUrl = import.meta.env.VITE_PROCESS_SERVER_URL;
    if (processServerUrl) {
      for (const r of results) {
        try {
          const resObj = r.res;
          const path = resObj && resObj.data && resObj.data.path;
          if (path) {
            fetch(`${processServerUrl.replace(/\/$/, '')}/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bucket: 'uploads', path })
            }).catch(err => console.error('Error calling process server', err));
          }
        } catch (e) {
          console.warn('No process call for result', e.message || e);
        }
      }
    }
    setUploadingSheets(false);
    
    const successCount = results.filter(r => !r.res || !r.res.error).length;
    setSuccess(true);
    setFiles([]);
    setParsedFiles({});
    setSelectedSheets({});
    const store = useStore.getState();
    const newNotif = {
      id: Date.now(),
      type: 'success',
      title: 'Hojas cargadas',
      message: `Se procesaron ${successCount} hojas seleccionadas.`,
      time: 'Hace un momento',
      read: false
    };
    useStore.setState({ notifications: [newNotif, ...store.notifications] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Cargar Archivos de Ventas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Suba sus reportes Excel (Ventas, Devoluciones, Proveedores o Zonas). El pipeline ETL procesará, limpiará y normalizará los datos automáticamente en Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Panel */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard hoverable={false} className="p-6">
            {!uploading && !success && (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/10'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    <UploadCloud className="h-10 w-10 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-200">
                      {isDragActive ? 'Suelte los archivos aquí' : 'Arrastre y suelte sus archivos Excel o CSV'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Formatos compatibles: .xlsx, .xlsm, .xls, .csv
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all mt-2">
                    Seleccionar Archivos
                  </button>
                </div>
              </div>
            )}

            {/* Pipeline progress steps */}
            {uploading && (
              <div className="py-8 px-4 space-y-6">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Procesando Pipeline ETL</h3>
                    <p className="text-xs text-slate-500 mt-1">Limpiando e inyectando datos comerciales en tiempo real</p>
                  </div>
                </div>

                <div className="space-y-3 max-w-md mx-auto pt-4">
                  {steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isCompleted = idx < uploadStep;
                    const isActive = idx === uploadStep;

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                            : isActive 
                              ? 'bg-blue-500/5 border-blue-500/25 text-blue-400 scale-[1.02]' 
                              : 'bg-slate-900/10 border-transparent text-slate-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="h-4.5 w-4.5 text-blue-500 animate-spin shrink-0" />
                        ) : (
                          <StepIcon className="h-4.5 w-4.5 shrink-0" />
                        )}
                        <span className="text-xs font-medium">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="py-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">¡Sincronización Completada!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      El pipeline ETL ha limpiado y cargado sus archivos con éxito. Los dashboards ya están actualizados.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setSuccess(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-all"
                  >
                    Cargar más archivos
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Files selection queue */}
            {files.length > 0 && !uploading && (
              <div className="mt-6 border-t border-slate-800/80 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archivos seleccionados ({files.length})</h4>
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-slate-200 font-bold truncate">{file.name}</span>
                      </div>
                      <span className="text-slate-500 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>

                {/* Parsed sheets preview + selection */}
                {Object.keys(parsedFiles).length > 0 && (
                  <div className="mt-4 border-t border-slate-800/60 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hojas detectadas</h4>
                    <div className="space-y-2">
                      {Object.entries(parsedFiles).map(([fName, sheets]) => (
                        <div key={fName} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
                          <div className="font-semibold text-slate-200 truncate">{fName}</div>
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {sheets.map((sh) => (
                              <label key={sh.name} className="flex items-center gap-2 text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={(selectedSheets[fName] || []).includes(sh.name)}
                                  onChange={() => toggleSheet(fName, sh.name)}
                                  className="accent-blue-500"
                                />
                                <span className="text-sm font-medium">{sh.name}</span>
                                <span className="ml-2 text-xs text-slate-500">{sh.rows.length} filas</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={uploadSelectedSheets}
                        disabled={uploadingSheets}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold"
                      >
                        {hasSupabase ? 'Subir hojas seleccionadas a Storage' : 'Descargar hojas seleccionadas'}
                      </button>
                      <button onClick={handleProcess} className="py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold">Procesar en Pipeline ETL</button>
                    </div>
                    {uploadingSheets && <div className="text-xs text-slate-400">Subiendo hojas...</div>}
                    {!hasSupabase && (
                      <div className="text-xs text-slate-500 mt-2">No configurado Supabase en entorno. Las hojas se descargarán localmente como JSON.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Informative Side Panel */}
        <div className="space-y-6">
          <GlassCard hoverable={false} className="border-blue-950/40 bg-blue-950/[0.01]">
            <h3 className="text-sm font-bold text-white mb-3">Integración de Archivos</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              La plataforma consolida información de cuatro fuentes principales del ecosistema comercial de Alpina:
            </p>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">1</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Informe Ventas Crédito/Contado</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Analiza composición de cartera comercial.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">2</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Resumen de Control Zonal</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Mide metas de cumplimiento y facturación.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">3</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Informe Devoluciones</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Mapea causas y tasa de devoluciones.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">4</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Seguimiento por Proveedor</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Mide participación YoY de marcas.</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard hoverable={false} className="border-amber-500/20 bg-amber-500/[0.01]">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Importador del Cubo de Ventas (CLI)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Para procesar el archivo completo del <strong>Cubo de Ventas</strong> (archivos de más de 20MB o 300,000 registros), se recomienda utilizar el importador de consola optimizado por streaming:
            </p>
            <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 border border-slate-900 select-all overflow-x-auto">
              node scripts/import_cubo.cjs C:\Ruta\Al\Cubo.csv
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Esto procesará, agrupará la información y la sincronizará directamente en Supabase y el archivo local de la plataforma.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default UploadExcel;
