import React, { useState, useEffect, useCallback } from 'react';
import { useRegistrarVista } from '../hooks/useRegistrarVista';
import type { UsuarioPrueba } from '../components/DevUserSelector';
import { supabase } from '../lib/supabase';
import {
  Download,
  Users,
  Radio,
  MapPin,
  GitMerge,
  BarChart3,
  ShieldAlert,
  Check,
  Plus,
  RefreshCw,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface AdminPageProps {
  usuarioActual?: UsuarioPrueba;
}

type TabAdmin = 'metricas' | 'usuarios' | 'fuentes' | 'areas' | 'duplicados';

interface UsuarioData {
  email: string;
  nombre: string;
  rol: 'Admin' | 'Gerencia' | 'Gerente de área' | 'Solicitante' | 'Ejecutor';
  activo: boolean;
  areas: string[]; // area_ids
  proyectos: string[]; // proyecto_ids
}

interface AreaItem {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
}

interface AreaAliasItem {
  alias_normalizado: string;
  area_id: string;
  area_nombre?: string;
}

interface FuenteEstadoItem {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  activa: boolean;
  nivel_detalle: string;
  ultimo_sync?: string;
  estado_sync?: string;
  total_proyectos?: number;
}

interface SyncEjecucionItem {
  id: string;
  fuente_id: string;
  run_id: string;
  inicio: string;
  fin?: string;
  estado: string;
  leidos: number;
  creados: number;
  actualizados: number;
  eliminados: number;
  errores: unknown[];
}

interface ProyectoItem {
  id: string;
  nombre: string;
  codigo_visible?: string;
  area_id?: string;
  area_nombre?: string;
}

export const AdminPage: React.FC<AdminPageProps> = ({ usuarioActual }) => {
  useRegistrarVista('admin');

  const [tabActiva, setTabActiva] = useState<TabAdmin>('metricas');
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estados de datos
  const [usuarios, setUsuarios] = useState<UsuarioData[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [aliases, setAliases] = useState<AreaAliasItem[]>([]);
  const [fuentes, setFuentes] = useState<FuenteEstadoItem[]>([]);
  const [syncs, setSyncs] = useState<SyncEjecucionItem[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoItem[]>([]);

  // Formularios
  const [nuevoUsuario, setNuevoUsuario] = useState<{
    email: string;
    nombre: string;
    rol: UsuarioData['rol'];
    activo: boolean;
  }>({
    email: '',
    nombre: '',
    rol: 'Ejecutor',
    activo: true,
  });

  const [nuevaArea, setNuevaArea] = useState({ codigo: '', nombre: '' });
  const [nuevoAlias, setNuevoAlias] = useState({ alias: '', area_id: '' });
  const [nuevoVinculo, setNuevoVinculo] = useState({
    proyecto_id: '',
    fuente_id: '',
    id_origen: '',
    codigo_origen: '',
  });

  const esAdmin = !usuarioActual || usuarioActual.rol === 'Admin';

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setMensajeError(null);
    try {
      // 1. Áreas
      const { data: areasData } = await supabase.from('area').select('*').order('nombre');
      const areasList: AreaItem[] = (areasData as AreaItem[]) || [];
      setAreas(areasList);

      // 2. Aliases
      const { data: aliasData } = await supabase.from('area_alias').select('*');
      const aliasList = ((aliasData as AreaAliasItem[]) || []).map(a => ({
        ...a,
        area_nombre: areasList.find(ar => ar.id === a.area_id)?.nombre,
      }));
      setAliases(aliasList);

      // 3. Fuentes
      const { data: fuentesData } = await supabase.from('fuente').select('*');
      setFuentes((fuentesData as FuenteEstadoItem[]) || []);

      // 4. Sync Ejecuciones
      const { data: syncData } = await supabase
        .from('sync_ejecucion')
        .select('*')
        .order('inicio', { ascending: false })
        .limit(20);
      setSyncs((syncData as SyncEjecucionItem[]) || []);

      // 5. Proyectos
      const { data: proyData } = await supabase
        .from('proyecto')
        .select('id, nombre, codigo_visible, area_id')
        .order('nombre');
      const proyList: ProyectoItem[] = ((proyData as ProyectoItem[]) || []).map(p => ({
        ...p,
        area_nombre: areasList.find(ar => ar.id === p.area_id)?.nombre || 'Sin clasificar',
      }));
      setProyectos(proyList);

      // 6. Usuarios
      const { data: usuariosData } = await supabase.from('usuario_rol').select('*');
      const { data: uAreasData } = await supabase.from('usuario_area').select('*');
      const { data: uProyData } = await supabase.from('usuario_proyecto').select('*');

      const uList: UsuarioData[] = ((usuariosData as UsuarioData[]) || []).map(u => ({
        ...u,
        areas: (uAreasData || []).filter(ua => ua.email === u.email).map(ua => ua.area_id),
        proyectos: (uProyData || []).filter(up => up.email === u.email).map(up => up.proyecto_id),
      }));
      setUsuarios(uList);
    } catch (err: unknown) {
      console.warn('Error cargando datos de admin desde Supabase:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (esAdmin) {
      cargarDatos();
    }
  }, [esAdmin, cargarDatos]);

  const mostrarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const exportarCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Sistema,Comando Estelar\nMetrica,Línea Base,Semana 1\nConfianza Fecha,2.8,4.2\nPreguntas Contacto,6.4,1.8\nAutonomia Consulta,35%,88%\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'comando_estelar_metricas_piloto.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Guardar usuario
  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoUsuario.email || !nuevoUsuario.nombre) return;
    try {
      const { error } = await supabase.from('usuario_rol').upsert({
        email: nuevoUsuario.email.toLowerCase().trim(),
        nombre: nuevoUsuario.nombre.trim(),
        rol: nuevoUsuario.rol,
        activo: nuevoUsuario.activo,
      });
      if (error) throw error;
      mostrarExito(`Usuario ${nuevoUsuario.email} guardado correctamente`);
      setNuevoUsuario({ email: '', nombre: '', rol: 'Ejecutor', activo: true });
      cargarDatos();
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al guardar usuario');
    }
  };

  // Toggle área de usuario
  const handleToggleAreaUsuario = async (email: string, areaId: string, asignada: boolean) => {
    try {
      if (asignada) {
        await supabase.from('usuario_area').delete().eq('email', email).eq('area_id', areaId);
      } else {
        await supabase.from('usuario_area').insert({ email, area_id: areaId });
      }
      cargarDatos();
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al actualizar áreas');
    }
  };

  // Crear área
  const handleCrearArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaArea.codigo || !nuevaArea.nombre) return;
    try {
      const { error } = await supabase.from('area').insert({
        codigo: nuevaArea.codigo.toUpperCase().trim(),
        nombre: nuevaArea.nombre.trim(),
        activa: true,
      });
      if (error) throw error;
      mostrarExito(`Área ${nuevaArea.nombre} creada`);
      setNuevaArea({ codigo: '', nombre: '' });
      cargarDatos();
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al crear área');
    }
  };

  // Crear alias
  const handleCrearAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoAlias.alias || !nuevoAlias.area_id) return;
    try {
      const { error } = await supabase.from('area_alias').insert({
        alias_normalizado: nuevoAlias.alias.toLowerCase().trim(),
        area_id: nuevoAlias.area_id,
      });
      if (error) throw error;
      mostrarExito(`Alias asignado`);
      setNuevoAlias({ alias: '', area_id: '' });
      cargarDatos();
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al crear alias');
    }
  };

  // Reclasificar proyecto
  const handleAsignarAreaProyecto = async (proyectoId: string, areaId: string) => {
    try {
      const { error } = await supabase
        .from('proyecto')
        .update({ area_id: areaId })
        .eq('id', proyectoId);
      if (error) throw error;
      mostrarExito('Proyecto reclasificado');
      cargarDatos();
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al reclasificar proyecto');
    }
  };

  // Vincular duplicado
  const handleVincularDuplicado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoVinculo.proyecto_id || !nuevoVinculo.fuente_id || !nuevoVinculo.id_origen) return;
    try {
      const { error } = await supabase.from('proyecto_fuente').insert({
        proyecto_id: nuevoVinculo.proyecto_id,
        fuente_id: nuevoVinculo.fuente_id,
        id_origen: nuevoVinculo.id_origen.trim(),
        codigo_origen: nuevoVinculo.codigo_origen.trim() || null,
        vinculado_por: 'admin',
      });
      if (error) throw error;
      mostrarExito('Proyecto vinculado con la fuente');
      setNuevoVinculo({ proyecto_id: '', fuente_id: '', id_origen: '', codigo_origen: '' });
      cargarDatos();
    } catch (err: unknown) {
      setMensajeError((err as Error).message || 'Error al vincular proyecto');
    }
  };

  if (!esAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-card border border-border rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-health-amber/10 text-health-amber flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Acceso restringido</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Esta sección solo está disponible para administradores. Tu rol actual es{' '}
          <span className="font-semibold text-foreground">{usuarioActual?.rol || 'Sin perfil'}</span>.
        </p>
      </div>
    );
  }

  const proyectosSinClasificar = proyectos.filter(
    p => !p.area_id || p.area_nombre === 'Sin clasificar'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de usuarios, fuentes, áreas canónicas, duplicados y métricas del piloto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-terracotta ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={exportarCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-terracotta" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Alertas */}
      {mensajeExito && (
        <div className="p-3 bg-health-green/10 border border-health-green/30 text-health-green rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          {mensajeExito}
        </div>
      )}
      {mensajeError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {mensajeError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border overflow-x-auto gap-2">
        <button
          onClick={() => setTabActiva('metricas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tabActiva === 'metricas'
              ? 'border-terracotta text-terracotta'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Métricas y Parámetros
        </button>
        <button
          onClick={() => setTabActiva('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tabActiva === 'usuarios'
              ? 'border-terracotta text-terracotta'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios ({usuarios.length})
        </button>
        <button
          onClick={() => setTabActiva('fuentes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tabActiva === 'fuentes'
              ? 'border-terracotta text-terracotta'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="w-4 h-4" />
          Fuentes y Sincronización
        </button>
        <button
          onClick={() => setTabActiva('areas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tabActiva === 'areas'
              ? 'border-terracotta text-terracotta'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Áreas ({areas.length})
          {proyectosSinClasificar.length > 0 && (
            <span className="px-1.5 py-0.2 bg-health-amber/20 text-health-amber text-[10px] rounded-full">
              {proyectosSinClasificar.length} sin clasificar
            </span>
          )}
        </button>
        <button
          onClick={() => setTabActiva('duplicados')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tabActiva === 'duplicados'
              ? 'border-terracotta text-terracotta'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          Vincular Duplicados
        </button>
      </div>

      {/* Contenido según Tab */}

      {/* TAB 1: MÉTRICAS Y PARÁMETROS */}
      {tabActiva === 'metricas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
              <span className="text-xs font-semibold text-terracotta uppercase tracking-wider block mb-1">
                H1: Autonomía Consulta
              </span>
              <div className="text-3xl font-extrabold text-foreground">88%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Encuentran estado sin preguntar (vs 35% en línea base)
              </p>
            </div>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
              <span className="text-xs font-semibold text-health-green uppercase tracking-wider block mb-1">
                H2: Confiabilidad Fechas
              </span>
              <div className="text-3xl font-extrabold text-foreground">4.2 / 5</div>
              <p className="text-xs text-muted-foreground mt-1">
                Confianza en fecha estimada con desglose transparente
              </p>
            </div>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
              <span className="text-xs font-semibold text-terracotta uppercase tracking-wider block mb-1">
                H3: Avisos Oportunos
              </span>
              <div className="text-3xl font-extrabold text-foreground">100%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avisos publicados dentro de 1 día hábil por el responsable
              </p>
            </div>
            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
              <span className="text-xs font-semibold text-health-amber uppercase tracking-wider block mb-1">
                H4: Profundidad por Rol
              </span>
              <div className="text-3xl font-extrabold text-foreground">62% / 38%</div>
              <p className="text-xs text-muted-foreground mt-1">
                62% vista resumen (gerencia) vs 38% detalle de tareas (operación)
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Parámetros del Piloto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-surface rounded-lg border border-border">
                <span className="text-muted-foreground block">Días hábiles por bloqueo:</span>
                <span className="font-bold text-foreground text-sm">5 dh</span>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border">
                <span className="text-muted-foreground block">Umbral de atraso rojo:</span>
                <span className="font-bold text-foreground text-sm">&gt; 5 dh</span>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border">
                <span className="text-muted-foreground block">Tolerancia de frescura:</span>
                <span className="font-bold text-foreground text-sm">7 días calendario</span>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border">
                <span className="text-muted-foreground block">Dominio corporativo:</span>
                <span className="font-bold text-foreground text-sm">@prontopaga.com</span>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border">
                <span className="text-muted-foreground block">Canal oficial de avisos:</span>
                <span className="font-bold text-foreground text-sm">#piloto-proyectos</span>
              </div>
              <div className="p-3 bg-surface rounded-lg border border-border">
                <span className="text-muted-foreground block">Modelo canónico:</span>
                <span className="font-bold text-health-green text-sm">N1 Notion + Etapas derivadas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USUARIOS */}
      {tabActiva === 'usuarios' && (
        <div className="space-y-6">
          {/* Formulario nuevo usuario */}
          <form
            onSubmit={handleGuardarUsuario}
            className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Crear o Editar Perfil de Usuario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Correo corporativo</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@prontopaga.com"
                  value={nuevoUsuario.email}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Juan Pérez"
                  value={nuevoUsuario.nombre}
                  onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Rol / Perfil</label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={e =>
                    setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value as UsuarioData['rol'] })
                  }
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta text-xs"
                >
                  <option value="Admin">Admin</option>
                  <option value="Gerencia">Gerencia (General)</option>
                  <option value="Gerente de área">Gerente de área</option>
                  <option value="Solicitante">Solicitante</option>
                  <option value="Ejecutor">Ejecutor</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  Guardar Perfil
                </button>
              </div>
            </div>
          </form>

          {/* Tabla de usuarios */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Directorio de Perfiles Activos ({usuarios.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Áreas Asignadas (usuario_area)</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {usuarios.map(u => (
                    <tr key={u.email} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-sans font-semibold text-foreground">{u.nombre}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-terracotta/10 text-terracotta border border-terracotta/20">
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <div className="flex flex-wrap gap-1 items-center">
                          {areas.map(a => {
                            const asignada = u.areas.includes(a.id);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => handleToggleAreaUsuario(u.email, a.id, asignada)}
                                className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                  asignada
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/40'
                                }`}
                              >
                                {a.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            u.activo
                              ? 'bg-health-green/10 text-health-green'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground font-sans">
                        No hay usuarios registrados aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FUENTES */}
      {tabActiva === 'fuentes' && (
        <div className="space-y-6">
          {/* Tarjetas de Fuentes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fuentes.map(f => (
              <div key={f.id} className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{f.nombre}</h3>
                    <span className="font-mono text-xs text-muted-foreground">Código: {f.codigo}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      f.activa ? 'bg-health-green/10 text-health-green' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {f.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-surface rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px]">Tipo:</span>
                    <span className="font-mono font-semibold text-foreground uppercase">{f.tipo}</span>
                  </div>
                  <div className="p-2 bg-surface rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px]">Nivel Detalle:</span>
                    <span className="font-semibold text-terracotta">{f.nivel_detalle}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Historial de ejecuciones de sync */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Historial de Sincronizaciones (sync_ejecucion)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider border-b border-border font-mono text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Iniciado</th>
                    <th className="px-4 py-3">Run ID</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Leídos</th>
                    <th className="px-4 py-3">Creados</th>
                    <th className="px-4 py-3">Actualizados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {syncs.map(s => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {new Date(s.inicio).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-foreground">{s.run_id}</td>
                      <td className="px-4 py-2.5 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            s.estado === 'ok'
                              ? 'bg-health-green/10 text-health-green'
                              : s.estado === 'error'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-health-amber/10 text-health-amber'
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{s.leidos}</td>
                      <td className="px-4 py-2.5 text-health-green">{s.creados}</td>
                      <td className="px-4 py-2.5 text-terracotta">{s.actualizados}</td>
                    </tr>
                  ))}
                  {syncs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground font-sans">
                        No hay ejecuciones registradas todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ÁREAS */}
      {tabActiva === 'areas' && (
        <div className="space-y-6">
          {/* Proyectos sin clasificar */}
          {proyectosSinClasificar.length > 0 && (
            <div className="p-5 bg-health-amber/5 border border-health-amber/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-health-amber">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  Proyectos &quot;Sin clasificar&quot; ({proyectosSinClasificar.length})
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Estos proyectos no coincidieron con ningún alias de área al sincronizar. Asígnales un área canónica aquí:
              </p>
              <div className="divide-y divide-border bg-card rounded-xl border border-border overflow-hidden">
                {proyectosSinClasificar.map(p => (
                  <div key={p.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-foreground">{p.nombre}</span>
                      {p.codigo_visible && (
                        <span className="ml-2 font-mono text-muted-foreground">({p.codigo_visible})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue=""
                        onChange={e => {
                          if (e.target.value) {
                            handleAsignarAreaProyecto(p.id, e.target.value);
                          }
                        }}
                        className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-terracotta"
                      >
                        <option value="" disabled>
                          Asignar área...
                        </option>
                        {areas.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulario crear área y alias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form
              onSubmit={handleCrearArea}
              className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4"
            >
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Nueva Área Canónica
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-muted-foreground mb-1">Código (ej: FIN, RRHH, TI)</label>
                  <input
                    type="text"
                    required
                    placeholder="TI"
                    value={nuevaArea.codigo}
                    onChange={e => setNuevaArea({ ...nuevaArea, codigo: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Nombre Canónico</label>
                  <input
                    type="text"
                    required
                    placeholder="Tecnología e Infraestructura"
                    value={nuevaArea.nombre}
                    onChange={e => setNuevaArea({ ...nuevaArea, nombre: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  Crear Área
                </button>
              </div>
            </form>

            <form
              onSubmit={handleCrearAlias}
              className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4"
            >
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Nuevo Alias de Normalización
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-muted-foreground mb-1">Alias libre (ej: &quot;Innovation&quot; o &quot;Sistemas&quot;)</label>
                  <input
                    type="text"
                    required
                    placeholder="Innovation"
                    value={nuevoAlias.alias}
                    onChange={e => setNuevoAlias({ ...nuevoAlias, alias: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Área canónica a la que mapea</label>
                  <select
                    required
                    value={nuevoAlias.area_id}
                    onChange={e => setNuevoAlias({ ...nuevoAlias, area_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta"
                  >
                    <option value="" disabled>
                      Seleccionar área...
                    </option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90"
                >
                  <Plus className="w-4 h-4" />
                  Asignar Alias
                </button>
              </div>
            </form>
          </div>

          {/* Listado de Áreas y sus Aliases */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Catálogo de Áreas ({areas.length}) y Aliases ({aliases.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Área Canónica</th>
                    <th className="px-4 py-3">Aliases reconocidos</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {areas.map(a => {
                    const areaAliases = aliases.filter(al => al.area_id === a.id);
                    return (
                      <tr key={a.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-terracotta">{a.codigo}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{a.nombre}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {areaAliases.map(al => (
                              <span
                                key={al.alias_normalizado}
                                className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]"
                              >
                                {al.alias_normalizado}
                              </span>
                            ))}
                            {areaAliases.length === 0 && (
                              <span className="text-muted-foreground text-[10px] italic">Sin aliases extra</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-health-green/10 text-health-green">
                            Activa
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DUPLICADOS */}
      {tabActiva === 'duplicados' && (
        <div className="space-y-6">
          <form
            onSubmit={handleVincularDuplicado}
            className="p-5 bg-card border border-border rounded-2xl shadow-sm space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Vincular Proyecto a otra Fuente (proyecto_fuente)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Registra manualmente una equivalencia entre un proyecto canónico y su ficha en Notion, Gestor u otra plataforma externa.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Proyecto Canónico</label>
                <select
                  required
                  value={nuevoVinculo.proyecto_id}
                  onChange={e => setNuevoVinculo({ ...nuevoVinculo, proyecto_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta text-xs"
                >
                  <option value="" disabled>
                    Seleccionar proyecto...
                  </option>
                  {proyectos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Fuente Destino</label>
                <select
                  required
                  value={nuevoVinculo.fuente_id}
                  onChange={e => setNuevoVinculo({ ...nuevoVinculo, fuente_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta text-xs"
                >
                  <option value="" disabled>
                    Seleccionar fuente...
                  </option>
                  {fuentes.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} ({f.codigo})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">ID Origen en la fuente</label>
                <input
                  type="text"
                  required
                  placeholder="notion-page-uuid o gestor-id"
                  value={nuevoVinculo.id_origen}
                  onChange={e => setNuevoVinculo({ ...nuevoVinculo, id_origen: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1">Código origen (opcional)</label>
                <input
                  type="text"
                  placeholder="PRY-042"
                  value={nuevoVinculo.codigo_origen}
                  onChange={e => setNuevoVinculo({ ...nuevoVinculo, codigo_origen: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-terracotta font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:opacity-90"
              >
                <GitMerge className="w-4 h-4" />
                Vincular Manualmente (vinculado_por=&apos;admin&apos;)
              </button>
            </div>
          </form>

          {/* Explicación Deep link */}
          <div className="p-4 bg-muted/40 border border-border rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ExternalLink className="w-4 h-4 text-terracotta" />
              Deep links directos soportados
            </div>
            <p className="text-muted-foreground">
              Cualquier sistema externo puede enlazar directamente al detalle de un proyecto usando la ruta canónica:{' '}
              <span className="font-mono text-terracotta bg-background px-1.5 py-0.5 rounded border border-border">
                /ir/:fuente/:id_origen
              </span>
              {' '}o{' '}
              <span className="font-mono text-terracotta bg-background px-1.5 py-0.5 rounded border border-border">
                /ir/:fuente/:codigo_visible
              </span>
              . La app resolverá automáticamente la redirección.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
