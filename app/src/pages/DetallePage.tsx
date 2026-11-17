import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import { obtenerProyectosSeed } from '../lib/proyectosData';
import { mapProyecto, type ProyectoView } from '../data/proyectoView';
import { useAuth } from '../auth/AuthProvider';
import { useProyectos } from '../hooks/useProyectos';
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
  ExternalLink,
  History,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface DetallePageProps {
  usuarioActual?: UsuarioPrueba;
}

export const DetallePage: React.FC<DetallePageProps> = ({ usuarioActual }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  useRegistrarVista('detalle', id);

  const { isDemo } = useAuth();
  const { data: proyectosCargados, isLoading, error } = useProyectos();
  const proyectos: ProyectoView[] = isDemo
    ? ((proyectosCargados || obtenerProyectosSeed(usuarioActual)) as any[]).map(mapProyecto)
    : (proyectosCargados || []);
  const proyecto: ProyectoView | undefined = proyectos.find((p) => p.id === id) || (isDemo && id === 'proy-1' ? proyectos[0] : undefined);

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
    // Por defecto etapa actual (En curso o Bloqueada o primera)
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

  const renderDatoNotion = (valor?: string | null | number, fallback = 'Sin dato en Notion') => {
    if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
      return <span className="text-foreground font-medium">{String(valor)}</span>;
    }
    return <span className="text-muted-foreground/60 italic font-mono text-xs">{fallback}</span>;
  };

  if (isLoading) {
    return (
      <div className="panel p-12 text-center max-w-lg mx-auto border border-border my-16 bg-card rounded-3xl font-mono text-xs shadow-panel">
        <div className="w-4 h-4 rounded-full bg-terracotta animate-pulse mx-auto mb-4" />
        <h2 className="text-base font-bold text-foreground">Cargando proyecto de Supabase...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-12 text-center max-w-lg mx-auto border border-health-red/30 my-16 bg-card rounded-3xl shadow-panel space-y-4">
        <ShieldAlert className="w-16 h-16 text-health-red mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Error al consultar Supabase</h2>
        <p className="text-xs font-mono text-health-red">{(error as any)?.message}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold px-5 py-2.5 bg-terracotta hover:opacity-90 text-white rounded-xl transition-all shadow-cta"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Galaxia</span>
        </Link>
      </div>
    );
  }

  if (!proyecto || proyecto.puede_ver_detalle === false) {
    return (
      <div className="panel p-12 text-center max-w-lg mx-auto border border-health-amber/30 my-16 bg-card rounded-3xl shadow-panel space-y-4">
        <ShieldAlert className="w-16 h-16 text-health-amber mx-auto" />
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          Sin acceso al detalle. Pide acceso al administrador
        </h2>
        <p className="text-xs font-mono text-muted-foreground leading-relaxed">
          Tu perfil actual ({usuarioActual?.rol}) no cuenta con credenciales para inspeccionar las fases tácticas, bloqueos o tareas de este proyecto.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold px-5 py-2.5 bg-terracotta hover:opacity-90 text-white rounded-xl transition-all shadow-cta"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Galaxia</span>
        </Link>
      </div>
    );
  }

  // Estilo de semáforo
  let badgeEstadoClass = 'bg-surface border-border text-foreground';
  if (proyecto.cancelado) {
    badgeEstadoClass = 'bg-muted border-border text-muted-foreground/60';
  } else if (proyecto.cerrado) {
    badgeEstadoClass = 'bg-health-green-soft border-health-green/40 text-health-green';
  } else if (proyecto.semaforo === 'rojo') {
    badgeEstadoClass = 'bg-health-red-soft border-health-red/40 text-health-red';
  } else if (proyecto.semaforo === 'amarillo') {
    badgeEstadoClass = 'bg-health-amber-soft border-health-amber/40 text-health-amber';
  } else if (proyecto.semaforo === 'verde') {
    badgeEstadoClass = 'bg-health-green-soft border-health-green/40 text-health-green';
  }

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
              Área: <strong className="text-foreground">{proyecto.area_nombre}</strong>
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

        {/* CABECERA PRINCIPAL */}
        <div className="panel p-6 bg-card border border-border shadow-panel space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-mono font-bold uppercase ${badgeEstadoClass}`}>
                  {proyecto.estado_display}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-border bg-surface text-xs font-mono font-semibold text-foreground">
                  Fase: {proyecto.fase_macro}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-border bg-surface text-xs font-mono font-semibold text-terracotta">
                  {proyecto.nivel_detalle === 'N3' ? 'N3 · Detalle completo' : 'N1 · Seguimiento general'}
                </span>
                {proyecto.codigo && (
                  <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-surface border border-border">
                    Código: <strong className="text-foreground">{proyecto.codigo}</strong>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {proyecto.nombre}
              </h1>

              {/* Motivos del Semáforo */}
              {proyecto.motivos_semaforo && proyecto.motivos_semaforo.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground pt-1" title="¿Por qué este estado?">
                  <Info className="w-3.5 h-3.5 text-terracotta shrink-0" />
                  <span>Estado: {proyecto.motivos_semaforo.join(' · ')}</span>
                </div>
              )}
            </div>

            {/* Métricas clave cabecera & botón Notion */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="p-3 bg-surface rounded-xl border border-border text-center min-w-[70px]">
                  <span className="text-[10px] text-muted-foreground block uppercase">Avance</span>
                  <span className="text-base font-bold text-foreground">{proyecto.avance_pct}%</span>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-border text-center min-w-[70px]">
                  <span className="text-[10px] text-muted-foreground block uppercase">Atraso</span>
                  <span
                    className={`text-base font-bold ${
                      (proyecto.atraso_dh ?? 0) > 0
                        ? 'text-health-red'
                        : proyecto.atraso_dh === null
                        ? 'text-muted-foreground'
                        : 'text-health-green'
                    }`}
                  >
                    {proyecto.atraso_display !== '—' ? `${proyecto.atraso_display} dh` : '—'}
                  </span>
                </div>
              </div>

              {proyecto.url_origen && (
                <a
                  href={proyecto.url_origen}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-terracotta hover:opacity-90 text-white font-mono text-xs font-bold transition-all shadow-cta"
                >
                  <span>Abrir en Notion</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Alert de Gobierno si hay datos incompletos */}
          {proyecto.alertas_gobierno && proyecto.alertas_gobierno.length > 0 && (
            <div className="p-3 rounded-xl bg-health-amber-soft border border-health-amber/30 text-health-amber flex items-center gap-2 text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Datos incompletos: {proyecto.alertas_gobierno.join(' · ')}</span>
            </div>
          )}

          {/* Grilla de Fechas y Responsables */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-border font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Compromiso</span>
              {renderDatoNotion(proyecto.fecha_comprometida)}
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Estimada</span>
              {renderDatoNotion(proyecto.fecha_estimada)}
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Responsable</span>
              {renderDatoNotion(proyecto.responsable_nombre)}
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Última actualización</span>
              {renderDatoNotion(proyecto.ultima_actualizacion ? new Date(proyecto.ultima_actualizacion).toLocaleDateString('es-CL') : null)}
            </div>
          </div>
        </div>

        {/* INFORMACIÓN CANÓNICA DE NOTION (NINGÚN CAMPO SE OCULTA: SI ESTÁ VACÍO MUESTRA "Sin dato en Notion") */}
        <div className="panel p-6 bg-card border border-border shadow-panel space-y-4">
          <h2 className="text-sm font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-terracotta" />
            <span>Ficha Estratégica y Táctica (Notion)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Objetivo */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1 md:col-span-2 lg:col-span-4">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Objetivo</span>
              <p className="font-sans text-sm leading-relaxed">
                {renderDatoNotion(proyecto.objetivo || proyecto.descripcion)}
              </p>
            </div>

            {/* Prioridad */}
            <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Prioridad</span>
              <div>{renderDatoNotion(proyecto.prioridad)}</div>
            </div>

            {/* Impacto */}
            <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Impacto</span>
              <div>{renderDatoNotion(proyecto.impacto)}</div>
            </div>

            {/* Alcance */}
            <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Alcance</span>
              <div>{renderDatoNotion(proyecto.alcance)}</div>
            </div>

            {/* Salud Declarada */}
            <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase block font-bold">Salud Declarada</span>
              <div>{renderDatoNotion(proyecto.salud_declarada)}</div>
            </div>

            {/* Próximo Paso */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1 md:col-span-2">
              <span className="text-[10px] text-terracotta uppercase block font-bold">Próximo Paso</span>
              <p className="font-sans text-xs leading-relaxed">
                {renderDatoNotion(proyecto.proximo_paso)}
              </p>
            </div>

            {/* Decisiones Pendientes */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1 md:col-span-2">
              <span className="text-[10px] text-health-amber uppercase block font-bold">Decisiones Pendientes</span>
              <p className="font-sans text-xs leading-relaxed">
                {renderDatoNotion(proyecto.decisiones_pendientes)}
              </p>
            </div>

            {/* Riesgos y Bloqueos Declarados */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1 md:col-span-2 lg:col-span-4">
              <span className="text-[10px] text-health-red uppercase block font-bold">Riesgos y Bloqueos Declarados</span>
              <p className="font-sans text-xs leading-relaxed">
                {renderDatoNotion(proyecto.riesgos_texto)}
              </p>
            </div>
          </div>
        </div>

        {/* LÍNEA DE ETAPAS EN ORDEN (TIPO SEGUIMIENTO DE ENVÍO) */}
        <div className="panel p-6 bg-card border border-border shadow-panel space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground tracking-tight uppercase flex items-center gap-2">
              <span>Línea de Etapas y Estaciones</span>
              <span className="text-xs font-mono text-muted-foreground font-normal">
                (Click para auditar etapa)
              </span>
            </h2>
          </div>

          {proyecto.etapas.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface text-center font-mono text-xs text-muted-foreground/60 italic border border-border">
              Sin etapas desglosadas en Notion para este proyecto.
            </div>
          ) : (
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
          )}
        </div>

        {/* DETALLE UNIFICADO DE ETAPA SELECCIONADA */}
        {etapaSeleccionada && (
          <div ref={detallePanelRef}>
            <EtapaDetalle
              etapa={etapaSeleccionada}
              proyecto={proyecto}
            />
          </div>
        )}

        {/* HISTORIAL DE CAMBIOS AUDITADOS (EVENTO_CAMBIO) */}
        <div className="panel p-6 bg-card border border-border shadow-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground tracking-tight uppercase flex items-center gap-2">
              <History className="w-4 h-4 text-terracotta" />
              <span>Historial de Cambios Auditados (evento_cambio)</span>
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              {proyecto.historial.length} eventos registrados
            </span>
          </div>

          {proyecto.historial.length === 0 ? (
            <div className="p-4 rounded-xl bg-surface text-center font-mono text-xs text-muted-foreground/60 italic border border-border">
              Sin dato en Notion · Sin eventos recientes registrados
            </div>
          ) : (
            <div className="space-y-2">
              {proyecto.historial.map((ev: any, idx: number) => {
                const fecha = ev.detectado_en || ev.notion_editado_en || ev.fecha;
                const fechaFmt = fecha ? new Date(fecha).toLocaleString('es-CL') : 'Reciente';
                const isRetroceso = ev.tipo === 'retroceso';

                return (
                  <div
                    key={ev.id || idx}
                    className={`p-3 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isRetroceso
                        ? 'bg-health-red-soft border-health-red/40 text-health-red'
                        : 'bg-surface border-border text-foreground'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-card border border-border">
                          {ev.tipo || 'actualizado'}
                        </span>
                        <span className="text-muted-foreground">Entidad: {ev.entidad || 'proyecto'}</span>
                        {ev.campo && <span className="text-terracotta">Campo: {ev.campo}</span>}
                      </div>
                      <p className="font-sans text-xs text-foreground/90">
                        {ev.descripcion || (ev.valor_nuevo ? `Cambio a: ${JSON.stringify(ev.valor_nuevo)}` : 'Actualización de datos')}
                      </p>
                    </div>

                    <div className="text-[10px] text-muted-foreground shrink-0 sm:text-right">
                      {fechaFmt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  <strong className="text-health-green">{proyecto.fecha_estimada || proyecto.fecha_reproyectada}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MisionesErrorBoundary>
  );
};
