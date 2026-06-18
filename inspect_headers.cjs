const XLSX = require('xlsx');
const excelPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-06-01_a_2026-06-17_user_60_a46bcd22.xlsx';

console.log('Loading workbook sheet header...');
const workbook = XLSX.readFile(excelPath, { sheetRows: 100 });
const firstSheetName = workbook.SheetNames[0];
console.log('First sheet name:', firstSheetName);
const worksheet = workbook.Sheets[firstSheetName];
if (!worksheet) {
  console.log('Worksheet is undefined!');
  process.exit(1);
}
console.log('Worksheet range:', worksheet['!ref']);
const keys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
console.log('Number of cells parsed:', keys.length);
console.log('First 30 cell keys and values:');
keys.slice(0, 30).forEach(k => {
  console.log(`${k}:`, worksheet[k].v);
});



