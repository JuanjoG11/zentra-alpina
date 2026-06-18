const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-06-01_a_2026-06-17_user_60_a46bcd22.xlsx';

const parseSpanishFloat = (str) => {
  if (str === null || str === undefined) return 0;
  if (typeof str === 'number') return str;
  let s = String(str).trim();
  const isNegative = s.includes('-') || (s.includes('(') && s.includes(')'));
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
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
};

// Target-key-priority based getRowValue
const getRowValue = (row, targetKeys) => {
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

const dateKeys = ['dtContabilizacion','dtFactura','dtEntrega','dtPlanilla','dtCierrePlanilla'];
const zoneKeys = ['nbZona','macrozona_id','macro','zona','Codigo Zona','CodigoZona'];
const sellerKeys = ['nmZona','conductor','vendedor','Ejecutivo Ventas'];
const cityKeys = ['txCiudad','nbCiudad','txBarrio','nbDepartamento','txDepartamento'];
const proveedorKeys = ['nmProveedor','idProveedor','proveedor'];
const brandKeys = ['nmTpMarca','marca'];
const valKeys = ['vlrAntesIva','vlrTotalconIva','vlrTotal','valor','total','Valor Total','vlrTotal'];
const facturaKeys = ['nbFactura','documento_id','idfactura','factura'];
const motivoKeys = ['motivo','idmotivo','concepto'];
const paymentKeys = ['nbFormaPago','forma_pago','formaPago','tipo_pago'];
const clientKeys = ['nmRazonSocial','nombre1','nombre2','apellido1','apellido2','cliente','razon_social','nm_razon_social','Cliente','Razón Social','Nombre Cliente'];

console.log('Reading workbook...');
console.time('Read');
const wb = XLSX.readFile(excelPath);
console.timeEnd('Read');

console.log('SheetNames in workbook:', wb.SheetNames);
console.log('Sheets keys in workbook:', Object.keys(wb.Sheets));
console.log('Converting sheet to JSON...');
console.time('JSON');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
console.timeEnd('JSON');

console.log(`Loaded ${rows.length} rows.`);

let processedRowsCount = 0;
let skippedNoDate = 0;
let skippedZeroValue = 0;
let totalVentas = 0;
let totalDevoluciones = 0;

for (const row of rows) {
  const dateVal = getRowValue(row, dateKeys);
  const zone = getRowValue(row, zoneKeys);
  const seller = getRowValue(row, sellerKeys);
  const proveedor = getRowValue(row, proveedorKeys) || 'SIN PROVEEDOR';
  const brand = getRowValue(row, brandKeys) || 'OTROS';
  
  const motivo = getRowValue(row, motivoKeys);
  const motivoStr = (motivo && String(motivo).toLowerCase() !== 'none' && String(motivo).toLowerCase() !== 'null') ? String(motivo).trim() : '';
  const valTotal = parseSpanishFloat(getRowValue(row, valKeys));
  
  const esDevolucion = (motivoStr !== '' && valTotal < 0);
  
  const factura = getRowValue(row, facturaKeys);
  const facturaStr = factura ? String(factura).trim() : '';
  const formaPago = String(getRowValue(row, paymentKeys) || '');
  const clientName = getRowValue(row, clientKeys) || 'CLIENTE DESCONOCIDO';

  if (!dateVal || String(dateVal).includes('0000')) {
    skippedNoDate++;
    continue;
  }
  if (valTotal === 0) {
    skippedZeroValue++;
    continue;
  }

  processedRowsCount++;
  if (esDevolucion) {
    totalDevoluciones += Math.abs(valTotal);
  } else {
    totalVentas += valTotal;
  }
}

console.log('--- Results ---');
console.log('Processed Rows Count:', processedRowsCount);
console.log('Skipped due to no date:', skippedNoDate);
console.log('Skipped due to zero value:', skippedZeroValue);
console.log('Total Sales (vlrAntesIva):', totalVentas);
console.log('Total Devoluciones:', totalDevoluciones);
console.log('Net Sales:', totalVentas - totalDevoluciones);
