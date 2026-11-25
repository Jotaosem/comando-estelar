import { test, expect } from '@playwright/test';

test.describe('Validación Canónica - 12 Proyectos Reales / Fixture', () => {
  test('1 · Galaxia: se ven 12 planetas con su nombre', async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForTimeout(1000);

    // Los chips/planetas en la galaxia
    const chips = page.locator('[data-planet-chip="true"]');
    await expect(chips).toHaveCount(12);

    // Validar nombres de proyectos clave en las etiquetas
    await expect(page.locator('text=Portal Proveedores').first()).toBeVisible();
    await expect(page.locator('text=Módulo Cripto Custodia').first()).toBeVisible();
    await expect(page.locator('text=Automatización Facturación').first()).toBeVisible();
  });

  test('2 · Integridad: ningún texto en pantalla coincide con /^[0-9A-F]{8}$/', async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForTimeout(800);

    const textNodes = await page.evaluate(() => {
      const texts: string[] = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walk.nextNode())) {
        const val = node.nodeValue?.trim();
        if (val) texts.push(val);
      }
      return texts;
    });

    const coincidenciasHex = textNodes.filter((t) => /^[0-9A-F]{8}$/.test(t));
    expect(coincidenciasHex).toHaveLength(0);
  });

  test('3 · Tabla: muestra fases distintas', async ({ page }) => {
    await page.goto('/?demo=true&vista=tabla');
    await page.waitForTimeout(800);

    const tabla = page.locator('table');
    await expect(tabla).toBeVisible();

    const fasesEsperadas = ['Ejecución', 'Discovery', 'Diseño', 'Seguimiento', 'Cerrado', 'Pausado', 'Cancelado', 'Idea'];
    for (const fase of fasesEsperadas) {
      const match = page.locator(`table span:text-is("${fase}")`).first();
      await expect(match).toBeVisible();
    }
  });

  test('4 · Cancelado: el proyecto cancelado dice "Cancelado"', async ({ page }) => {
    await page.goto('/?demo=true&vista=tabla');
    await page.waitForTimeout(800);

    const canceladoBadge = page.locator('table span:text-is("Cancelado")');
    await expect(canceladoBadge.first()).toBeVisible();
  });

  test('5 · Atraso: el atraso de un proyecto atrasado es mayor que 0', async ({ page }) => {
    await page.goto('/?demo=true&vista=tabla');
    await page.waitForTimeout(800);

    // Portal Proveedores tiene atraso_dh: 7
    const atrasoPositivo = page.locator('table td:has-text("+7 dh"), table td:has-text("+12 dh")');
    await expect(atrasoPositivo.first()).toBeVisible();
  });

  test('6 · Contador: separa activas y cerradas ("N activas · M cerradas")', async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForTimeout(800);

    const contador = page.locator('text=/\\d+\\s+activas\\s+·\\s+\\d+\\s+cerradas/');
    await expect(contador.first()).toBeVisible();
    await expect(contador.first()).toHaveText(/10 activas · 2 cerradas/);
  });
});
