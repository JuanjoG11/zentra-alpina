const fs = require('fs');
const readline = require('readline');
const csvPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-05-01_a_2026-05-30_user_60_18b217f7.csv';

const rl = readline.createInterface({
  input: fs.createReadStream(csvPath),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  console.log('Headers:', line.split(';'));
  rl.close();
  process.exit(0);
});
