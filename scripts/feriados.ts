/**
 * scripts/feriados.ts
 * Carga de feriados oficiales de Chile usando APIs oficiales.
 * Uso: deno run --allow-net --allow-write scripts/feriados.ts <año>
 */

interface FeriadoApi {
  nombre: string;
  fecha: string;
}

export async function obtenerFeriadosChile(ano: number): Promise<{ fecha: string; nombre: string }[]> {
  try {
    const res = await fetch(`https://apis.digital.gob.cl/fl/feriados/${ano}`, {
      headers: { 'User-Agent': 'Prototipo-Avances-Proyectos/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((f: any) => ({
          fecha: f.fecha,
          nombre: f.nombre
        }));
      }
    }
  } catch (err) {
    console.warn(`Fallback a Nager.Date para año ${ano}:`, err);
  }

  // Respaldo Nager.Date CL
  try {
    const fallback = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/CL`);
    if (fallback.ok) {
      const list = await fallback.json();
      return list.map((f: any) => ({
        fecha: f.date,
        nombre: f.localName || f.name
      }));
    }
  } catch (err) {
    console.error(`Error consultando respaldo para año ${ano}:`, err);
  }

  return [];
}

if (import.meta.main) {
  const argYear = Deno.args[0] ? parseInt(Deno.args[0], 10) : new Date().getFullYear();
  const anos = [argYear, argYear + 1];
  const todos: { fecha: string; nombre: string }[] = [];

  for (const y of anos) {
    console.log(`Descargando feriados para ${y}...`);
    const f = await obtenerFeriadosChile(y);
    todos.push(...f);
  }

  console.log(`Total feriados obtenidos: ${todos.length}`);
  const outPath = 'supabase/feriados.json';
  await Deno.writeTextFile(outPath, JSON.stringify(todos, null, 2));
  console.log(`Guardado en ${outPath}`);
}
