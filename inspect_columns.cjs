const XLSX = require('xlsx');

const excelPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-05-01_a_2026-05-27_user_60_e3679ba8.xlsx';

console.log('Loading workbook ref and sheetNames...');
const workbook = XLSX.readFile(excelPath, { bookSheets: false });
const firstSheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[firstSheetName];
console.log('Sheet name:', firstSheetName);
if (worksheet) {
  console.log('Ref:', worksheet['!ref']);
  // let's log the first 100 cell keys
  const keys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
  console.log('Number of cell keys:', keys.length);
  console.log('Some cell keys:', keys.slice(0, 20));
  // print value of the first 20 cells
  keys.slice(0, 20).forEach(k => {
    console.log(`${k}:`, worksheet[k].v, worksheet[k].t);
  });
} else {
  console.log('Worksheet is undefined!');
}
