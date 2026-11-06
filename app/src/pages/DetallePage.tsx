import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { obtenerProyectosSeed } from '../lib/proyectosData';
import { GalaxySearchBar } from '../components/space/GalaxySearchBar';
import { EtapaDetalle } from '../components/EtapaDetalle';
import { MisionesErrorBoundary } from '../components/MisionesErrorBoundary';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import {
  ArrowLeft,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Lock,
} from 'lucide-react';

interface DetallePageProps {
  usuarioActual?: UsuarioPrueba;
}

export const DetallePage: React.FC<DetallePageProps> = ({ usuarioActual }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  useRegistrarVista('detalle', id);

  const proyectos = obtenerProyectosSeed(usuarioActual);
  const proyecto = proyectos.find((p) => p.id === id) || (id === 'proy-1' ? proyectos[0] : undefined);

  // Sincronización con URL (?etapa=<id>)
  const etapaParam = searchParams.get('etapa');
  const [mostrarCalculo, setMostrarCalculo] = useState<boolean>(false);
  const detallePanelRef = useRef<HTMLDivElement>(null);

  // Scroll inicial arriba al montar o cambiar de proyecto
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Determinar etapa seleccionada: etapa de URL o etapa actual por defecto
  const etapaSeleccionada = React.useMemo(() => {
    if (!proyecto) return null;
    if (etapaParam) {
      const encontrada = proyecto.etapas.find((e) => e.id === etapaParam);
      if (encontrada) return encontrada;
    }
    // Por defecto etapa actual (En curso o Bloqueada o última si cerrado)
    const actual = proyecto.etapas.find((e) => e.estado === 'En curso' || e.estado === 'Bloqueada');
    return actual || proyecto.etapas[0];
  }, [proyecto, etapaParam]);

  const seleccionarEtapa = (etapa: any) => {
    const isFutura = etapa.estado === 'Pendiente' && etapa.nombre !== proyecto?.etapa_actual_nombre;
    if (isFutura) return; // No navega etapas futuras

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('etapa', etapa.id);
    setSearchParams(nextParams, { replace: true });

    setTimeout(() => {
      detallePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  if (!proyecto) {
    return (
      <div className="panel p-12 text-center max-w-lg mx-auto border border-health-red/30 my-16 bg-card">
        <ShieldAlert className="w-16 h-16 text-health-red mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">
          Misión No Encontrada o Bloqueada
        </h2>
        <p className="text-sm font-mono text-muted-foreground mt-2 mb-6">
          No tienes credenciales de visualización para este sector con el usuario actual ({usuarioActual?.email}).
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold px-5 py-2.5 bg-terracotta hover:opacity-90 text-white rounded-xl transition-all shadow-cta"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Cuartel General</span>
        </Link>
      </div>
    );
  }

  // Semáforo con tokens de salud WWP
  const semaforoColor =
    proyecto.semaforo === 'rojo'
      ? 'text-health-red border-health-red/40 bg-health-red-soft'
      : proyecto.semaforo === 'amarillo'
      ? 'text-health-amber border-health-amber/40 bg-health-amber-soft'
      : 'text-health-green border-health-green/40 bg-health-green-soft';

  return (
    <MisionesErrorBoundary fallbackTitle="Error al cargar el detalle del proyecto">
      <div className="w-full space-y-6 pb-24 text-foreground font-sans">
        {/* BARRA SUPERIOR DE NAVEGACIÓN Y BÚSQUEDA GLOBAL */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a misiones</span>
            </Link>
            <div className="font-mono text-xs text-muted-foreground">
              Sector: <strong className="text-foreground">{proyecto.area_solicitante}</strong>
            </div>
          </div>

          <div className="w-full sm:w-80">
            <GalaxySearchBar
              proyectos={proyectos}
              onSelectProyecto={(p) => navigate(`/proyectos/${p.id}`)}
              placeholder="Buscar proyecto…"
            />
          </div>
        </div>

        {/* CABECERA DE PROYECTO */}
        <div className="panel p-6 bg-card border border-border shadow-panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold uppercase ${semaforoColor}`}>
                  {proyecto.semaforo === 'rojo' ? 'Crítico' : proyecto.semaforo === 'amarillo' ? 'Alerta' : 'Nominal'}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  Callsign: <strong className="text-foreground">{proyecto.callsign || proyecto.id}</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
                {proyecto.nombre}
              </h1>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="p-3 bg-surface rounded-xl border border-border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase">Avance</span>
                <span className="text-base font-bold text-foreground">{proyecto.avance_pct}%</span>
              </div>
              <div className="p-3 bg-surface rounded-xl border border-border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase">Atraso</span>
                <span className={`text-base font-bold ${proyecto.atraso_dh > 0 ? 'text-health-red' : 'text-health-green'}`}>
                  {proyecto.atraso_dh > 0 ? `+${proyecto.atraso_dh}` : proyecto.atraso_dh} dh
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-4xl">
            {proyecto.descripcion || 'Sin descripción táctica registrada en Notion.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Estimada</span>
              <strong className="text-foreground">{proyecto.fecha_reproyectada || '—'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Comprometida</span>
              <strong className="text-foreground">{proyecto.fecha_comprometida || '—'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Responsable de comunicar</span>
              <strong className="text-foreground">{proyecto.responsable_comunicar_nombre}</strong>
            </div>
          </div>
        </div>

        {/* LÍNEA DE ETAPAS (TIPO SEGUIMIENTO DE ENVÍO) */}
        <div className="panel p-6 bg-card border border-border shadow-panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground tracking-tight uppercase flex items-center gap-2">
              <span>Línea de Etapas y Estaciones</span>
              <span className="text-xs font-mono text-muted-foreground font-normal">
                (Click en cualquier etapa no futura para ver su detalle auditado)
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {proyecto.etapas.map((etapa) => {
              const isSelected = etapaSeleccionada?.id === etapa.id;
              const isFutura = etapa.estado === 'Pendiente' && etapa.nombre !== proyecto.etapa_actual_nombre;
              const isCompletada = etapa.estado === 'Completada';
              const isBloqueada = etapa.estado === 'Bloqueada';

              return (
                <button
                  key={etapa.id}
                  type="button"
                  onClick={() => seleccionarEtapa(etapa)}
                  disabled={isFutura}
                  title={
                    isFutura
                      ? `Etapa futura · inicio est. ${etapa.inicio_plan || 'dd/mm'}`
                      : `${etapa.orden}. ${etapa.nombre} (${etapa.estado})`
                  }
                  className={`flex-1 min-w-[140px] p-3 rounded-xl border text-left transition-all relative ${
                    isFutura
                      ? 'opacity-40 cursor-not-allowed bg-surface border-border'
                      : isSelected
                      ? 'bg-card border-2 border-terracotta ring-2 ring-terracotta/30 shadow-md'
                      : 'bg-surface hover:bg-muted border-border cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-muted-foreground">0{etapa.orden}</span>
                    {isFutura ? (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    ) : isCompletada ? (
                      <CheckCircle className="w-3 h-3 text-health-green" />
                    ) : isBloqueada ? (
                      <ShieldAlert className="w-3 h-3 text-health-red" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-foreground truncate">
                    {etapa.nombre}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {isFutura ? `Inicio ${etapa.inicio_plan || '—'}` : etapa.estado}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DETALLE UNIFICADO DE ETAPA SELECCIONADA */}
        <div ref={detallePanelRef}>
          <EtapaDetalle
            etapa={etapaSeleccionada}
            proyecto={proyecto}
          />
        </div>

        {/* FÓRMULA DE PROYECCIÓN AUDITABLE */}
        <div className="panel p-4 bg-card border border-border shadow-panel">
          <button
            onClick={() => setMostrarCalculo(!mostrarCalculo)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-terracotta" />
              <span className="font-bold text-sm text-foreground">
                ¿Cómo se calculó la fecha estimada? (Panel de Estadísticas Tácticas)
              </span>
            </div>
            {mostrarCalculo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {mostrarCalculo && (
            <div className="mt-4 pt-3 border-t border-border font-mono text-xs text-muted-foreground space-y-3">
              <p>
                El cálculo toma el siguiente día hábil oficial de Chile como vector base, suma los días hábiles restantes de la etapa en curso, los de etapas pendientes y aplica +5 dh por cada bloqueo activo:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-foreground">
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground block">Vector Base</span>
                  <strong>{proyecto.desglose?.base || 'Hoy'}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground block">Etapas Pendientes</span>
                  <strong>+{proyecto.desglose?.etapas?.reduce((a: number, e: any) => a + (e.dias || 0), 0) || 10} dh</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground block">Bloqueos (+5 dh c/u)</span>
                  <strong className="text-health-red">+{proyecto.bloqueos?.length * 5 || 0} dh</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] text-muted-foreground block">Fecha Destino</span>
                  <strong className="text-health-green">{proyecto.fecha_reproyectada}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MisionesErrorBoundary>
  );
};
