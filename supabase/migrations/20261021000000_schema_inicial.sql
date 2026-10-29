-- ==============================================================================
-- 20261021000000_schema_inicial.sql
-- Prototipo "Comunicación de Avances de Proyectos"
-- Enums, Tablas, Triggers solo-inserción, Helpers RLS, Políticas y Vistas
-- ==============================================================================

-- 1. ENUMS
CREATE TYPE etapa_estado AS ENUM ('Pendiente', 'En curso', 'Bloqueada', 'Completada');
CREATE TYPE bloqueo_motivo AS ENUM ('Aprobación QA', 'Infraestructura', 'Seguridad', 'Dependencia', 'Otro');
CREATE TYPE rol AS ENUM ('Gerencia', 'Solicitante', 'Ejecutor', 'Admin');
CREATE TYPE semaforo AS ENUM ('verde', 'amarillo', 'rojo', 'gris');
CREATE TYPE aviso_tipo AS ENUM ('cambio_etapa', 'bloqueo_nuevo', 'bloqueo_cerrado', 'atraso', 'retroceso', 'sin_actualizar');
CREATE TYPE aviso_estado AS ENUM ('preparado', 'publicado', 'descartado');
CREATE TYPE evento_tipo AS ENUM ('creado', 'actualizado', 'eliminado', 'retroceso');
CREATE TYPE encuesta_momento AS ENUM ('Línea base', 'Semana 1', 'Semana 2', 'Semana 3');
CREATE TYPE encuesta_encontro AS ENUM ('Sí', 'Parcialmente', 'No');
CREATE TYPE encuesta_tiempo AS ENUM ('<1 min', '1-5 min', '>5 min');
CREATE TYPE encuesta_como_entero AS ENUM ('Aviso del responsable', 'Revisando la app', 'Preguntando');
CREATE TYPE encuesta_vista AS ENUM ('Resumen', 'Detalle', 'Asistente');
CREATE TYPE sync_resultado AS ENUM ('ok', 'error');

-- 2. TABLAS PRINCIPALES (Sincronizadas con Notion)
CREATE TABLE proyecto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id text UNIQUE,
  notion_editado_en timestamptz,
  eliminado bool DEFAULT false,
  nombre text NOT NULL,
  area_solicitante text NOT NULL,
  solicitante_nombre text NOT NULL,
  solicitante_email text NOT NULL,
  responsable_comunicar_nombre text NOT NULL,
  responsable_comunicar_email text NOT NULL,
  fecha_comprometida date,
  notion_url text,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE etapa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id text UNIQUE,
  notion_editado_en timestamptz,
  eliminado bool DEFAULT false,
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden int NOT NULL,
  responsable_nombre text,
  responsable_email text,
  estado etapa_estado NOT NULL DEFAULT 'Pendiente',
  inicio_plan date,
  fin_plan date,
  inicio_real date,
  fin_real date,
  duracion_dh int,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE bloqueo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id text UNIQUE,
  notion_editado_en timestamptz,
  eliminado bool DEFAULT false,
  etapa_id uuid REFERENCES etapa(id) ON DELETE SET NULL,
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  motivo bloqueo_motivo NOT NULL DEFAULT 'Otro',
  area_destraba text NOT NULL,
  fecha_apertura date NOT NULL DEFAULT CURRENT_DATE,
  fecha_cierre date,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE tarea (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_id text UNIQUE,
  notion_editado_en timestamptz,
  eliminado bool DEFAULT false,
  etapa_id uuid NOT NULL REFERENCES etapa(id) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  responsable_nombre text,
  responsable_email text,
  estado text NOT NULL DEFAULT 'Pendiente',
  creado_en timestamptz DEFAULT now()
);

-- 3. AUDITORÍA Y EVENTOS (SOLO INSERCIÓN)
CREATE TABLE evento_cambio (
  id bigserial PRIMARY KEY,
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  entidad text NOT NULL,
  entidad_id text NOT NULL,
  campo text NOT NULL,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  tipo evento_tipo NOT NULL,
  detectado_en timestamptz NOT NULL DEFAULT now(),
  notion_editado_en timestamptz
);

-- Trigger que prohíbe UPDATE y DELETE en evento_cambio
CREATE OR REPLACE FUNCTION trg_evento_cambio_solo_insert()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'La tabla evento_cambio es de solo inserción (inmutable). No se permite UPDATE ni DELETE.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_cambio_no_update_delete
BEFORE UPDATE OR DELETE ON evento_cambio
FOR EACH ROW EXECUTE FUNCTION trg_evento_cambio_solo_insert();

-- 4. CÁLCULOS PERSISTIDOS Y SNAPSHOTS
CREATE TABLE proyecto_calculo (
  proyecto_id uuid PRIMARY KEY REFERENCES proyecto(id) ON DELETE CASCADE,
  etapa_actual_id uuid REFERENCES etapa(id) ON DELETE SET NULL,
  avance_pct int NOT NULL DEFAULT 0,
  etapas_completadas int NOT NULL DEFAULT 0,
  etapas_total int NOT NULL DEFAULT 0,
  fecha_reproyectada date,
  atraso_dh int NOT NULL DEFAULT 0,
  semaforo semaforo NOT NULL DEFAULT 'gris',
  motivos_semaforo text[] NOT NULL DEFAULT '{}',
  bloqueos_abiertos int NOT NULL DEFAULT 0,
  ultima_actualizacion timestamptz,
  sin_actualizar bool NOT NULL DEFAULT false,
  alertas_gobierno text[] NOT NULL DEFAULT '{}',
  desglose jsonb NOT NULL DEFAULT '{}'::jsonb,
  cerrado bool NOT NULL DEFAULT false,
  calculado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE proyeccion_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  fecha_reproyectada date,
  atraso_dh int NOT NULL DEFAULT 0,
  semaforo semaforo NOT NULL DEFAULT 'gris',
  creado_en timestamptz DEFAULT now(),
  CONSTRAINT uq_proyeccion_snapshot_proyecto_fecha UNIQUE (proyecto_id, fecha)
);

-- 5. AVISOS
CREATE TABLE aviso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  tipo aviso_tipo NOT NULL,
  evento_ids bigint[] NOT NULL DEFAULT '{}',
  mensaje text NOT NULL,
  responsable_email text NOT NULL,
  estado aviso_estado NOT NULL DEFAULT 'preparado',
  preparado_en timestamptz NOT NULL DEFAULT now(),
  publicado_en timestamptz,
  publicado_por text,
  slack_ts text,
  canal text
);

-- 6. USUARIOS, ROLES Y ASIGNACIONES
CREATE TABLE usuario_rol (
  email text PRIMARY KEY,
  nombre text NOT NULL,
  rol rol NOT NULL,
  area text,
  activo bool NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE usuario_proyecto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL REFERENCES usuario_rol(email) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES proyecto(id) ON DELETE CASCADE,
  creado_en timestamptz DEFAULT now(),
  CONSTRAINT uq_usuario_proyecto UNIQUE (email, proyecto_id)
);

-- 7. USO, ASISTENTE Y ENCUESTAS
CREATE TABLE evento_uso (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  rol rol NOT NULL,
  vista text NOT NULL,
  proyecto_id uuid REFERENCES proyecto(id) ON DELETE SET NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE consulta_asistente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  rol rol NOT NULL,
  proyecto_id uuid REFERENCES proyecto(id) ON DELETE SET NULL,
  pregunta text NOT NULL,
  respuesta text NOT NULL,
  funciones_usadas jsonb DEFAULT '[]'::jsonb,
  respondio bool NOT NULL DEFAULT true,
  valoracion smallint CHECK (valoracion IN (-1, 1)),
  latencia_ms int,
  tokens_in int,
  tokens_out int,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE encuesta_respuesta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL REFERENCES usuario_rol(email) ON DELETE CASCADE,
  rol rol NOT NULL,
  momento encuesta_momento NOT NULL,
  encontro_sin_preguntar encuesta_encontro NOT NULL,
  tiempo encuesta_tiempo NOT NULL,
  confianza_fecha int NOT NULL CHECK (confianza_fecha BETWEEN 1 AND 5),
  preguntas_slack_correo int NOT NULL DEFAULT 0,
  como_se_entero encuesta_como_entero NOT NULL,
  vista_mas_usada encuesta_vista NOT NULL,
  minutos_actualizar_notion int,
  creado_en timestamptz DEFAULT now(),
  CONSTRAINT uq_encuesta_email_momento UNIQUE (email, momento)
);

-- 8. PARÁMETROS, ESTADO DE SYNC Y FERIADOS
CREATE TABLE parametro (
  clave text PRIMARY KEY,
  valor jsonb NOT NULL,
  descripcion text NOT NULL,
  actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE sync_estado (
  base text PRIMARY KEY,
  ultima_sync timestamptz NOT NULL,
  resultado sync_resultado NOT NULL,
  detalle text,
  registros int NOT NULL DEFAULT 0
);

CREATE TABLE feriado (
  fecha date PRIMARY KEY,
  nombre text NOT NULL
);

-- 9. FUNCIONES HELPER PARA RLS (SECURITY DEFINER STABLE)
CREATE OR REPLACE FUNCTION app_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT lower(coalesce(auth.jwt()->>'email', current_setting('request.jwt.claim.email', true)));
$$;

CREATE OR REPLACE FUNCTION app_rol()
RETURNS rol
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT rol FROM usuario_rol WHERE lower(email) = app_email() AND activo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION proyecto_visible(pid uuid)
RETURNS bool
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_rol rol;
  v_email text;
  v_area text;
  v_visible bool;
BEGIN
  v_email := app_email();
  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  SELECT rol, area INTO v_rol, v_area FROM usuario_rol WHERE lower(email) = v_email AND activo = true;
  IF v_rol IS NULL THEN
    RETURN false;
  END IF;

  -- Admin y Gerencia ven todos los proyectos
  IF v_rol IN ('Admin', 'Gerencia') THEN
    RETURN true;
  END IF;

  -- Solicitante: ve proyectos de su área o asignación explícita
  IF v_rol = 'Solicitante' THEN
    SELECT EXISTS (
      SELECT 1 FROM proyecto p
      WHERE p.id = pid AND (
        p.area_solicitante = v_area
        OR lower(p.solicitante_email) = v_email
        OR EXISTS (SELECT 1 FROM usuario_proyecto up WHERE up.proyecto_id = pid AND lower(up.email) = v_email)
      )
    ) INTO v_visible;
    RETURN v_visible;
  END IF;

  -- Ejecutor: tiene etapa/tarea con su email, es resp. de comunicar o asignación explícita
  IF v_rol = 'Ejecutor' THEN
    SELECT EXISTS (
      SELECT 1 FROM proyecto p
      WHERE p.id = pid AND (
        lower(p.responsable_comunicar_email) = v_email
        OR EXISTS (SELECT 1 FROM etapa e WHERE e.proyecto_id = pid AND lower(e.responsable_email) = v_email)
        OR EXISTS (SELECT 1 FROM tarea t WHERE t.proyecto_id = pid AND lower(t.responsable_email) = v_email)
        OR EXISTS (SELECT 1 FROM usuario_proyecto up WHERE up.proyecto_id = pid AND lower(up.email) = v_email)
      )
    ) INTO v_visible;
    RETURN v_visible;
  END IF;

  RETURN false;
END;
$$;

-- 10. HABILITAR ROW LEVEL SECURITY (RLS) EN 100% DE LAS TABLAS
ALTER TABLE proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapa ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueo ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_cambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_calculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyeccion_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviso ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE consulta_asistente ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametro ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriado ENABLE ROW LEVEL SECURITY;

-- 11. POLÍTICAS RLS

-- Proyectos y entidades hijas: solo lectura vía proyecto_visible
CREATE POLICY "Select proyecto segun visibilidad" ON proyecto FOR SELECT USING (proyecto_visible(id));
CREATE POLICY "Select etapa segun visibilidad" ON etapa FOR SELECT USING (proyecto_visible(proyecto_id));
CREATE POLICY "Select bloqueo segun visibilidad" ON bloqueo FOR SELECT USING (proyecto_visible(proyecto_id));
CREATE POLICY "Select tarea segun visibilidad" ON tarea FOR SELECT USING (proyecto_visible(proyecto_id));
CREATE POLICY "Select evento_cambio segun visibilidad" ON evento_cambio FOR SELECT USING (proyecto_visible(proyecto_id));
CREATE POLICY "Select calculo segun visibilidad" ON proyecto_calculo FOR SELECT USING (proyecto_visible(proyecto_id));
CREATE POLICY "Select proyeccion segun visibilidad" ON proyeccion_snapshot FOR SELECT USING (proyecto_visible(proyecto_id));
CREATE POLICY "Select aviso segun visibilidad" ON aviso FOR SELECT USING (proyecto_visible(proyecto_id));

-- Avisos: modificación únicamente para Admin o Edge Functions
CREATE POLICY "Admin update aviso" ON aviso FOR UPDATE USING (app_rol() = 'Admin');

-- usuario_rol y usuario_proyecto
CREATE POLICY "Select propio usuario_rol o Admin" ON usuario_rol FOR SELECT USING (lower(email) = app_email() OR app_rol() = 'Admin');
CREATE POLICY "Admin modifica usuario_rol" ON usuario_rol FOR ALL USING (app_rol() = 'Admin');
CREATE POLICY "Select propio usuario_proyecto o Admin" ON usuario_proyecto FOR SELECT USING (lower(email) = app_email() OR app_rol() = 'Admin');
CREATE POLICY "Admin modifica usuario_proyecto" ON usuario_proyecto FOR ALL USING (app_rol() = 'Admin');

-- evento_uso: insert propio, select propio o admin
CREATE POLICY "Insert propio evento_uso" ON evento_uso FOR INSERT WITH CHECK (lower(email) = app_email());
CREATE POLICY "Select propio evento_uso o Admin" ON evento_uso FOR SELECT USING (lower(email) = app_email() OR app_rol() = 'Admin');

-- consulta_asistente: insert propio, select propio o admin, update valoracion propio
CREATE POLICY "Insert propio consulta_asistente" ON consulta_asistente FOR INSERT WITH CHECK (lower(email) = app_email());
CREATE POLICY "Select propio consulta_asistente o Admin" ON consulta_asistente FOR SELECT USING (lower(email) = app_email() OR app_rol() = 'Admin');
CREATE POLICY "Update valoracion consulta_asistente" ON consulta_asistente FOR UPDATE USING (lower(email) = app_email()) WITH CHECK (lower(email) = app_email());

-- encuesta_respuesta: insert y select propio o admin
CREATE POLICY "Insert propio encuesta_respuesta" ON encuesta_respuesta FOR INSERT WITH CHECK (lower(email) = app_email());
CREATE POLICY "Select propio encuesta_respuesta o Admin" ON encuesta_respuesta FOR SELECT USING (lower(email) = app_email() OR app_rol() = 'Admin');

-- Parámetros, sync_estado, feriado: lectura para cualquier usuario autenticado activo, escritura solo Admin
CREATE POLICY "Select parametro autenticado activo" ON parametro FOR SELECT USING (app_rol() IS NOT NULL);
CREATE POLICY "Admin modifica parametro" ON parametro FOR ALL USING (app_rol() = 'Admin');

CREATE POLICY "Select sync_estado autenticado activo" ON sync_estado FOR SELECT USING (app_rol() IS NOT NULL);
CREATE POLICY "Admin modifica sync_estado" ON sync_estado FOR ALL USING (app_rol() = 'Admin');

CREATE POLICY "Select feriado autenticado activo" ON feriado FOR SELECT USING (app_rol() IS NOT NULL);
CREATE POLICY "Admin modifica feriado" ON feriado FOR ALL USING (app_rol() = 'Admin');

-- 12. VISTAS CON SECURITY_INVOKER = TRUE

CREATE OR REPLACE VIEW v_proyecto_resumen
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.nombre,
  p.area_solicitante,
  p.solicitante_nombre,
  p.solicitante_email,
  p.responsable_comunicar_nombre,
  p.responsable_comunicar_email,
  p.fecha_comprometida,
  p.notion_url,
  c.etapa_actual_id,
  e.nombre AS etapa_actual_nombre,
  c.avance_pct,
  c.etapas_completadas,
  c.etapas_total,
  c.fecha_reproyectada,
  c.atraso_dh,
  c.semaforo,
  c.motivos_semaforo,
  c.bloqueos_abiertos,
  c.ultima_actualizacion,
  c.sin_actualizar,
  c.alertas_gobierno,
  c.desglose,
  c.cerrado,
  c.calculado_en
FROM proyecto p
LEFT JOIN proyecto_calculo c ON p.id = c.proyecto_id
LEFT JOIN etapa e ON c.etapa_actual_id = e.id
WHERE p.eliminado = false;

-- Vistas Métricas H1..H4
CREATE OR REPLACE VIEW v_metrica_h1
WITH (security_invoker = true) AS
SELECT
  (SELECT count(DISTINCT email) FROM evento_uso) AS usuarios_activos_total,
  (SELECT count(*) FROM consulta_asistente) AS total_consultas_asistente,
  (SELECT coalesce(round(100.0 * count(*) FILTER (WHERE respondio = true) / nullif(count(*), 0), 1), 0) FROM consulta_asistente) AS pct_respondidas,
  (SELECT coalesce(round(100.0 * count(*) FILTER (WHERE valoracion = 1) / nullif(count(*) FILTER (WHERE valoracion IS NOT NULL), 0), 1), 0) FROM consulta_asistente) AS pct_valoracion_positiva,
  (SELECT coalesce(round(100.0 * count(*) FILTER (WHERE encontro_sin_preguntar = 'Sí') / nullif(count(*), 0), 1), 0) FROM encuesta_respuesta) AS pct_encontro_sin_preguntar_si,
  (SELECT avg(preguntas_slack_correo) FROM encuesta_respuesta) AS promedio_preguntas_contacto;

CREATE OR REPLACE VIEW v_metrica_h2
WITH (security_invoker = true) AS
SELECT
  r.momento,
  round(avg(r.confianza_fecha), 2) AS confianza_promedio,
  count(*) AS total_respuestas
FROM encuesta_respuesta r
GROUP BY r.momento;

CREATE OR REPLACE VIEW v_metrica_h3
WITH (security_invoker = true) AS
SELECT
  coalesce(round(100.0 * count(*) FILTER (WHERE a.estado = 'publicado' AND a.publicado_en <= a.preparado_en + interval '24 hours') / nullif(count(*), 0), 1), 0) AS pct_avisos_a_tiempo,
  count(*) FILTER (WHERE a.estado = 'publicado') AS total_publicados,
  count(*) AS total_avisos
FROM aviso a;

CREATE OR REPLACE VIEW v_metrica_h4
WITH (security_invoker = true) AS
SELECT
  rol,
  vista,
  count(*) AS total_vistas,
  round(100.0 * count(*) / sum(count(*)) OVER (PARTITION BY rol), 1) AS pct_por_rol
FROM evento_uso
GROUP BY rol, vista;
