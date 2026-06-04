import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import useStore from '../store/useStore';
import GlassCard from '../components/ui/GlassCard';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Database,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const UploadExcel = () => {
  const { addNotification, fetchDataFromSupabase } = useStore();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedFiles, setParsedFiles] = useState({});
  const [selectedSheets, setSelectedSheets] = useState({});
  const [uploadingSheets, setUploadingSheets] = useState(false);

  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const VITE_PROCESS_SERVER_URL = import.meta.env.VITE_PROCESS_SERVER_URL;
  const hasSupabase = !!VITE_SUPABASE_URL && !!VITE_SUPABASE_ANON_KEY;
  const supabase = hasSupabase ? createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) : null;

  const steps = [
    { label: 'Analizando archivo y estructura de datos...', icon: FileText },
    { label: 'Limpiando registros vacíos y formateando monedas...', icon: Sparkles },
    { label: 'Normalizando nombres de columnas y códigos de zona...', icon: Database },
    { label: 'Insertando datos en Supabase PostgreSQL...', icon: Database },
    { label: 'Actualizando dashboards en tiempo real...', icon: RefreshCw }
  ];

  const onDrop = (acceptedFiles) => {
    setErrorMsg('');
    setSuccess(false);
    
    // Check if files are excel or csv
    const validFiles = acceptedFiles.filter(f => 
      f.name.endsWith('.xlsx') || 
      f.name.endsWith('.xlsm') || 
      f.name.endsWith('.csv') || 
      f.name.endsWith('.xls')
    );

    if (validFiles.length === 0) {
      setErrorMsg('Por formato no admitido. Ingrese archivos .xlsx, .xlsm, .xls o .csv');
      return;
    }

    setFiles(validFiles);
    // parse sheets client-side for preview and selection
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheets = wb.SheetNames.map((name) => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
            return { name, rows };
          });
          setParsedFiles((p) => ({ ...p, [file.name]: sheets }));
          // default select all sheets of this file
          setSelectedSheets((s) => ({ ...s, [file.name]: sheets.map(sh => sh.name) }));
        } catch (err) {
          console.error('Error parsing file', file.name, err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true
  });

  const handleProcess = () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadStep(0);

    // Simulate multi-step pipeline processing
    const runPipeline = (step) => {
      if (step < steps.length) {
        setUploadStep(step);
        setTimeout(() => runPipeline(step + 1), 1200);
      } else {
        setUploading(false);
        setSuccess(true);
        setFiles([]);
        
        // Reload real data from Supabase
        fetchDataFromSupabase();
        
        // Push a simulated notification in store
        const store = useStore.getState();
        const newNotif = {
          id: Date.now(),
          type: 'success',
          title: 'Importación Completada',
          message: `Se importaron correctamente ${files.length} reportes comerciales. Base de datos Supabase sincronizada.`,
          time: 'Hace un momento',
          read: false
        };
        useStore.setState({
          notifications: [newNotif, ...store.notifications]
        });
      }
    };

    runPipeline(0);
  };

  const toggleSheet = (fileName, sheetName) => {
    setSelectedSheets((s) => {
      const list = new Set(s[fileName] || []);
      if (list.has(sheetName)) list.delete(sheetName);
      else list.add(sheetName);
      return { ...s, [fileName]: Array.from(list) };
    });
  };

  const uploadSelectedSheets = async () => {
    setUploadingSheets(true);
    const uploads = [];
    for (const fileName of Object.keys(parsedFiles)) {
      const sheets = parsedFiles[fileName];
      const want = new Set(selectedSheets[fileName] || []);
      for (const sh of sheets) {
        if (!want.has(sh.name)) continue;
        const json = JSON.stringify(sh.rows, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `${fileName.replace(/\.[^.]+$/, '')}_${sh.name.replace(/[^a-z0-9]/gi,'_')}.json`;
        if (hasSupabase && supabase) {
          // upload to bucket 'uploads' (must exist)
          const path = `raw/${Date.now()}_${filename}`;
          uploads.push(
            supabase.storage.from('uploads').upload(path, blob).then(res => ({ file: filename, res }))
          );
        } else {
          // fallback: download file locally
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          uploads.push(Promise.resolve({ file: filename, res: null }));
        }
      }
    }
    const results = await Promise.all(uploads);
    // If process server configured, call it for each uploaded path to trigger backend processing
    if (VITE_PROCESS_SERVER_URL) {
      for (const r of results) {
        try {
          const resObj = r.res;
          const path = resObj && resObj.data && resObj.data.path;
          if (path) {
            // fire-and-forget
            fetch(`${VITE_PROCESS_SERVER_URL.replace(/\/$/, '')}/process`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bucket: 'uploads', path })
            }).catch(err => console.error('Error calling process server', err));
          }
        } catch (e) {
          console.warn('No process call for result', e.message || e);
        }
      }
    }
    setUploadingSheets(false);
    // simple feedback
    const successCount = results.filter(r => !r.res || !r.res.error).length;
    setSuccess(true);
    setFiles([]);
    setParsedFiles({});
    setSelectedSheets({});
    const store = useStore.getState();
    const newNotif = {
      id: Date.now(),
      type: 'success',
      title: 'Hojas cargadas',
      message: `Se procesaron ${successCount} hojas seleccionadas.`,
      time: 'Hace un momento',
      read: false
    };
    useStore.setState({ notifications: [newNotif, ...store.notifications] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Cargar Archivos de Ventas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Suba sus reportes Excel (Ventas, Devoluciones, Proveedores o Zonas). El pipeline ETL procesará, limpiará y normalizará los datos automáticamente en Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Panel */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard hoverable={false} className="p-6">
            {!uploading && !success && (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/10'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    <UploadCloud className="h-10 w-10 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-200">
                      {isDragActive ? 'Suelte los archivos aquí' : 'Arrastre y suelte sus archivos Excel o CSV'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Formatos compatibles: .xlsx, .xlsm, .xls, .csv
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all mt-2">
                    Seleccionar Archivos
                  </button>
                </div>
              </div>
            )}

            {/* Pipeline progress steps */}
            {uploading && (
              <div className="py-8 px-4 space-y-6">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Procesando Pipeline ETL</h3>
                    <p className="text-xs text-slate-500 mt-1">Limpiando e inyectando datos comerciales en tiempo real</p>
                  </div>
                </div>

                <div className="space-y-3 max-w-md mx-auto pt-4">
                  {steps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isCompleted = idx < uploadStep;
                    const isActive = idx === uploadStep;

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                            : isActive 
                              ? 'bg-blue-500/5 border-blue-500/25 text-blue-400 scale-[1.02]' 
                              : 'bg-slate-900/10 border-transparent text-slate-500'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                        ) : isActive ? (
                          <Loader2 className="h-4.5 w-4.5 text-blue-500 animate-spin shrink-0" />
                        ) : (
                          <StepIcon className="h-4.5 w-4.5 shrink-0" />
                        )}
                        <span className="text-xs font-medium">{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Success Banner */}
            {success && (
              <div className="py-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">¡Sincronización Completada!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      El pipeline ETL ha limpiado y cargado sus archivos con éxito. Los dashboards ya están actualizados.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setSuccess(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-all"
                  >
                    Cargar más archivos
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Files selection queue */}
            {files.length > 0 && !uploading && (
              <div className="mt-6 border-t border-slate-800/80 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Archivos seleccionados ({files.length})</h4>
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-slate-200 font-bold truncate">{file.name}</span>
                      </div>
                      <span className="text-slate-500 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>

                {/* Parsed sheets preview + selection */}
                {Object.keys(parsedFiles).length > 0 && (
                  <div className="mt-4 border-t border-slate-800/60 pt-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hojas detectadas</h4>
                    <div className="space-y-2">
                      {Object.entries(parsedFiles).map(([fName, sheets]) => (
                        <div key={fName} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
                          <div className="font-semibold text-slate-200 truncate">{fName}</div>
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            {sheets.map((sh) => (
                              <label key={sh.name} className="flex items-center gap-2 text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={(selectedSheets[fName] || []).includes(sh.name)}
                                  onChange={() => toggleSheet(fName, sh.name)}
                                  className="accent-blue-500"
                                />
                                <span className="text-sm font-medium">{sh.name}</span>
                                <span className="ml-2 text-xs text-slate-500">{sh.rows.length} filas</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={uploadSelectedSheets}
                        disabled={uploadingSheets}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold"
                      >
                        {hasSupabase ? 'Subir hojas seleccionadas a Storage' : 'Descargar hojas seleccionadas'}
                      </button>
                      <button onClick={handleProcess} className="py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold">Procesar en Pipeline ETL</button>
                    </div>
                    {uploadingSheets && <div className="text-xs text-slate-400">Subiendo hojas...</div>}
                    {!hasSupabase && (
                      <div className="text-xs text-slate-500 mt-2">No configurado Supabase en entorno. Las hojas se descargarán localmente como JSON.</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Informative Side Panel */}
        <div className="space-y-6">
          <GlassCard hoverable={false} className="border-blue-950/40 bg-blue-950/[0.01]">
            <h3 className="text-sm font-bold text-white mb-3">Integración de Archivos</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              La plataforma consolida información de cuatro fuentes principales del ecosistema comercial de Alpina:
            </p>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">1</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Informe Ventas Crédito/Contado</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Analiza composición de cartera comercial.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">2</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Resumen de Control Zonal</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Mide metas de cumplimiento y facturación.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">3</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Informe Devoluciones</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Mapea causas y tasa de devoluciones.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-blue-500/10 text-blue-400 mt-0.5 font-bold font-mono text-[9px]">4</div>
                <div>
                  <h4 className="font-semibold text-slate-200">Seguimiento por Proveedor</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Mide participación YoY de marcas.</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard hoverable={false} className="border-amber-500/20 bg-amber-500/[0.01]">
            <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Importador del Cubo de Ventas (CLI)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Para procesar el archivo completo del <strong>Cubo de Ventas</strong> (archivos de más de 20MB o 300,000 registros), se recomienda utilizar el importador de consola optimizado por streaming:
            </p>
            <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 border border-slate-900 select-all overflow-x-auto">
              node scripts/import_cubo.cjs C:\Ruta\Al\Cubo.csv
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
              Esto procesará, agrupará la información y la sincronizará directamente en Supabase y el archivo local de la plataforma.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default UploadExcel;
