const fs = require('fs');
const path = require('path');

// Robust CSV splitter that respects quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Helper to parse money strings
function parseMoney(str) {
  if (!str) return 0;
  const isNegative = str.includes('-');
  const cleaned = str.replace(/[-\$\"\s]/g, '').replace(/,/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  return isNegative ? -val : val;
}

// Helper to parse percentages
function parsePercent(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[%\s]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  return val / 100;
}

try {
  // 1. Parse Ventas por Proveedor
  const vpContent = fs.readFileSync(path.join(__dirname, 'data', 'ventas_proveedor.csv'), 'utf-8');
  const vpLines = vpContent.split(/\r?\n/);
  const providers = [];
  vpLines.forEach(line => {
    const parts = parseCSVLine(line);
    if (parts.length >= 8) {
      const name = parts[0];
      if (
        name && 
        name !== 'Etiquetas de fila' && 
        name !== 'Total general' && 
        !name.startsWith('SEGUIMIENTO') && 
        !name.startsWith('CIUDAD') && 
        !name.startsWith('MES')
      ) {
        providers.push({
          proveedor: name,
          ventas2025: parseMoney(parts[1]),
          proyectado2025: parseMoney(parts[2]),
          margen2025: parseFloat(parts[3]) || 0,
          ventas2026: parseMoney(parts[4]),
          proyectado2026: parseMoney(parts[5]),
          margen2026: parseFloat(parts[6]) || 0,
          crecimiento: parsePercent(parts[7])
        });
      }
    }
  });

  // 2. Parse Ventas Crédito / Contado
  const ccContent = fs.readFileSync(path.join(__dirname, 'data', 'ventas_credito_contado.csv'), 'utf-8');
  const ccLines = ccContent.split(/\r?\n/);
  const salesDaily = [];
  let startDaily = false;
  ccLines.forEach(line => {
    if (line.startsWith('FECHA,CONTADO')) {
      startDaily = true;
      return;
    }
    if (startDaily) {
      const parts = parseCSVLine(line);
      if (parts && parts.length >= 4) {
        const fecha = parts[0];
        if (fecha && fecha !== 'Total general' && !fecha.startsWith('SEDE')) {
          salesDaily.push({
            fecha: fecha,
            contado: parseMoney(parts[1]),
            credito: parseMoney(parts[2]),
            total: parseMoney(parts[3])
          });
        }
      }
    }
  });

  // 3. Parse Resumen Control (Zonas y Vendedores)
  const rcContent = fs.readFileSync(path.join(__dirname, 'data', 'resumen_control.csv'), 'utf-8');
  const rcLines = rcContent.split(/\r?\n/);
  const zones = [];
  let startZones = false;
  rcLines.forEach(line => {
    if (line.startsWith('Zona,Vendedor')) {
      startZones = true;
      return;
    }
    if (startZones) {
      const parts = parseCSVLine(line);
      if (parts && parts.length >= 8) {
        const zona = parts[0];
        if (zona && zona !== 'Total general') {
          const vendedor = parts[1] || '';
          zones.push({
            zona: zona,
            vendedor: vendedor,
            presupuesto: parseMoney(parts[2]),
            ventasNetas: parseMoney(parts[3]),
            proyectado: parseMoney(parts[4]),
            porcentajeProyectado: parsePercent(parts[5]),
            cambiosPorc: parsePercent(parts[6]),
            facturas: parseInt(parts[7]) || 0
          });
        }
      }
    }
  });

  // 4. Parse Devoluciones (Sellers, Concepts, Daily, and Client Returns)
  const devContent = fs.readFileSync(path.join(__dirname, 'data', 'devoluciones.csv'), 'utf-8');
  const devLines = devContent.split(/\r?\n/);
  const returnsSellers = [];
  const returnsConcepts = [];
  const returnsDaily = [];
  const clientReturns = [];
  let section = '';

  devLines.forEach(line => {
    if (line.startsWith('EJECUTIVO,NOMEJECU')) {
      section = 'sellers';
      return;
    }
    if (line.startsWith('NOMCONCEP,Suma de DEVOL')) {
      section = 'concepts';
      return;
    }
    if (line.startsWith('FECHA,Suma de DEVOL')) {
      section = 'daily';
      return;
    }
    if (line.startsWith('EJECUTIVO,NOMCLIENTE,NOMCONCEP')) {
      section = 'clientReturns';
      return;
    }
    if (
      line.trim() === '' || 
      line.startsWith('Total general') || 
      line.startsWith('INFORME') || 
      line.startsWith('AREANOMBRE') || 
      line.startsWith('AUXILIAR') ||
      line.startsWith('EJECUTIVO,(Todas)') ||
      line.startsWith('NOMEJECU,(Todas)') ||
      line.startsWith('NOMCONCEP,Suma de DEVOL SIN IVA') ||
      line.startsWith('DEVOLUCIONES POR AUXILIAR')
    ) {
      return;
    }

    const parts = parseCSVLine(line);
    if (!parts || parts.length < 2) return;

    if (section === 'sellers' && parts.length >= 5) {
      const ejecutivo = parts[0];
      const nombre = parts[1];
      if (ejecutivo && ejecutivo !== 'EJECUTIVO' && nombre !== 'Total general') {
        returnsSellers.push({
          ejecutivo: ejecutivo,
          nombre: nombre,
          ventas: parseMoney(parts[2]),
          devoluciones: parseMoney(parts[3]),
          porcentajeDevolucion: parsePercent(parts[4])
        });
      }
    } else if (section === 'concepts') {
      const concepto = parts[0];
      const pctStr = parts[1];
      if (concepto && concepto !== 'Total general') {
        returnsConcepts.push({
          concepto: concepto,
          porcentaje: parsePercent(pctStr)
        });
      }
    } else if (section === 'daily') {
      const fecha = parts[0];
      // Only match lines where the first column is a date
      if (fecha && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
        returnsDaily.push({
          fecha: fecha,
          devoluciones: parseMoney(parts[1])
        });
      }
    } else if (section === 'clientReturns' && parts.length >= 4) {
      const ejecutivo = parts[0];
      const cliente = parts[1];
      const concepto = parts[2];
      const valor = parseMoney(parts[3]);
      if (ejecutivo && ejecutivo !== 'EJECUTIVO' && ejecutivo !== 'Total general' && valor > 0) {
        clientReturns.push({
          ejecutivo,
          cliente,
          concepto,
          valor
        });
      }
    }
  });

  const output = {
    providers,
    salesDaily,
    zones,
    returnsSellers,
    returnsConcepts,
    returnsDaily,
    clientReturns
  };

  const outputFilePath = path.join(__dirname, 'src', 'data', 'alpina-data.js');
  fs.writeFileSync(outputFilePath, 'export const alpinaData = ' + JSON.stringify(output, null, 2) + ';\n');
  console.log('Successfully written data to src/data/alpina-data.js. Found ' + clientReturns.length + ' client return records.');
} catch (err) {
  console.error('Error running parser:', err);
}
