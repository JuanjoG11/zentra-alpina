const XLSX = require('xlsx');
const path = require('path');

const excelPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-06-01_a_2026-06-17_user_60_a46bcd22.xlsx';

console.log('Loading workbook...');
console.time('LoadTime');
const workbook = XLSX.readFile(excelPath, { bookSheets: true });
console.timeEnd('LoadTime');

console.log('Sheet names:', workbook.SheetNames);
