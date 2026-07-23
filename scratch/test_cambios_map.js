import { alpinaData } from '../src/data/alpina-data.js';

const clientReturns = alpinaData.clientReturns || [];
const zones = alpinaData.zones || [];

const map = {};
clientReturns.forEach(c => {
  const norm = (c.concepto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isCambio = norm.includes('mal estado') || norm.includes('vencim') || norm.includes('m.e');
  if (isCambio && c.ejecutivo) {
    map[c.ejecutivo] = (map[c.ejecutivo] || 0) + (Number(c.valor) || 0);
  }
});

console.log('Cambios per zone from clientReturns (MAL ESTADO):', map);

zones.slice(0, 15).forEach(z => {
  const cambioVal = map[z.zona] || map[z.vendedor] || 0;
  const rate = (z.ventasNetas > 0 && cambioVal > 0) ? (cambioVal / z.ventasNetas) : 0.015;
  const pct = (rate * 100).toFixed(1).replace('.', ',') + '%';
  console.log(`Zona ${z.zona} (${z.vendedor}): ventas=${z.ventasNetas}, cambioVal=${cambioVal}, rate=${pct}`);
});
