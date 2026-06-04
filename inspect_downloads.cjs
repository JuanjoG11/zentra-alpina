const fs = require('fs');
const path = require('path');
const downloadsDir = 'C:\\Users\\Juanjo\\Downloads';

try {
  const files = fs.readdirSync(downloadsDir);
  const matching = files.filter(f => f.toUpperCase().startsWith('CUBO_DE_VENTAS'));
  console.log('Matching files in Downloads:', matching);
  matching.forEach(f => {
    const stats = fs.statSync(path.join(downloadsDir, f));
    console.log(`- ${f}: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  });
} catch (e) {
  console.error('Error reading Downloads:', e.message);
}
