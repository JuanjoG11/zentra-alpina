import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import useStore from '../store/useStore';
import GlassCard from '../components/ui/GlassCard';
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
  const { addNotification } = useStore();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
                <button 
                  onClick={handleProcess}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Procesar en Pipeline ETL</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
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

          <GlassCard hoverable={false}>
            <h3 className="text-sm font-bold text-white mb-2">Supabase Sincronización</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              La base de datos PostgreSQL está protegida con RLS. Al procesar los archivos, los datos se almacenan en tablas normalizadas, disparando webhooks automáticos para actualizar el dashboard de supervisores y vendedores en tiempo real.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default UploadExcel;
