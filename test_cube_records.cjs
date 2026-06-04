const fs = require('fs');
const readline = require('readline');
const csvPath = 'C:\\Users\\Juanjo\\Downloads\\CUBO_DE_VENTAS_TYM_EJE_AWS_de_2026-05-01_a_2026-05-30_user_60_18b217f7.csv';

const rl = readline.createInterface({
  input: fs.createReadStream(csvPath),
  crlfDelay: Infinity
});

let count = 0;
rl.on('line', (line) => {
  const parts = line.split(';');
  const motivo = parts[68]; // Index 68 matches 'motivo'
  if (motivo && motivo !== 'motivo') {
    count++;
    console.log(`Actual Return Record ${count}:`);
    console.log(`- dtFactura: ${parts[3]}`);
    console.log(`- txCiudad: ${parts[29]}`);
    console.log(`- nmZona (Seller): ${parts[14]}`);
    console.log(`- nbZona (Zone): ${parts[12]}`);
    console.log(`- nmProveedor: ${parts[36]}`);
    console.log(`- nmProducto: ${parts[40]}`);
    console.log(`- vlrTotalconIva: ${parts[58]}`);
    console.log(`- estadoPlanilla: ${parts[60]}`);
    console.log(`- motivo: ${motivo}`);
    if (count >= 5) {
      rl.close();
      process.exit(0);
    }
  }
});
