const XLSX = require('xlsx');
const excelPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-05-01_a_2026-05-27_user_60_e3679ba8.xlsx';

console.log('Loading workbook sheet header...');
const workbook = XLSX.readFile(excelPath, { sheetRows: 5 });
const firstSheetName = workbook.SheetNames[0];
console.log('First sheet:', firstSheetName);
const worksheet = workbook.Sheets[firstSheetName];
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
console.log('Headers / Row structure:', Object.keys(rows[0] || {}));
console.log('Sample row:', rows[0]);
