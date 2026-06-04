import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Endpoint para ejecutar el pipeline ETL (GET por simplicidad)
app.get('/run-etl', async (req, res) => {
  try {
    console.log('ETL pipeline triggered via GET');
    // TODO: integrar lógica real del ETL aquí (por ejemplo, ejecutar scripts/process_excel.js)
    await new Promise(resolve => setTimeout(resolve, 500)); // simulación
    res.json({ success: true, message: 'ETL processed successfully (GET)' });
  } catch (error) {
    console.error('ETL error:', error);
    res.status(500).json({ success: false, message: 'ETL failed', error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ETL server listening on http://localhost:${PORT}`);
});
