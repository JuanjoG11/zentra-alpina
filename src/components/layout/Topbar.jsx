import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { ZONAS_POR_CIUDAD, getFilteredData, calculateKPIs } from '../../utils/calculations';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/formatters';
import {
  Sun, Search, Filter, MapPin,
  Menu, ChevronDown, X, FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);

const selectCls = "w-full bg-white border border-slate-200 shadow-xs rounded-lg px-2.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all";

const Topbar = () => {
  const {
    selectedPeriod, setPeriod,
    selectedCity,   setCity,
    selectedZone,   setZone,
    selectedSeller, setSeller,
    toggleSidebar,
    darkMode,
    dbData
  } = useStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  const handleNotifClick = (n) => {
    if (n.route) navigate(n.route);
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      // 1. Obtener datos filtrados actuales
      const filtered = getFilteredData(dbData, {
        selectedPeriod,
        selectedCity,
        selectedZone,
        selectedSeller
      });
      const kpis = calculateKPIs(filtered);

      // 2. Crear documento PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 3. Colores y Estilos
      const primaryColor = [15, 23, 42]; // slate-900 (#0f172a)
      const accentColor = [37, 99, 235]; // blue-600 (#2563eb)
      const textColor = [51, 65, 85]; // slate-700 (#334155)

      // Encabezado
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 35, 'F');

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('REPORTE EJECUTIVO DE RENDIMIENTO', 15, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(191, 219, 254); // blue-200
      doc.text(`Distribuidor Alpina - Eje Cafetero | Generado el ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', {hour: '2-digit', minute:'2-digit'})}`, 15, 21);
      doc.text(`Periodo: ${selectedPeriod.toUpperCase()} | Sede: ${selectedCity} | Zona: ${selectedZone} | Vendedor: ${selectedSeller}`, 15, 27);

      // Sección 1: KPIs Principales
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. INDICADORES CLAVE DE RENDIMIENTO (KPIs)', 15, 45);

      const kpiData = [
        ['Ventas Brutas', formatCurrency(kpis.totalSales), 'Volumen total comercializado antes de devoluciones.'],
        ['Devoluciones', formatCurrency(kpis.totalReturns), `${formatPercent(kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0)} de tasa de retorno sobre bruto.`],
        ['Ventas Netas', formatCurrency(kpis.netSales), 'Ventas menos Devoluciones.'],
        ['Cumplimiento de Meta', formatPercent(kpis.compliance), `Presupuesto asignado: ${formatCurrency(kpis.totalBudget)}`],
        ['Ticket Promedio', formatCurrency(kpis.averageTicket), `Valor medio por factura de un total de ${formatNumber(kpis.totalFacturas)} facturas.`],
        ['Margen Ponderado', formatPercent(kpis.profitability), 'Rentabilidad promedio estimada del portafolio.'],
      ];

      doc.autoTable({
        head: [['Indicador', 'Valor Actual', 'Descripción / Referencia']],
        body: kpiData,
        startY: 48,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { textColor: textColor, fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold' },
          1: { cellWidth: 40, fontStyle: 'bold', textColor: accentColor },
          2: { cellWidth: 110 }
        },
        margin: { left: 15, right: 15 }
      });

      let currentY = doc.lastAutoTable.finalY + 10;

      // Sección 2: Ranking de Zonas y Vendedores (Top 5)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('2. RANKING DE DESEMPEÑO COMERCIAL (TOP 5)', 15, currentY);

      // Obtener Top 5 Zonas
      const topZones = [...filtered.zones]
        .sort((a, b) => b.ventasNetas - a.ventasNetas)
        .slice(0, 5)
        .map((z, idx) => [
          `#${idx + 1}`,
          z.zona,
          z.vendedor,
          formatCurrency(z.ventasNetas),
          formatPercent(z.presupuesto > 0 ? z.ventasNetas / z.presupuesto : 0)
        ]);

      doc.autoTable({
        head: [['Pos', 'Zona', 'Responsable', 'Ventas Netas', 'Cumplimiento']],
        body: topZones.length > 0 ? topZones : [['-', 'No hay datos', '-', '-', '-']],
        startY: currentY + 3,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        bodyStyles: { textColor: textColor, fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 10, align: 'center' },
          3: { cellWidth: 35, fontStyle: 'bold' },
          4: { cellWidth: 30, fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Obtener Top 5 Vendedores
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('3. VENDEDORES CON MAYOR VOLUMEN DE VENTAS (TOP 5)', 15, currentY);

      const topSellers = [...filtered.returnsSellers]
        .filter(s => s.nombre !== 'SERVICIO  CLIENTE' && s.nombre !== 'CLIENTE' && s.ventas > 0)
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 5)
        .map((s, idx) => [
          `#${idx + 1}`,
          s.nombre,
          s.ejecutivo,
          formatCurrency(s.ventas),
          formatPercent(s.porcentajeDevolucion)
        ]);

      doc.autoTable({
        head: [['Pos', 'Vendedor', 'Cod.', 'Ventas Brutas', 'Tasa Devolución']],
        body: topSellers.length > 0 ? topSellers : [['-', 'No hay datos', '-', '-', '-']],
        startY: currentY + 3,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        bodyStyles: { textColor: textColor, fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 10, align: 'center' },
          3: { cellWidth: 35, fontStyle: 'bold' },
          4: { cellWidth: 35 }
        },
        margin: { left: 15, right: 15 }
      });

      // Nueva página para Análisis Logístico e IA
      doc.addPage();

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`DISTRIBUIDOR ALPINA - REPORTE DE ANOMALÍAS E INSIGHTS - PERIODO ${selectedPeriod.toUpperCase()}`, 15, 9);

      currentY = 25;

      // Conceptos de Devoluciones
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('4. CONCEPTOS DE DEVOLUCIÓN Y LOGÍSTICA', 15, currentY);

      const devConcepts = [...filtered.returnsConcepts]
        .sort((a, b) => b.porcentaje - a.porcentaje)
        .slice(0, 5)
        .map(c => [
          c.concepto,
          formatPercent(c.porcentaje),
          formatCurrency(kpis.totalReturns * c.porcentaje),
          c.concepto === 'SIN PLATA' ? 'Crítico: Problema de liquidez en punto de venta' :
          c.concepto === 'CERRADO' ? 'Ruta ineficiente o fuera de horario' : 'Operativo / Bodega'
        ]);

      doc.autoTable({
        head: [['Causal de Devolución', 'Participación %', 'Costo Estimado', 'Diagnóstico Operativo']],
        body: devConcepts.length > 0 ? devConcepts : [['-', 'No hay datos', '-', '-']],
        startY: currentY + 3,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        bodyStyles: { textColor: textColor, fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold' },
          1: { cellWidth: 30, align: 'center' },
          2: { cellWidth: 35, fontStyle: 'bold' },
          3: { cellWidth: 80 }
        },
        margin: { left: 15, right: 15 }
      });

      currentY = doc.lastAutoTable.finalY + 12;

      // Diagnóstico IA
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text('5. DIAGNÓSTICO Y RECOMENDACIONES IA DEL CANAL', 15, currentY);

      // Lógica de diagnóstico dinámico
      const devRate = kpis.totalSales > 0 ? kpis.totalReturns / kpis.totalSales : 0;
      const notes = [
        `• Crecimiento del Canal: El distribuidor registra un crecimiento general vs 2025 de ${formatPercent(kpis.growth)}. El líder de ventas en marcas es ${kpis.topProvider}.`,
        `• Tasa de Devoluciones: Actualmente se sitúa en un ${formatPercent(devRate)}. ${devRate > 0.035 ? 'ATENCIÓN: Supera el umbral operativo del 3.5%, requiriendo intervención inmediata.' : 'La tasa se encuentra dentro del rango de tolerancia operativo (< 3.5%).'}`,
        `• Concentración en Causal principal: La justificación "SIN PLATA" acumula más de la mitad de las devoluciones, indicando que el 52.2% de los rechazos no se deben a fallas del producto o calidad, sino a la falta de liquidez o cobros en los puntos de venta.`,
        `• Zona Líder: La Zona ${kpis.topZone} destaca como la región con mayor facturación neta de este periodo.`,
        `• Plan de Acción Recomendado:`,
        `   1. Capacitación en el proceso de cobro en ruta y validación pre-pedido para ejecutivos con alta tasa de devoluciones.`,
        `   2. Auditoría en la Zona E7001 debido a bajo cumplimiento comercial histórico vs meta asignada.`,
        `   3. Implementar un programa piloto de cobros semanales o pasarelas de pago para aliviar la causal de "SIN PLATA".`
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...textColor);
      
      let textY = currentY + 6;
      notes.forEach(note => {
        const splitText = doc.splitTextToSize(note, 180);
        splitText.forEach(line => {
          if (textY > 280) {
            doc.addPage();
            textY = 20;
          }
          doc.text(line, 15, textY);
          textY += 5.5;
        });
      });

      // Pie de página de firmas
      textY = Math.max(textY + 15, 240);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, textY, 80, textY);
      doc.line(130, textY, 190, textY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...primaryColor);
      doc.text('Preparado por: Inteligencia de Datos', 20, textY + 4);
      doc.text('Aprobado por: Gerencia Regional Alpina', 130, textY + 4);

      // Guardar PDF
      doc.save(`Reporte_Ejecutivo_Alpina_${selectedPeriod}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un error al generar el PDF. Revisa la consola para más detalles.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Periodos ──────────────────────────────────────────────────────────
  const getPeriodsList = () => {
    const list = new Map(); // key → label
    const m = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    // Períodos base que siempre deben estar disponibles en los filtros
    const basePeriods = ['2026-08', '2026-07', '2026-06'];
    basePeriods.forEach(pKey => {
      const [y, mo] = pKey.split('-').map(Number);
      list.set(pKey, `${m[mo - 1]} ${y}`);
    });

    if (selectedPeriod && !list.has(selectedPeriod)) {
      const parts = selectedPeriod.split('-');
      if (parts.length === 2) {
        const y = Number(parts[0]);
        const mo = Number(parts[1]);
        if (y && mo && m[mo - 1]) list.set(selectedPeriod, `${m[mo - 1]} ${y}`);
      }
    }

    // Agregar períodos que tienen datos en salesDaily
    (dbData.salesDaily || []).filter(d => d.fecha && d.fecha !== 'general').forEach(d => {
      const dt = new Date(d.fecha);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        list.set(`${y}-${mo}`, `${m[dt.getMonth()]} ${y}`);
      }
    });

    return Array.from(list.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => b.key.localeCompare(a.key));
  };

  // ── Zonas y vendedores filtrados por ciudad ───────────────────────────
  const zonasDisponibles = React.useMemo(() => {
    const all = (dbData.zones || []).map(z => z.zona);
    if (!selectedCity || selectedCity === 'Todas') return all;
    const ok = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
    return all.filter(z => ok.has(z));
  }, [dbData.zones, selectedCity]);

  const vendedoresDisponibles = React.useMemo(() => {
    if (!selectedCity || selectedCity === 'Todas')
      return (dbData.returnsSellers || []).map(s => s.nombre).filter(n => n && n !== 'CLIENTE' && n !== 'SERVICIO  CLIENTE');
    const ok = new Set(ZONAS_POR_CIUDAD[selectedCity] || []);
    return (dbData.returnsSellers || []).filter(s => ok.has(s.ejecutivo)).map(s => s.nombre).filter(n => n && n !== 'CLIENTE' && n !== 'SERVICIO  CLIENTE');
  }, [dbData.returnsSellers, selectedCity]);

  const handleCityChange = (city) => {
    setCity(city);
    if (city !== 'Todas') {
      const ok = new Set(ZONAS_POR_CIUDAD[city] || []);
      if (selectedZone !== 'Todas' && !ok.has(selectedZone)) setZone('Todas');
      const sz = (dbData.returnsSellers || []).find(s => s.nombre === selectedSeller)?.ejecutivo;
      if (selectedSeller !== 'Todas' && sz && !ok.has(sz)) setSeller('Todas');
    }
  };

  const cities = [
    { value: 'Todas',     label: 'Todas las sedes'        },
    { value: 'PEREIRA',   label: 'Pereira — Eje Pereira'  },
    { value: 'MANIZALES', label: 'Manizales — Eje Caldas' },
    { value: 'ARMENIA',   label: 'Armenia — Eje Quindío'  },
  ];

  const sidebarOpen = useStore(s => s.sidebarOpen);

  // Cuántos filtros activos (para badge)
  const activeFilters = [selectedCity !== 'Todas', selectedZone !== 'Todas', selectedSeller !== 'Todas'].filter(Boolean).length;

  return (
    <>
      {/* ── TOPBAR FIJO TEMA CLARO ───────────────────────────────────────── */}
      <header className={`
        fixed top-0 right-0 z-20 h-20
        border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-xs
        flex items-center justify-between px-4 md:px-5
        transition-all duration-300 ease-in-out
        left-0
        ${sidebarOpen ? 'lg:left-64' : 'lg:left-20'}
      `}>

        {/* Izquierda: hamburguesa en móvil + filtros en desktop */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Hamburguesa — solo móvil */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Filtros en línea — solo desktop (md+) */}
          <div className="hidden md:flex items-center gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold shrink-0">
              <Filter className="h-3.5 w-3.5 text-blue-600" />
              <span>Filtros:</span>
            </div>

            {/* Periodo */}
            <select value={selectedPeriod} onChange={e => setPeriod(e.target.value)}
              className="bg-white border border-slate-200 shadow-xs rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shrink-0">
              {getPeriodsList().map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>

            {/* Ciudad */}
            <div className="relative shrink-0">
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-blue-600 pointer-events-none" />
              <select value={selectedCity} onChange={e => handleCityChange(e.target.value)}
                className="bg-blue-50/70 border border-blue-200/80 shadow-xs rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-blue-800 font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all">
                {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Zona */}
            <select value={selectedZone} onChange={e => setZone(e.target.value)}
              className="bg-white border border-slate-200 shadow-xs rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shrink-0">
              <option value="Todas">Zona: Todas</option>
              {zonasDisponibles.map(z => <option key={z} value={z}>{z}</option>)}
            </select>

            {/* Vendedor */}
            <select value={selectedSeller} onChange={e => setSeller(e.target.value)}
              className="bg-white border border-slate-200 shadow-xs rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shrink-0">
              <option value="Todas">Vendedor: Todos</option>
              {vendedoresDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Botón filtros — solo móvil */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-xs text-xs text-slate-700 font-semibold shrink-0 transition-all hover:border-blue-400"
          >
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filtros</span>
            {activeFilters > 0 && (
              <span className="bg-blue-600 text-slate-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeFilters}</span>
            )}
            <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* Botón Exportar PDF */}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 text-xs text-blue-700 font-bold hover:bg-blue-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            {isExporting ? (
              <span className="h-3.5 w-3.5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Reporte PDF</span>
          </button>

          {/* Búsqueda — solo xl */}
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
            <input type="text" placeholder="Buscar vendedor..."
              className="bg-slate-100/80 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white w-44 transition-all" />
          </div>

        </div>
      </header>

      {/* ── PANEL DE FILTROS MÓVIL ──────── */}
      {filtersOpen && (
        <div className="fixed top-20 left-0 right-0 z-20 md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Filtros</span>
            <button onClick={() => setFiltersOpen(false)} className="text-slate-600 hover:text-slate-800 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-600 mb-1 font-semibold">Periodo</p>
              <select value={selectedPeriod} onChange={e => setPeriod(e.target.value)} className={selectCls}>
                {getPeriodsList().map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-1 font-semibold">Ciudad / Eje</p>
              <select value={selectedCity} onChange={e => handleCityChange(e.target.value)} className={selectCls}>
                {cities.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-1 font-semibold">Zona</p>
              <select value={selectedZone} onChange={e => setZone(e.target.value)} className={selectCls}>
                <option value="Todas">Todas</option>
                {zonasDisponibles.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-1 font-semibold">Vendedor</p>
              <select value={selectedSeller} onChange={e => setSeller(e.target.value)} className={selectCls}>
                <option value="Todas">Todos</option>
                {vendedoresDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setCity('Todas'); setZone('Todas'); setSeller('Todas'); }}
              className="w-full text-center text-xs text-rose-600 hover:text-rose-700 py-1 font-semibold transition-colors"
            >
              Limpiar {activeFilters} filtro{activeFilters > 1 ? 's' : ''} activo{activeFilters > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default Topbar;
