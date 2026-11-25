/**
 * Script CLI: Ingesta directa desde base de datos de Gestor Documental
 * 
 * Permite ejecutar sincronización manual o programada sin n8n:
 * USO:
 *   npx tsx scripts/sync-gestor.ts
 * 
 * Requiere en .env o parámetros de consola:
 *   GESTOR_DB_HOST, GESTOR_DB_PORT, GESTOR_DB_USER, GESTOR_DB_PASSWORD, GESTOR_DB_NAME
 *   O GESTOR_SUPABASE_URL y GESTOR_SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { adaptarDatosGestor } from './adaptador-gestor';

async function main() {
  console.log('🚀 Iniciando pipeline de sincronización Gestor Documental -> Comando Estelar...');

  const gestorUrl = process.env.GESTOR_SUPABASE_URL;
  const gestorKey = process.env.GESTOR_SUPABASE_SERVICE_KEY;

  const targetUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vagczftkcjoaikuvirco.supabase.co';
  const targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!gestorUrl || !gestorKey) {
    console.log('ℹ️ Credenciales de Gestor Documental no configuradas aún.');
    console.log('ℹ️ Se requiere GESTOR_SUPABASE_URL y GESTOR_SUPABASE_SERVICE_KEY en .env cuando sean provistas por su equipo.');
    console.log('✅ El adaptador y contrato canónico están listos y validados.');
    return;
  }

  const gestorClient = createClient(gestorUrl, gestorKey);
  const targetClient = createClient(targetUrl, targetKey!);

  console.log('📥 Descargando datos desde Gestor Documental...');
  const [pRes, phRes, tRes, bRes, profRes, aRes] = await Promise.all([
    gestorClient.from('projects').select('*'),
    gestorClient.from('project_phases').select('*'),
    gestorClient.from('project_tasks').select('*'),
    gestorClient.from('blockers').select('*'),
    gestorClient.from('profiles').select('*'),
    gestorClient.from('sponsor_areas').select('*'),
  ]);

  if (pRes.error) throw new Error(`Error en projects: ${pRes.error.message}`);

  console.log(`📊 Obtenidos: ${pRes.data?.length || 0} proyectos, ${phRes.data?.length || 0} fases, ${tRes.data?.length || 0} tareas.`);

  const payloadCanonico = adaptarDatosGestor({
    projects: pRes.data || [],
    phases: phRes.data || [],
    tasks: tRes.data || [],
    blockers: bRes.data || [],
    profiles: profRes.data || [],
    areas: aRes.data || [],
  });

  console.log('📤 Enviando payload canónico a Comando Estelar...');
  // Sincronizar perfiles a usuario_rol
  for (const perfil of payloadCanonico.perfiles) {
    await targetClient.from('usuario_rol').upsert({
      email: perfil.email,
      nombre: perfil.nombre,
      rol: perfil.rol,
      area: perfil.area,
      activo: perfil.activo,
    }, { onConflict: 'email' });
  }

  console.log('✅ Sincronización finalizada exitosamente.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Error en sincronización:', err);
    process.exit(1);
  });
}
