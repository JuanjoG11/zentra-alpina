import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import useStore from '../store/useStore';
import GlassCard from '../components/ui/GlassCard';
import { DEFAULT_ZONE_SELLERS } from '../utils/calculations';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { supabase } from '../services/supabaseClient';

/**
 * Parsea un ArrayBuffer de .xlsx directamente con JSZip + XML parser.
 * Corrige el bug de xlsx 0.18.5 con rutas absolutas en workbook.xml.rels
 * (Target="/xl/worksheets/sheet1.xml" en lugar de "worksheets/sheet1.xml").
 * Devuelve: { sheetNames: string[], sheets: { [name]: rows[] } }
 */
const parseXlsxWithJSZip = async (arrayBuffer) => {
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Leer workbook.xml para obtener nombres de hojas y rIds
  const wbXml = await zip.files['xl/workbook.xml'].async('string');
  const sheetMatches = [...wbXml.matchAll(/<sheet[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g)];
  const sheetNames = sheetMatches.map(m => m[1]);
  const rIdToName = {};
  sheetMatches.forEach(m => { rIdToName[m[2]] = m[1]; });

  // 2. Leer rels para resolver rId → archivo XML
  const relsXml = await zip.files['xl/_rels/workbook.xml.rels'].async('string');
  // El orden de atributos puede variar (Type, Target, Id en cualquier orden), usamos match por atributo
  const relMatches = [...relsXml.matchAll(/<Relationship\b([^>]*\/?>)/g)];
  const rIdToFile = {};
  relMatches.forEach(m => {
    const attrStr = m[1];
    const idMatch = attrStr.match(/Id="([^"]*)"/);
    const targetMatch = attrStr.match(/Target="([^"]*)"/);
    if (!idMatch || !targetMatch) return;
    let target = targetMatch[1];
    // Corregir rutas absolutas: /xl/worksheets/sheet1.xml → xl/worksheets/sheet1.xml
    if (target.startsWith('/')) target = target.slice(1);
    // Corregir rutas relativas sin prefijo xl/
    if (!target.startsWith('xl/') && !target.startsWith('docProps')) {
      target = 'xl/' + target;
    }
    rIdToFile[idMatch[1]] = target;
  });

  // 3. Leer shared strings (si existe)
  let sharedStrings = [];
  if (zip.files['xl/sharedStrings.xml']) {
    const ssXml = await zip.files['xl/sharedStrings.xml'].async('string');
    // Extraer cada <si>...</si>
    const siMatches = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)];
    sharedStrings = siMatches.map(m => {
      // Concatenar todos los <t> dentro del <si>
      const tMatches = [...m[1].matchAll(/<t(?:[^>]*)>([\s\S]*?)<\/t>/g)];
      return tMatches.map(t => t[1]).join('')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    });
  }

  // 4. Parsear cada hoja
  const parsedSheets = {};

  for (const [rId, sheetName] of Object.entries(rIdToName)) {
    const filePath = rIdToFile[rId];
    if (!filePath || !zip.files[filePath]) {
      console.warn(`No se encontró archivo para sheet "${sheetName}" (rId=${rId}, path=${filePath})`);
      parsedSheets[sheetName] = [];
      continue;
    }

    // Leer como uint8array para evitar el límite de string en archivos grandes (200k+ filas)
    const sheetBytes = await zip.files[filePath].async('uint8array');

    // Procesar el XML en chunks de 4MB para no superar el límite de string de V8
    const DECODE_CHUNK = 4 * 1024 * 1024;
    const rows = [];
    let headers = null;
    let isFirstRow = true;
    let remainder = '';

    const colToIdx = (col) => {
      let idx = 0;
      for (let i = 0; i < col.length; i++) idx = idx * 26 + (col.charCodeAt(i) - 64);
      return idx - 1;
    };

    const parseCells = (rowXml) => {
      const cellMatches = [...rowXml.matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)];
      return cellMatches.map(cM => {
        const attrs = cM[1]; const content = cM[2];
        const refMatch = attrs.match(/r="([A-Z]+)(\d+)"/);
        const colRef = refMatch ? refMatch[1] : null;
        const typeMatch = attrs.match(/t="([^"]*)"/);
        const cellType = typeMatch ? typeMatch[1] : 'n';
        // inlineStr
        const isMatch = content.match(/<is>[\s\S]*?<t(?:[^>]*)>([\s\S]*?)<\/t>/);
        let val = null;
        if (isMatch) {
          val = isMatch[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
        } else {
          const vMatch = content.match(/<v>([\s\S]*?)<\/v>/);
          if (vMatch) {
            val = vMatch[1];
            if (cellType === 's') {
              val = sharedStrings[parseInt(val)] ?? val;
            } else if (cellType === 'b') {
              val = val === '1';
            } else if (cellType !== 'str') {
              const num = parseFloat(val);
              if (!isNaN(num)) val = num;
            }
          }
        }
        return { col: colRef, val };
      });
    };

    const decoder = new TextDecoder('utf-8');
    for (let offset = 0; offset < sheetBytes.length; offset += DECODE_CHUNK) {
      const chunkBytes = sheetBytes.slice(offset, offset + DECODE_CHUNK);
      const chunkStr = remainder + decoder.decode(chunkBytes, { stream: offset + DECODE_CHUNK < sheetBytes.length });
      let searchFrom = 0;

      while (true) {
        const rowStart = chunkStr.indexOf('<row', searchFrom);
        if (rowStart === -1) { remainder = chunkStr.slice(searchFrom); break; }
        const rowEnd = chunkStr.indexOf('</row>', rowStart);
        if (rowEnd === -1) { remainder = chunkStr.slice(rowStart); break; }
        const rowXml = chunkStr.slice(rowStart, rowEnd + 6);
        searchFrom = rowEnd + 6;

        const cells = parseCells(rowXml);

        if (isFirstRow) {
          headers = [];
          cells.forEach(c => { if (c.col) headers[colToIdx(c.col)] = c.val !== null ? String(c.val) : ''; });
          for (let i = 0; i < headers.length; i++) { if (headers[i] === undefined) headers[i] = `__col_${i}`; }
          isFirstRow = false;
        } else {
          if (!headers || cells.length === 0) continue;
          const obj = {};
          let hasValue = false;
          cells.forEach(c => {
            if (!c.col) return;
            const idx = colToIdx(c.col);
            const header = headers[idx] || `__col_${idx}`;
            obj[header] = c.val;
            if (c.val !== null && c.val !== '') hasValue = true;
          });
          if (hasValue) rows.push(obj);
        }
      }
    }

    parsedSheets[sheetName] = rows;
    console.log(`✅ JSZip parser — "${sheetName}": ${rows.length} filas, ${(headers || []).filter(Boolean).length} columnas`);
    if (rows.length > 0) console.log('Headers (10 primeras):', Object.keys(rows[0]).slice(0, 10));
  }

  return { sheetNames, sheets: parsedSheets };
};
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
const processSheetsClientSide = (parsedFiles, selectedSheets, configuredWorkDay = 0) => {
  const providersAggr = {};   // key: nmProveedor
  const brandsAggr = {};      // key: nmTpMarca
  const salesDailyAggr = {};
  const zonesAggr = {};
  const sellersAggr = {};
  const conceptsAggr = {};
  const expiryConceptsAggr = {}; // Nueva: conceptos de vencimiento
  const returnsDailyAggr = {};
  const expiryDailyAggr = {}; // Nueva: devoluciones por vencimiento diarias
  const clientReturnsAggr = {};
  const expiryClientReturnsAggr = {}; // Nueva: devoluciones por vencimiento de clientes
  const salesDailyDbAggr = {};
  const productDistribAggr = {}; // key: nbProducto — distribución por producto/marca/familia
  
  const clientsPerCity = {
    'ARMENIA': new Set(),
    'MANIZALES': new Set(),
    'PEREIRA': new Set(),
    'OTRO': new Set()
  };

  const budgetMap = {
    'E7000': 9739616,
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
    'M9550': 78079017,
    'M9552': 115979855,
    'M9553': 118994777,
    'M9554': 142991674,
    'M9555': 131824208,
    'M9556': 124797071,
    'M9557': 230089941,
    'M9558': 135727633,
    'M9559': 165238515,
    'M9560': 87159396,
    'M9600': 62564014,
    'M9601': 121038599,
    'M9602': 138410924,
    'M9603': 137651254,
    'M9604': 115578543,
    'M9605': 137739094,
    'M9606': 101500232,
    'P7000': 65937889,
    'P7001': 71018396,
    'P7002': 149868956,
    'P7004': 147442404,
    'P7005': 108916800,
    'P7006': 142737629,
    'P7007': 159379696,
    'P7008': 93551428,
    'P7009': 64522723,
    'P7010': 78172901
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
    if (!row) return null;
    const keys = Object.keys(row);
    const normalizedKeysMap = {};
    for (const key of keys) {
      normalizedKeysMap[normalizeKey(key)] = key;
    }
    for (const targetKey of targetKeys) {
      const normTarget = normalizeKey(targetKey);
      if (normalizedKeysMap[normTarget] !== undefined) {
        return row[normalizedKeysMap[normTarget]];
      }
    }
    return null;
  };

  // CAMPOS CLAVE:
  // - Fecha:    dtContabilizacion (fecha contable, no dtFactura)
  // - Valor:    vlrAntesIva (valor antes de IVA, no vlrTotalconIva)
  // - Proveedor: nmProveedor (agrupado por proveedor, no por marca)
  // - Marca:    nmTpMarca
  // - Devolución: motivo no vacío Y vlrAntesIva < 0
  // - Facturas: contar únicas nbFactura SOLO cuando motivo está vacío
  const dateKeys = ['dtContabilizacion'];                          // solo fecha contable
  const zoneKeys = ['nbZona','macrozona_id','macro','zona','Codigo Zona','CodigoZona'];
  const sellerKeys = ['nmZona','conductor','vendedor','Ejecutivo Ventas'];
  const cityKeys = ['txCiudad','nbCiudad','txBarrio','nbDepartamento','txDepartamento'];
  const proveedorKeys = ['nmProveedor','idProveedor','proveedor'];
  const brandKeys = ['nmTpMarca','npmtpmarca','marca'];
  const valKeys = ['vlrAntesIva','vlrAntesIVA','vlr_antes_iva'];  // solo vlrAntesIva
  const facturaKeys = ['nbFactura','documento_id','idfactura','factura'];
  const motivoKeys = ['motivo','idmotivo','concepto'];
  const paymentKeys = ['nbFormaPago','forma_pago','formaPago','tipo_pago'];
  const clientKeys = ['nmRazonSocial','nombre1','nombre2','apellido1','apellido2','cliente','razon_social','nm_razon_social','Cliente','Razón Social','Nombre Cliente'];
  // Columnas de distribución numérica por producto
  const nbProductoKeys   = ['nbProducto','nb_producto','codigo_producto','codproducto'];
  const nmProductoKeys   = ['nmProducto','nm_producto','nombre_producto','nomproducto','producto'];
  const tpProductoKeys   = ['tpProducto','tp_producto','tipo_producto','tipoproducto'];
  const nmTpMarcaKeys    = ['nmTpMarca','nm_tp_marca','nmtpmarca','marca','brand'];
  const nmTpFamiliaKeys  = ['nmTpFamilia','nm_tp_familia','nmtpfamilia','familia','family'];
  const pesoTotalKeys    = ['pesoTotal','peso_total','pesototal','peso','pesototalgramos','peso_total_gramos','peso total'];

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
        let activeSeller = seller;
        if (!activeSeller || String(activeSeller).trim() === '' || String(activeSeller).toLowerCase() === 'sin asignar') {
          activeSeller = DEFAULT_ZONE_SELLERS[zone] || 'Sin Asignar';
        }
        const proveedor = getRowValue(row, proveedorKeys) || 'SIN PROVEEDOR';
        let brand = getRowValue(row, brandKeys) || 'OTROS';
        if (brand && String(brand).toUpperCase().includes('FINESSE')) {
          brand = 'FINESSE';
        }

        // Motivo y valor (vlrAntesIva)
        const motivo = getRowValue(row, motivoKeys);
        const motivoStr = (motivo && String(motivo).toLowerCase() !== 'none' && String(motivo).toLowerCase() !== 'null') ? String(motivo).trim() : '';
        const rawVal = parseSpanishFloat(getRowValue(row, valKeys));
        const valTotal = rawVal;

        // Devolución = motivo NO vacío Y vlrAntesIva negativo
        const esDevolucion = (motivoStr !== '' && valTotal < 0);

        const factura = getRowValue(row, facturaKeys);
        const facturaStr = factura ? String(factura).trim() : '';
        const formaPago = String(getRowValue(row, paymentKeys) || '');
        const clientName = getRowValue(row, clientKeys) || 'CLIENTE DESCONOCIDO';

        if (!dateVal || String(dateVal).includes('0000') || valTotal === 0) continue;

        const formattedDate = formatDateToMDY(dateVal);
        if (!formattedDate) continue;

        // 1. Providers — agrupado por nmProveedor
        if (!providersAggr[proveedor]) {
          providersAggr[proveedor] = { ventas2026: 0, count: 0, proveedorReal: proveedor };
        }
        if (!esDevolucion && valTotal > 0) {
          providersAggr[proveedor].ventas2026 += valTotal;
          providersAggr[proveedor].count++;
        }

        // 1b. Brands — agrupado por nmTpMarca
        if (!brandsAggr[brand]) {
          brandsAggr[brand] = { ventas2026: 0, count: 0 };
        }
        if (!esDevolucion && valTotal > 0) {
          brandsAggr[brand].ventas2026 += valTotal;
          brandsAggr[brand].count++;
        }

        // 2. Sales Daily — solo ventas reales (motivo vacío y valor positivo)
        if (!esDevolucion && valTotal > 0) {
          const dayZoneKey = `${formattedDate}_${zone || 'OTRO'}`;
          if (!salesDailyAggr[dayZoneKey]) {
            salesDailyAggr[dayZoneKey] = { fecha: formattedDate, zona: zone || 'OTRO', contado: 0, credito: 0 };
          }
          if (formaPago === '1' || formaPago.toUpperCase().includes('CONTADO')) {
            salesDailyAggr[dayZoneKey].contado += valTotal;
          } else {
            salesDailyAggr[dayZoneKey].credito += valTotal;
          }
        }

        // 3. Zones
        if (zone) {
          if (!zonesAggr[zone]) {
            zonesAggr[zone] = {
              zona: zone,
              vendedor: activeSeller || 'Sin Asignar',
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
          // Facturas únicas: solo cuando motivo está vacío (venta real, sin devolución)
          if (facturaStr && motivoStr === '') {
            zonesAggr[zone].facturas.add(facturaStr);
          }
          if (activeSeller && zonesAggr[zone].vendedor === 'Sin Asignar') {
            zonesAggr[zone].vendedor = activeSeller;
          }
        }

        // 4. Returns Sellers
        if (activeSeller) {
          if (!sellersAggr[activeSeller]) {
            sellersAggr[activeSeller] = {
              ejecutivo: zone || 'OTRO',
              nombre: activeSeller,
              ventas: 0,
              devoluciones: 0
            };
          }
          if (esDevolucion) {
            sellersAggr[activeSeller].devoluciones += Math.abs(valTotal);
          } else if (valTotal > 0) {
            sellersAggr[activeSeller].ventas += valTotal;
          }
        }

        // 5. Devoluciones: conceptos y diario
        if (esDevolucion) {
          const absVal = Math.abs(valTotal);
          
          // Detectar si es devolución por vencimiento (DEV. M.E. POR VENCIMIENTO)
          // Normalizar: quitar acentos, convertir a minúsculas, quitar puntos y espacios extras
          const motivoNormalizado = motivoStr
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .replace(/\./g, '') // Quitar puntos
            .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
            .trim();
          
          const esVencimiento = motivoNormalizado.includes('vencimiento');
          
          // DEBUG: Log para verificar detección
          if (motivoStr && motivoNormalizado.includes('venc')) {
            console.log('🔍 Motivo detectado:', motivoStr, '| Normalizado:', motivoNormalizado, '| Es vencimiento:', esVencimiento);
          }
          
          const dayZoneKey = `${formattedDate}_${zone || 'OTRO'}`;
          if (esVencimiento) {
            // Agrupar en categorías de cambios (usando variables expiry por compatibilidad de base de datos)
            expiryConceptsAggr[motivoStr] = (expiryConceptsAggr[motivoStr] || 0) + absVal;
            if (!expiryDailyAggr[dayZoneKey]) {
              expiryDailyAggr[dayZoneKey] = { fecha: formattedDate, zona: zone || 'OTRO', devoluciones: 0 };
            }
            expiryDailyAggr[dayZoneKey].devoluciones += absVal;
            
            const clientKey = `${zone}_${clientName}_${motivoStr}`;
            if (!expiryClientReturnsAggr[clientKey]) {
              expiryClientReturnsAggr[clientKey] = {
                ejecutivo: zone || 'OTRO',
                cliente: clientName,
                concepto: motivoStr,
                valor: 0
              };
            }
            expiryClientReturnsAggr[clientKey].valor += absVal;
          } else {
            // Rechazos (todos los demás motivos de devolución)
            conceptsAggr[motivoStr] = (conceptsAggr[motivoStr] || 0) + absVal;
            if (!returnsDailyAggr[dayZoneKey]) {
              returnsDailyAggr[dayZoneKey] = { fecha: formattedDate, zona: zone || 'OTRO', devoluciones: 0 };
            }
            returnsDailyAggr[dayZoneKey].devoluciones += absVal;
            
            const clientKey = `${zone}_${clientName}_${motivoStr}`;
            if (!clientReturnsAggr[clientKey]) {
              clientReturnsAggr[clientKey] = {
                ejecutivo: zone || 'OTRO',
                cliente: clientName,
                concepto: motivoStr,
                valor: 0
              };
            }
            clientReturnsAggr[clientKey].valor += absVal;
          }
        }

        // 6. Clientes por ciudad
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

        // 7b. Distribución numérica por producto — solo ventas reales (no devoluciones)
        if (!esDevolucion && valTotal > 0) {
          const nbProd   = String(getRowValue(row, nbProductoKeys)  || '').trim() || 'SIN_COD';
          const nmProd   = String(getRowValue(row, nmProductoKeys)  || '').trim() || 'Sin nombre';
          const tpProd   = String(getRowValue(row, tpProductoKeys)  || '').trim() || '';
          let nmMarca  = String(getRowValue(row, nmTpMarcaKeys)   || brand || '').trim() || 'OTROS';
          if (nmMarca.toUpperCase().includes('FINESSE')) {
            nmMarca = 'FINESSE';
          }
          const nmFam    = String(getRowValue(row, nmTpFamiliaKeys) || '').trim() || 'Sin familia';
          const pesoTotal = parseSpanishFloat(getRowValue(row, pesoTotalKeys)) || 0;
          const prodKey  = `${nmMarca}||${nmFam}||${nbProd}||${zone || 'OTRO'}||${activeSeller || 'Sin Asignar'}`;
          if (!productDistribAggr[prodKey]) {
            productDistribAggr[prodKey] = {
              nbProducto: nbProd, nmProducto: nmProd, tpProducto: tpProd,
              nmTpMarca: nmMarca, nmTpFamilia: nmFam,
              zona: zone || 'OTRO',
              vendedor: activeSeller || 'Sin Asignar',
              ventas: 0, facturas: new Set(), unidades: 0,
              clientes: new Set(),
              pesoTotalGramos: 0
            };
          }
          productDistribAggr[prodKey].ventas    += valTotal;
          productDistribAggr[prodKey].unidades  += 1;
          productDistribAggr[prodKey].pesoTotalGramos += pesoTotal;
          if (facturaStr) productDistribAggr[prodKey].facturas.add(facturaStr);
          if (clientName) productDistribAggr[prodKey].clientes.add(clientName);
        }

        // 7. Detalle ventas diarias para Supabase — solo ventas reales
        if (zone && activeSeller && !esDevolucion && valTotal > 0) {
          const ymdDate = formatDateToYMD(dateVal);
          if (ymdDate) {
            const dbKey = `${ymdDate}_${proveedor}_${zone}_${activeSeller}`;
            if (!salesDailyDbAggr[dbKey]) {
              salesDailyDbAggr[dbKey] = {
                fecha: ymdDate,
                proveedor: proveedor,
                marca: brand,
                zona: zone,
                vendedor: activeSeller,
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

  // If no rows were processed, return empty structures instead of null to avoid UI crashes
  console.log('processSheetsClientSide - processedRowsCount:', processedRowsCount);
  console.log('processSheetsClientSide - providers count:', Object.keys(providersAggr).length);
  console.log('processSheetsClientSide - salesDaily count:', Object.keys(salesDailyAggr).length);
  console.log('processSheetsClientSide - zones count:', Object.keys(zonesAggr).length);
  console.log('processSheetsClientSide - returnsSellers count:', Object.keys(sellersAggr).length);
  console.log('processSheetsClientSide - returnsConcepts count:', Object.keys(conceptsAggr).length);
  console.log('processSheetsClientSide - expiryConcepts count:', Object.keys(expiryConceptsAggr).length);

  if (processedRowsCount === 0) {
    return {
      providers: [],
      salesDaily: [],
      zones: [],
      returnsSellers: [],
      returnsConcepts: [],
      returnsDaily: [],
      clientReturns: [],
      expiryConcepts: [],
      expiryDaily: [],
      expiryClientReturns: [],
      cityClients: {},
      salesDailyDb: []
    };
  }


  // Proyección: días hábiles según el período detectado
  // Si el usuario configuró un día hábil manualmente, usarlo. Si no, contar días del cubo.
  const DIAS_HABILES_POR_PERIODO = { '2026-06': 22, '2026-07': 23 };
  // Detectar el período del cubo desde las fechas de ventas
  const _allSaleDates = Object.values(salesDailyAggr).map(d => new Date(d.fecha)).filter(d => !isNaN(d));
  const _latestSaleDate = _allSaleDates.length ? _allSaleDates.reduce((a, b) => b > a ? b : a) : new Date();
  const _cuboPeriodo = `${_latestSaleDate.getFullYear()}-${String(_latestSaleDate.getMonth() + 1).padStart(2, '0')}`;
  const TOTAL_BUSINESS_DAYS = DIAS_HABILES_POR_PERIODO[_cuboPeriodo] || 22;
  const uniqueSalesDates = new Set(Object.values(salesDailyAggr).map(d => d.fecha));
  const detectedDays = uniqueSalesDates.size || 1;
  const elapsedDays = (configuredWorkDay > 0 && configuredWorkDay <= TOTAL_BUSINESS_DAYS)
    ? configuredWorkDay
    : detectedDays;
  // Solo proyectar si tenemos datos suficientes y no pasamos del total de días
  let projectionFactor = 1;
  if (elapsedDays >= 3 && elapsedDays < TOTAL_BUSINESS_DAYS) {
    projectionFactor = TOTAL_BUSINESS_DAYS / elapsedDays;
  }

  // Format aggregates
  // Providers: agrupado por nmProveedor
  const providers = Object.entries(providersAggr).map(([provName, data]) => {
    const v26 = Math.round(data.ventas2026);
    const v25 = Math.round(v26 / 1.2179);
    return {
      proveedor: provName,
      proveedorReal: provName,
      ventas2025: v25,
      proyectado2025: v25,
      margen2025: 15,
      ventas2026: v26,
      proyectado2026: Math.round(v26 * projectionFactor),
      margen2026: 15,
      crecimiento: 0.2179
    };
  }).sort((a, b) => b.ventas2026 - a.ventas2026);

  const salesDaily = Object.values(salesDailyAggr).map(data => {
    const cont = Math.round(data.contado);
    const cred = Math.round(data.credito);
    return {
      fecha: data.fecha,
      zona: data.zona,
      contado: cont,
      credito: cred,
      total: cont + cred
    };
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const zones = Object.entries(zonesAggr).map(([zoneCode, data]) => {
    const net = Math.round(data.ventasNetas);
    const dev = Math.round(data.devoluciones);
    const budget = budgetMap[zoneCode] || Math.round(net / 0.95);
    const projectedNet = Math.round(net * projectionFactor);
    return {
      zona: zoneCode,
      vendedor: data.vendedor,
      presupuesto: budget,
      ventasNetas: net,
      devoluciones: dev,
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

  const returnsDaily = Object.values(returnsDailyAggr).map(data => {
    return {
      fecha: data.fecha,
      zona: data.zona,
      devoluciones: Math.round(data.devoluciones)
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

  // Procesar devoluciones por vencimiento
  const totalExpiryValue = Object.values(expiryConceptsAggr).reduce((a, b) => a + b, 0);
  const expiryConcepts = Object.entries(expiryConceptsAggr).map(([concept, val]) => {
    return {
      concepto: concept,
      porcentaje: totalExpiryValue > 0 ? Number((val / totalExpiryValue).toFixed(4)) : 0.0
    };
  }).sort((a, b) => b.porcentaje - a.porcentaje);

  const expiryDaily = Object.values(expiryDailyAggr).map(data => {
    return {
      fecha: data.fecha,
      zona: data.zona,
      devoluciones: Math.round(data.devoluciones)
    };
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const expiryClientReturns = Object.values(expiryClientReturnsAggr).map(cr => {
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
  const totalDevoluciones = Object.values(returnsDailyAggr).reduce((s, d) => s + d.devoluciones, 0);
  const totalDevVencimiento = Object.values(expiryDailyAggr).reduce((s, d) => s + d.devoluciones, 0);
  const totalProveedores   = Object.values(providersAggr).reduce((s, p) => s + p.ventas2026, 0);
  console.group('=== DIAGNÓSTICO CUBO ===');
  console.log('Filas procesadas            :', processedRowsCount);
  console.log('Ventas brutas (vlrAntesIva) :', totalVentasBrutas.toLocaleString('es-CO'));
  console.log('Rechazos                    :', totalDevoluciones.toLocaleString('es-CO'));
  console.log('Cambios                     :', totalDevVencimiento.toLocaleString('es-CO'));
  console.log('Total devoluciones          :', (totalDevoluciones + totalDevVencimiento).toLocaleString('es-CO'));
  console.log('Ventas netas esperadas      :', (totalVentasBrutas - totalDevoluciones - totalDevVencimiento).toLocaleString('es-CO'));
  console.log('Suma proveedores            :', totalProveedores.toLocaleString('es-CO'));
  console.log('Proveedores detectados      :', Object.keys(providersAggr));
  console.log('Marcas detectadas           :', Object.keys(brandsAggr));
  console.log('Días con ventas             :', new Set(Object.values(salesDailyAggr).map(d => d.fecha)).size);
  console.log('Días con Rechazos           :', new Set(Object.values(returnsDailyAggr).map(d => d.fecha)).size);
  console.log('Días con Cambios            :', new Set(Object.values(expiryDailyAggr).map(d => d.fecha)).size);
  console.groupEnd();
  // ============================================================

  // DEBUG SUMMARY: totals after processing
  const debugPos = Object.values(salesDailyAggr).reduce((s,d)=>s+d.contado+d.credito,0);
  const debugNeg = Object.values(returnsDailyAggr).reduce((s,d)=>s+d.devoluciones,0);
  const debugExp = Object.values(expiryDailyAggr).reduce((s,d)=>s+d.devoluciones,0);
  console.log('DEBUG SUMMARY - Positive sales:', debugPos, 'Rechazos:', debugNeg, 'Cambios:', debugExp);
        
  // Formatear distribución numérica de productos
  const totalProductVentas = Object.values(productDistribAggr).reduce((s, p) => s + p.ventas, 0);
  const productDistrib = Object.values(productDistribAggr).map(p => ({
    nbProducto:  p.nbProducto,
    nmProducto:  p.nmProducto,
    tpProducto:  p.tpProducto,
    nmTpMarca:   p.nmTpMarca,
    nmTpFamilia: p.nmTpFamilia,
    zona:        p.zona,
    vendedor:    p.vendedor,
    ventas:      Math.round(p.ventas),
    facturas:    p.facturas.size,
    unidades:    p.unidades,
    clientesCount: p.clientes ? p.clientes.size : 0,
    participacion: totalProductVentas > 0 ? Number((p.ventas / totalProductVentas).toFixed(4)) : 0,
    pesoTotal:   p.pesoTotalGramos || 0
  })).sort((a, b) => b.ventas - a.ventas);

  return {
    providers,
    salesDaily,
    zones,
    returnsSellers,
    returnsConcepts,
    returnsDaily,
    clientReturns,
    expiryConcepts,
    expiryDaily,
    expiryClientReturns,
    cityClients,
    productDistrib,
    salesDailyDb
  };
};

const UploadExcel = () => {
  const { addNotification, fetchDataFromSupabase, currentWorkDay, setCurrentWorkDay, selectedPeriod } = useStore();
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

      // Execute client-side aggregation — pasar el día hábil configurado para proyección correcta
      const processedData = processSheetsClientSide(targetParsed, targetSelected, useStore.getState().currentWorkDay);
      if (!processedData) {
        throw new Error('No se detectaron datos válidos en las hojas seleccionadas.');
      }

      // El período lo define el selector activo en la app cuando se sube el cubo.
      // Si estás parado en Julio 2026 y subís → todo es julio, sin importar fechas de facturas.
      // Si estás parado en Junio 2026 y subís → todo es junio.
      const latestPeriod = useStore.getState().selectedPeriod;
      console.log(`📅 Período del cubo: ${latestPeriod} (período seleccionado en la app)`);

      // Step 3: Insertando datos en Supabase PostgreSQL (fallbacks to local store update)
      setUploadStep(4);

      let isDbUpload = false;
      if (hasSupabase && supabase) {
        console.log('Sincronizando con Supabase PostgreSQL...');
        try {
          // El período es el mes actual en que se sube el cubo
          const uploadPeriod = latestPeriod;
          console.log(`📅 Cargando período: ${uploadPeriod} (los períodos anteriores quedan intactos)`);

          // 1. Providers — borrar solo el período actual e insertar
          const providersDb = processedData.providers.map(p => ({
            proveedor: p.proveedor,
            ventas2026: p.ventas2026,
            ventas2025: p.ventas2025,
            margen2026: p.margen2026,
            meta: p.proyectado2026,
            periodo: uploadPeriod
          }));
          await supabase.from('providers').delete().eq('periodo', uploadPeriod);
          const { error: errProv } = await supabase.from('providers').insert(providersDb);
          if (errProv) throw new Error('Error al cargar proveedores: ' + errProv.message);

          // 2. Zones — borrar solo el período actual e insertar
          const zonesDb = processedData.zones.map(z => ({
            zona: z.zona,
            presupuesto: z.presupuesto,
            facturas: z.facturas,
            ventasnetas: z.ventasNetas,
            periodo: uploadPeriod
          }));
          await supabase.from('zones').delete().eq('periodo', uploadPeriod);
          const { error: errZones } = await supabase.from('zones').insert(zonesDb);
          if (errZones) throw new Error('Error al cargar zonas: ' + errZones.message);

          // 3. Returns Sellers — borrar solo el período actual e insertar
          const returnsSellersDb = processedData.returnsSellers.map(s => ({
            nombre: s.nombre,
            ejecutivo: s.ejecutivo,
            ventas: s.ventas,
            devoluciones: s.devoluciones,
            periodo: uploadPeriod
          }));
          await supabase.from('returns_sellers').delete().eq('periodo', uploadPeriod);
          const { error: errSellers } = await supabase.from('returns_sellers').insert(returnsSellersDb);
          if (errSellers) throw new Error('Error al cargar vendedores: ' + errSellers.message);

          // 4. Sales Daily — borrar solo el período actual e insertar deduplicado
          if (processedData.salesDailyDb && processedData.salesDailyDb.length > 0) {
            // Deduplicar por (fecha, proveedor, vendedor) antes de insertar
            const salesMap = new Map();
            processedData.salesDailyDb.forEach(row => {
              const key = `${row.fecha}__${row.proveedor}__${row.vendedor}`;
              if (salesMap.has(key)) {
                // Acumular si hay duplicado
                const existing = salesMap.get(key);
                existing.ventas   += row.ventas;
                existing.unidades += row.unidades;
              } else {
                salesMap.set(key, { ...row });
              }
            });
            const dedupedSales = Array.from(salesMap.values()).map(r => ({ ...r, periodo: uploadPeriod }));
            console.log(`Sales daily: ${processedData.salesDailyDb.length} filas → ${dedupedSales.length} deduplicadas`);

            // Borrar solo el período y reinsertar
            await supabase.from('sales_daily').delete().eq('periodo', uploadPeriod);
            const chunkSize = 400;
            for (let i = 0; i < dedupedSales.length; i += chunkSize) {
              const chunk = dedupedSales.slice(i, i + chunkSize);
              const { error: errSales } = await supabase.from('sales_daily').insert(chunk);
              if (errSales) throw new Error('Error al cargar ventas diarias: ' + errSales.message);
            }
          }

          // 5. Returns Daily — borrar solo el período actual e insertar deduplicado
          if (processedData.returnsDaily && processedData.returnsDaily.length > 0) {
            const returnsMap = new Map();
            processedData.returnsDaily.forEach(row => {
              const key = String(row.fecha);
              if (returnsMap.has(key)) {
                returnsMap.get(key).devoluciones += row.devoluciones;
              } else {
                returnsMap.set(key, { ...row });
              }
            });
            const dedupedReturns = Array.from(returnsMap.values());

            await supabase.from('returns_daily').delete().eq('periodo', uploadPeriod);
            const chunkSize = 400;
            for (let i = 0; i < dedupedReturns.length; i += chunkSize) {
              const chunk = dedupedReturns.slice(i, i + chunkSize);
              // Remove zona field if it does not exist in the Supabase schema, add periodo
              const adjustedChunk = chunk.map(row => {
                const { zona, ...rest } = row;
                return { ...rest, periodo: uploadPeriod };
              });
              const { error: errReturns } = await supabase.from('returns_daily').insert(adjustedChunk);
              if (errReturns) throw new Error('Error al cargar devoluciones diarias: ' + errReturns.message);
            }
          }
          
          console.log('Sincronización con base de datos completada con éxito.');
          isDbUpload = true;

          // Persistir datos de cambios (expiry) en localStorage ANTES de re-sincronizar,
          // porque estos datos solo vienen del Excel y no tienen tablas propias en Supabase.
          try {
            const existingRaw = localStorage.getItem('zentra_alpina_dbData');
            const existing = existingRaw ? JSON.parse(existingRaw) : {};
            existing.expiryConcepts = processedData.expiryConcepts || [];
            existing.expiryDaily = processedData.expiryDaily || [];
            existing.expiryClientReturns = processedData.expiryClientReturns || [];
            existing.returnsConcepts = processedData.returnsConcepts || [];
            existing.clientReturns = processedData.clientReturns || [];
            existing.productDistrib = processedData.productDistrib || [];
            localStorage.setItem('zentra_alpina_dbData', JSON.stringify(existing));
            localStorage.setItem('zentra_alpina_period', latestPeriod);
            console.log('✅ Datos de cambios/rechazos/distribución persistidos en localStorage antes de sync');
          } catch (e) { console.warn('Error al persistir datos locales:', e); }

          // Sincronizar store local con los datos reales leídos de la DB
          await fetchDataFromSupabase();
        } catch (dbErr) {
          console.error('Database Sync Error:', dbErr);
          throw new Error('Error al sincronizar con la base de datos: ' + dbErr.message);
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        // Fallback: persiste en localStorage usando setDbData para sobrevivir al refresh
        // Fallback: persiste en localStorage usando setDbData para sobrevivir al refresh
        const { setDbData } = useStore.getState();
        setDbData(processedData, latestPeriod);
        console.log('✅ Uploaded data stored via setDbData', { processedData, latestPeriod });

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
      reader.onload = async (e) => {
        try {
          const data = e.target.result; // ArrayBuffer

          let sheetNames = [];
          let sheetDataMap = {}; // { [sheetName]: rows[] }

          // --- Intento 1: Parser propio con JSZip (corrige bug de xlsx con rutas absolutas) ---
          try {
            const parsed = await parseXlsxWithJSZip(data);
            sheetNames = parsed.sheetNames;
            sheetDataMap = parsed.sheets;
            // Verificar que realmente se obtuvieron filas
            const totalRows = Object.values(sheetDataMap).reduce((s, r) => s + r.length, 0);
            if (totalRows === 0) throw new Error('JSZip parser devolvió 0 filas, intentando fallback');
          } catch (jsZipErr) {
            console.warn('JSZip parser falló, usando xlsx como fallback:', jsZipErr.message);
            // --- Fallback: xlsx con detección robusta de header ---
            const wb = XLSX.read(data, { type: 'array', raw: true, cellDates: false });
            sheetNames = wb.SheetNames;
            wb.SheetNames.forEach(name => {
              const ws = wb.Sheets[name];
              if (!ws) { sheetDataMap[name] = []; return; }
              const rawMatrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
              let headerRowIdx = 0;
              for (let i = 0; i < Math.min(20, rawMatrix.length); i++) {
                const nonEmpty = (rawMatrix[i] || []).filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
                if (nonEmpty >= 5) { headerRowIdx = i; break; }
              }
              const headers = (rawMatrix[headerRowIdx] || []).map(h => h !== null ? String(h).trim() : '');
              const rows = [];
              for (let i = headerRowIdx + 1; i < rawMatrix.length; i++) {
                const rawRow = rawMatrix[i];
                if (!rawRow) continue;
                if (!rawRow.some(c => c !== null && c !== undefined && String(c).trim() !== '')) continue;
                const obj = {};
                headers.forEach((h, idx) => { if (h) obj[h] = rawRow[idx] !== undefined ? rawRow[idx] : null; });
                rows.push(obj);
              }
              sheetDataMap[name] = rows;
            });
          }

          // Diagnóstico: nombres de hojas
          console.group('=== HOJAS DEL ARCHIVO ===');
          console.log('Hojas encontradas:', sheetNames);
          console.groupEnd();

          const sheets = sheetNames.map(name => {
            const rows = sheetDataMap[name] || [];

            if (rows.length > 0) {
              console.group(`Hoja: "${name}" → ${rows.length} filas`);
              console.log('Columnas:', Object.keys(rows[0]));
              const firstRow = rows[0];
              const valCols = ['vlrAntesIva','vlrAntesIVA','vlr_antes_iva'];
              const foundValCol = valCols.find(k => Object.keys(firstRow).some(rk => rk.toLowerCase().replace(/[^a-z0-9]/g,'') === k.toLowerCase().replace(/[^a-z0-9]/g,'')));
              console.log('Columna de valor (vlrAntesIva) detectada:', foundValCol || 'NINGUNA — revisar nombres de columnas');
              // Extra: verificar qué valor tiene la primera fila
              if (foundValCol) {
                const sampleKey = Object.keys(firstRow).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g,'') === foundValCol.toLowerCase().replace(/[^a-z0-9]/g,''));
                console.log('Valor muestra fila 1:', firstRow[sampleKey]);
              }
              console.groupEnd();
            } else {
              console.warn(`⚠️ Hoja "${name}" resultó en 0 filas.`);
            }

            return { name, rows };
          });
          
          newParsedFiles[file.name] = sheets;
          // DEBUG: log rows count per sheet
          sheets.forEach(sh => {
            console.log('🔎 Parsed sheet', sh.name, 'rows count:', (sh.rows || []).length);
          });
          newSelectedSheets[file.name] = sheets.map(sh => sh.name);
        } catch (err) {
          console.error('Error parsing file', file.name, err);
        } finally {
          filesLoaded++;
          if (filesLoaded === validFiles.length) {
            setParsedFiles(newParsedFiles);
            setSelectedSheets(newSelectedSheets);
            // AUTO-START processing immediately when cube is dragged & dropped!
            handleProcess(validFiles, newParsedFiles, newSelectedSheets);
          }
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Cargar Archivos de Ventas</h1>
        <p className="text-slate-400 text-xs md:text-sm mt-1">
          Suba sus reportes Excel (Ventas, Devoluciones, Proveedores o Zonas). El pipeline ETL procesará, limpiará y normalizará los datos automáticamente en Supabase.
        </p>
        {/* Indicador del período activo */}
        {(() => {
          const parts = (selectedPeriod || '').match(/^(\d{4})-(\d{2})$/);
          const mNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const label = parts ? `${mNames[parseInt(parts[2],10)-1]} ${parts[1]}` : selectedPeriod;
          return (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <span className="text-[10px] text-blue-300 font-medium uppercase tracking-wider">Cargando en período:</span>
              <span className="text-xs font-bold text-blue-200">{label}</span>
              <span className="text-[10px] text-slate-500">· Cambiá el selector arriba para cargar otro mes</span>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
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
          <GlassCard hoverable={false} className="border-emerald-500/20 bg-emerald-500/[0.01] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Día Hábil del Periodo</h3>
                <p className="text-[10px] text-slate-400">Indica en qué día hábil del mes están los datos cargados</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              La proyección de cierre de mes en la IA se basa en este número. Si el cubo tiene datos hasta el día 13, ingresa <strong className="text-white">13</strong>. Si pon <strong className="text-white">0</strong> para que se auto-detecte desde las fechas del cubo.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="31"
                value={currentWorkDay}
                onChange={e => setCurrentWorkDay(e.target.value)}
                className="w-20 bg-slate-900 border border-slate-700 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-sm font-bold text-white text-center focus:outline-none transition-colors"
                placeholder="0"
              />
              <div className="flex-1">
                <p className="text-xs text-slate-300 font-semibold">
                  {currentWorkDay === 0
                    ? 'Auto-detectando desde fechas del cubo'
                    : `Día hábil ${currentWorkDay} de 22 del mes`}
                </p>
                {currentWorkDay > 0 && (
                  <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((currentWorkDay / 22) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

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
