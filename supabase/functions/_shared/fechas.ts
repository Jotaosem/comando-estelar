/**
 * _shared/fechas.ts
 * Funciones puras para cálculo de días hábiles y fechas en Chile.
 * Fechas en formato YYYY-MM-DD.
 */

export function parseFechaISO(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number);
  // Usamos medianoche UTC para evitar desfases de horario
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function formatFechaISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function esHabil(f: string, feriados: Set<string>): boolean {
  const date = parseFechaISO(f);
  const diaSemana = date.getUTCDay(); // 0 domingo, 6 sábado
  if (diaSemana === 0 || diaSemana === 6) {
    return false;
  }
  return !feriados.has(f);
}

export function siguienteHabil(f: string, feriados: Set<string>): string {
  let curr = f;
  while (!esHabil(curr, feriados)) {
    const d = parseFechaISO(curr);
    d.setUTCDate(d.getUTCDate() + 1);
    curr = formatFechaISO(d);
  }
  return curr;
}

/**
 * Cantidad de días hábiles en el intervalo (a, b]; 0 si b <= a.
 */
export function diasHabilesEntre(a: string, b: string, feriados: Set<string>): number {
  if (b <= a) {
    return 0;
  }
  let count = 0;
  let curr = a;
  while (curr < b) {
    const d = parseFechaISO(curr);
    d.setUTCDate(d.getUTCDate() + 1);
    curr = formatFechaISO(d);
    if (esHabil(curr, feriados)) {
      count++;
    }
  }
  return count;
}

/**
 * Avanza n días hábiles desde f (si n=0 -> f).
 */
export function sumarDiasHabiles(f: string, n: number, feriados: Set<string>): string {
  if (n <= 0) {
    return f;
  }
  let curr = f;
  let restantes = n;
  while (restantes > 0) {
    const d = parseFechaISO(curr);
    d.setUTCDate(d.getUTCDate() + 1);
    curr = formatFechaISO(d);
    if (esHabil(curr, feriados)) {
      restantes--;
    }
  }
  return curr;
}
