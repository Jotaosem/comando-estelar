-- Seed generado automáticamente por scripts/seed.ts
-- Fecha base de simulación: 2026-10-21

-- Parámetros iniciales
INSERT INTO parametro (clave, valor, descripcion) VALUES
  ('dias_por_bloqueo', '5'::jsonb, 'Días hábiles añadidos a la proyección por cada bloqueo abierto'),
  ('umbral_atraso_rojo_dh', '5'::jsonb, 'Días hábiles de atraso para pasar semáforo a rojo'),
  ('umbral_bloqueo_rojo_dh', '5'::jsonb, 'Antigüedad en días hábiles de un bloqueo para pasar semáforo a rojo'),
  ('dias_frescura', '7'::jsonb, 'Días calendario tolerados sin edición antes de marcar sin_actualizar'),
  ('duracion_default_dh', '5'::jsonb, 'Duración por defecto en días hábiles cuando una etapa no tiene estimación'),
  ('canal_slack_piloto', '"#piloto-proyectos"'::jsonb, 'Canal de Slack para publicar avisos'),
  ('url_app', '"http://localhost:5173"'::jsonb, 'URL de la aplicación frontend'),
  ('inicio_piloto', '"2026-10-20"'::jsonb, 'Fecha oficial de inicio de medición del piloto')
ON CONFLICT (clave) DO NOTHING;

-- Usuarios del seed
INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('admin@empresa.cl', 'Administrador General', 'Admin', NULL, true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;
INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('gerencia@empresa.cl', 'Gerente Operaciones y TI', 'Gerencia', NULL, true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;
INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('valeria.soto@empresa.cl', 'Valeria Soto', 'Solicitante', 'Operaciones', true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;
INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('esteban.lagos@empresa.cl', 'Esteban Lagos', 'Solicitante', 'Comercial', true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;
INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('jose.miguel@empresa.cl', 'José Miguel (Líder)', 'Ejecutor', 'TI', true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;
INSERT INTO usuario_rol (email, nombre, rol, area, activo) VALUES ('carlos.dev@empresa.cl', 'Carlos Desarrollador', 'Ejecutor', 'TI', true) ON CONFLICT (email) DO UPDATE SET rol=EXCLUDED.rol, area=EXCLUDED.area;

-- Proyectos
INSERT INTO proyecto (id, notion_id, nombre, area_solicitante, solicitante_nombre, solicitante_email, responsable_comunicar_nombre, responsable_comunicar_email, fecha_comprometida, notion_url) VALUES ('a0000000-0000-0000-0000-000000000001', 'notion-proj-a', 'Portal Proveedores (Proyecto A)', 'Operaciones', 'Valeria Soto', 'valeria.soto@empresa.cl', 'Jose Miguel', 'jose.miguel@empresa.cl', '2026-11-06', 'https://notion.so/empresa/proj-a') ON CONFLICT (id) DO NOTHING;
INSERT INTO proyecto (id, notion_id, nombre, area_solicitante, solicitante_nombre, solicitante_email, responsable_comunicar_nombre, responsable_comunicar_email, fecha_comprometida, notion_url) VALUES ('b0000000-0000-0000-0000-000000000002', 'notion-proj-b', 'Integración ERP (Proyecto B)', 'Comercial', 'Esteban Lagos', 'esteban.lagos@empresa.cl', 'Jose Miguel', 'jose.miguel@empresa.cl', '2026-12-15', 'https://notion.so/empresa/proj-b') ON CONFLICT (id) DO NOTHING;
INSERT INTO proyecto (id, notion_id, nombre, area_solicitante, solicitante_nombre, solicitante_email, responsable_comunicar_nombre, responsable_comunicar_email, fecha_comprometida, notion_url) VALUES ('c0000000-0000-0000-0000-000000000003', 'notion-proj-c', 'Automatización Compliance (Proyecto C)', 'Compliance', 'Camila Rivas', 'camila.rivas@empresa.cl', 'Jose Miguel', 'jose.miguel@empresa.cl', '2026-11-10', 'https://notion.so/empresa/proj-c') ON CONFLICT (id) DO NOTHING;
INSERT INTO proyecto (id, notion_id, nombre, area_solicitante, solicitante_nombre, solicitante_email, responsable_comunicar_nombre, responsable_comunicar_email, fecha_comprometida, notion_url) VALUES ('d0000000-0000-0000-0000-000000000004', 'notion-proj-d', 'Migración Cloud Core (Proyecto D)', 'Operaciones', 'Valeria Soto', 'valeria.soto@empresa.cl', 'Jose Miguel', 'jose.miguel@empresa.cl', '2026-10-15', 'https://notion.so/empresa/proj-d') ON CONFLICT (id) DO NOTHING;

-- Etapas
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000a1', 'notion-etapa-a1', 'a0000000-0000-0000-0000-000000000001', 'Levantamiento', 1, 'Carlos Dev', 'carlos.dev@empresa.cl', 'Completada', NULL, '2026-10-05', 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000a2', 'notion-etapa-a2', 'a0000000-0000-0000-0000-000000000001', 'Desarrollo', 2, 'Carlos Dev', 'carlos.dev@empresa.cl', 'Completada', NULL, '2026-10-12', 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000a3', 'notion-etapa-a3', 'a0000000-0000-0000-0000-000000000001', 'QA', 3, 'Paula QA', 'paula.qa@empresa.cl', 'En curso', '2026-10-13', NULL, 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000a4', 'notion-etapa-a4', 'a0000000-0000-0000-0000-000000000001', 'Despliegue', 4, 'Carlos Dev', 'carlos.dev@empresa.cl', 'Pendiente', NULL, NULL, 2) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000b1', 'notion-etapa-b1', 'b0000000-0000-0000-0000-000000000002', 'Levantamiento', 1, 'Carlos Dev', 'carlos.dev@empresa.cl', 'Completada', NULL, '2026-10-10', 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000b2', 'notion-etapa-b2', 'b0000000-0000-0000-0000-000000000002', 'Desarrollo', 2, 'Carlos Dev', 'carlos.dev@empresa.cl', 'En curso', '2026-10-14', NULL, 15) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000b3', 'notion-etapa-b3', 'b0000000-0000-0000-0000-000000000002', 'QA', 3, 'Paula QA', 'paula.qa@empresa.cl', 'Pendiente', NULL, NULL, 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000c1', 'notion-etapa-c1', 'c0000000-0000-0000-0000-000000000003', 'Levantamiento', 1, 'Carlos Dev', 'carlos.dev@empresa.cl', 'Completada', NULL, '2026-10-05', 4) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000c2', 'notion-etapa-c2', 'c0000000-0000-0000-0000-000000000003', 'Desarrollo', 2, 'Carlos Dev', 'carlos.dev@empresa.cl', 'En curso', '2026-10-16', NULL, 10) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000c3', 'notion-etapa-c3', 'c0000000-0000-0000-0000-000000000003', 'Aprobación Seguridad', 3, NULL, NULL, 'Pendiente', NULL, NULL, 5) ON CONFLICT (id) DO NOTHING;
INSERT INTO etapa (id, notion_id, proyecto_id, nombre, orden, responsable_nombre, responsable_email, estado, inicio_real, fin_real, duracion_dh) VALUES ('e0000000-0000-0000-0000-0000000000d1', 'notion-etapa-d1', 'd0000000-0000-0000-0000-000000000004', 'Ejecución y Cierre', 1, 'Carlos Dev', 'carlos.dev@empresa.cl', 'Completada', NULL, '2026-10-14', 10) ON CONFLICT (id) DO NOTHING;

-- Bloqueos
INSERT INTO bloqueo (id, notion_id, proyecto_id, etapa_id, descripcion, motivo, area_destraba, fecha_apertura) VALUES ('b0000000-0000-0000-0000-000000000001', 'notion-bloq-a1', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000a3', 'Pendiente firma de matriz de pruebas UAT', 'Aprobación QA', 'QA', '2026-10-13') ON CONFLICT (id) DO NOTHING;

-- Tareas
INSERT INTO tarea (id, notion_id, proyecto_id, etapa_id, nombre, responsable_nombre, responsable_email, estado) VALUES ('t0000000-0000-0000-0000-000000000001', 'notion-tar-1', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000a3', 'Revisar ambientes de staging', 'Paula QA', 'paula.qa@empresa.cl', 'En curso') ON CONFLICT (id) DO NOTHING;

-- Cálculos persistidos

    INSERT INTO proyecto_calculo (
      proyecto_id, etapa_actual_id, avance_pct, etapas_completadas, etapas_total,
      fecha_reproyectada, atraso_dh, semaforo, motivos_semaforo, bloqueos_abiertos,
      ultima_actualizacion, sin_actualizar, alertas_gobierno, desglose, cerrado, calculado_en
    ) VALUES (
      'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-0000000000a3', 50, 2, 4,
      '2026-10-30', -5, 'rojo', ARRAY['Bloqueo de Aprobación QA abierto hace 6 días hábiles'], 1,
      '2026-10-21T00:00:00.000Z', false, ARRAY[], '{"base":"2026-10-21","etapas":[{"nombre":"Levantamiento","estado":"Completada","dias":0},{"nombre":"Desarrollo","estado":"Completada","dias":0},{"nombre":"QA","estado":"En curso","dias":0},{"nombre":"Despliegue","estado":"Pendiente","dias":2}],"bloqueos":[{"descripcion":"Pendiente firma de matriz de pruebas UAT","motivo":"Aprobación QA","dias":5}],"total_dh":7,"fecha":"2026-10-30"}'::jsonb, false, now()
    );
  

    INSERT INTO proyecto_calculo (
      proyecto_id, etapa_actual_id, avance_pct, etapas_completadas, etapas_total,
      fecha_reproyectada, atraso_dh, semaforo, motivos_semaforo, bloqueos_abiertos,
      ultima_actualizacion, sin_actualizar, alertas_gobierno, desglose, cerrado, calculado_en
    ) VALUES (
      'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-0000000000b2', 33, 1, 3,
      '2026-11-11', -23, 'verde', ARRAY['Proyecto al día según lo comprometido'], 0,
      '2026-10-21T00:00:00.000Z', false, ARRAY[], '{"base":"2026-10-21","etapas":[{"nombre":"Levantamiento","estado":"Completada","dias":0},{"nombre":"Desarrollo","estado":"En curso","dias":10},{"nombre":"QA","estado":"Pendiente","dias":5}],"bloqueos":[],"total_dh":15,"fecha":"2026-11-11"}'::jsonb, false, now()
    );
  

    INSERT INTO proyecto_calculo (
      proyecto_id, etapa_actual_id, avance_pct, etapas_completadas, etapas_total,
      fecha_reproyectada, atraso_dh, semaforo, motivos_semaforo, bloqueos_abiertos,
      ultima_actualizacion, sin_actualizar, alertas_gobierno, desglose, cerrado, calculado_en
    ) VALUES (
      'c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-0000000000c2', 33, 1, 3,
      '2026-11-06', -2, 'verde', ARRAY['Proyecto al día según lo comprometido'], 0,
      '2026-10-21T00:00:00.000Z', false, ARRAY['Etapa "Aprobación Seguridad" sin responsable asignado'], '{"base":"2026-10-21","etapas":[{"nombre":"Levantamiento","estado":"Completada","dias":0},{"nombre":"Desarrollo","estado":"En curso","dias":7},{"nombre":"Aprobación Seguridad","estado":"Pendiente","dias":5}],"bloqueos":[],"total_dh":12,"fecha":"2026-11-06"}'::jsonb, false, now()
    );
  

    INSERT INTO proyecto_calculo (
      proyecto_id, etapa_actual_id, avance_pct, etapas_completadas, etapas_total,
      fecha_reproyectada, atraso_dh, semaforo, motivos_semaforo, bloqueos_abiertos,
      ultima_actualizacion, sin_actualizar, alertas_gobierno, desglose, cerrado, calculado_en
    ) VALUES (
      'd0000000-0000-0000-0000-000000000004', NULL, 100, 1, 1,
      '2026-10-14', -1, 'verde', ARRAY['Proyecto al día según lo comprometido'], 0,
      '2026-10-21T00:00:00.000Z', false, ARRAY[], '{"base":"2026-10-21","etapas":[{"nombre":"Ejecución y Cierre","estado":"Completada","dias":0}],"bloqueos":[],"total_dh":0,"fecha":"2026-10-14"}'::jsonb, true, now()
    );
  

-- Snapshots iniciales de proyección
INSERT INTO proyeccion_snapshot (proyecto_id, fecha, fecha_reproyectada, atraso_dh, semaforo) SELECT proyecto_id, CURRENT_DATE, fecha_reproyectada, atraso_dh, semaforo FROM proyecto_calculo WHERE proyecto_id = 'a0000000-0000-0000-0000-000000000001' ON CONFLICT (proyecto_id, fecha) DO NOTHING;
INSERT INTO proyeccion_snapshot (proyecto_id, fecha, fecha_reproyectada, atraso_dh, semaforo) SELECT proyecto_id, CURRENT_DATE, fecha_reproyectada, atraso_dh, semaforo FROM proyecto_calculo WHERE proyecto_id = 'b0000000-0000-0000-0000-000000000002' ON CONFLICT (proyecto_id, fecha) DO NOTHING;
INSERT INTO proyeccion_snapshot (proyecto_id, fecha, fecha_reproyectada, atraso_dh, semaforo) SELECT proyecto_id, CURRENT_DATE, fecha_reproyectada, atraso_dh, semaforo FROM proyecto_calculo WHERE proyecto_id = 'c0000000-0000-0000-0000-000000000003' ON CONFLICT (proyecto_id, fecha) DO NOTHING;
INSERT INTO proyeccion_snapshot (proyecto_id, fecha, fecha_reproyectada, atraso_dh, semaforo) SELECT proyecto_id, CURRENT_DATE, fecha_reproyectada, atraso_dh, semaforo FROM proyecto_calculo WHERE proyecto_id = 'd0000000-0000-0000-0000-000000000004' ON CONFLICT (proyecto_id, fecha) DO NOTHING;

-- Eventos de cambio iniciales (historial)
INSERT INTO evento_cambio (proyecto_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, tipo, detectado_en) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'etapa', 'e0000000-0000-0000-0000-0000000000a3', 'estado', '"Pendiente"', '"En curso"', 'actualizado', now() - interval '6 days'),
  ('a0000000-0000-0000-0000-000000000001', 'bloqueo', 'b0000000-0000-0000-0000-000000000001', '*', null, '{"descripcion":"Pendiente firma matriz UAT"}'::jsonb, 'creado', now() - interval '6 days'),
  ('c0000000-0000-0000-0000-000000000003', 'etapa', 'e0000000-0000-0000-0000-0000000000b2', 'estado', '"Completada"', '"En curso"', 'retroceso', now() - interval '2 days');
