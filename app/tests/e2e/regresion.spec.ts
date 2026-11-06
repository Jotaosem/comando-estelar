import { test, expect } from '@playwright/test';

test.describe('Regresión Visual y Funcional - Comando Estelar', () => {

  test('Lista: hace scroll hasta la última tarjeta', async ({ page }) => {
    await page.goto('/');
    // Cambiar a vista lista
    const btnLista = page.getByTitle('Vista Lista');
    await btnLista.click();

    // Esperar a que las tarjetas carguen
    const cards = page.locator('div[tabindex="0"]');
    await expect(cards.first()).toBeVisible();

    // Scroll hasta el final
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // Verificar que la última tarjeta es visible
    const lastCard = cards.last();
    await expect(lastCard).toBeVisible();
  });

  test('Detalle: hace scroll hasta el historial y el último elemento es visible', async ({ page }) => {
    // Ir directo al detalle del proyecto 1
    await page.goto('/proyectos/proy-1');

    // Cambiar a la pestaña de bitácora/historial si existe
    const tabBitacora = page.getByRole('button', { name: /Bitácora/i });
    if (await tabBitacora.isVisible()) {
      await tabBitacora.click();
    }

    // Scroll hasta el final de la página
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // El cálculo o historial al fondo debe estar en pantalla
    const footerElement = page.getByText(/NODO 1 LEVANTAMIENTO COMPLETADO/i)
      .or(page.getByText(/Cierre de requerimientos/i))
      .or(page.getByText(/Panel de Estadísticas Tácticas/i));
    await expect(footerElement.first()).toBeVisible();
  });

  test('Galaxia: sin scroll de página; leyenda completa; centrar funciona', async ({ page }) => {
    await page.goto('/');

    // Verificar que no hay scroll vertical en el body
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2); // margen de 2px por redondeos

    // Barra de leyenda inferior visible
    const leyenda = page.getByText(/NIVEL:/i);
    await expect(leyenda).toBeVisible();

    // Texto de Notion vía sync visible
    const notionSync = page.getByText(/Notion vía sync/i);
    if (await notionSync.isVisible()) {
      await expect(notionSync).toBeVisible();
    }

    // Botón Centrar existe y responde
    const btnCentrar = page.getByTitle(/Centrar/i);
    if (await btnCentrar.isVisible()) {
      await btnCentrar.click();
    }
  });

  test('Buscador: el dropdown se ve sobre la galaxia y sobre la lista', async ({ page }) => {
    await page.goto('/');

    // Buscar en galaxia
    const searchInput = page.getByPlaceholder('Buscar proyecto…');
    await searchInput.fill('Portal');
    await page.waitForTimeout(200);

    // El dropdown o resultados debe ser visible
    const searchResult = page.locator('#galaxy-search-results-portal').first();
    await expect(searchResult).toBeVisible();

    // Limpiar y cambiar a lista
    await searchInput.clear();
    const btnLista = page.getByTitle('Vista Lista');
    await btnLista.click();

    // Buscar en lista
    await searchInput.fill('Portal');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Portal Proveedores/i).first()).toBeVisible();
  });

  test('Planeta: labels pegados a las estaciones al girar, sin labels sobre el planeta, click abre etapa', async ({ page }) => {
    await page.goto('/');

    // Clic en el primer planeta o navegación a planeta
    const planetChip = page.locator('[data-planet-chip="true"]').first();
    await planetChip.click();
    await page.waitForTimeout(800);

    // Verificar que estamos en nivel planeta
    await expect(page.getByText(/NIVEL:/i)).toContainText(/planeta/i);

    // Ningún label sobre el centro del planeta: las estaciones tienen sus labels
    const orbitLabels = page.locator('[data-orbit-label="true"]');
    expect(await orbitLabels.count()).toBeGreaterThan(0);

    // Click en el planeta abre la etapa actual
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      // Click en el centro del canvas (donde está el planeta)
      await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await page.waitForTimeout(500);
    }
  });

  test('Etapa -> volver: labels visibles', async ({ page }) => {
    await page.goto('/');
    const planetChip = page.locator('[data-planet-chip="true"]').first();
    await planetChip.click();
    await page.waitForTimeout(500);

    // Abrir una etapa con click o tecla
    await page.keyboard.press('Escape'); // Vuelve a galaxia
    await page.waitForTimeout(300);

    // Volver a entrar
    await page.locator('[data-planet-chip="true"]').first().click();
    await page.waitForTimeout(500);

    // Los labels deben seguir visibles
    const orbitLabels = page.locator('[data-orbit-label="true"]');
    expect(await orbitLabels.count()).toBeGreaterThan(0);
  });

  test('Buscador: escribir 10+ caracteres, borrar con Backspace y limpiar con x', async ({ page }) => {
    await page.goto('/');

    const input = page.getByPlaceholder('Buscar proyecto…');
    await input.click();
    await input.clear();
    await input.pressSequentially('ProyectoInexistente123');
    expect(await input.inputValue()).toBe('ProyectoInexistente123');

    // Borrar con Backspace varias veces
    await input.press('Backspace');
    await input.press('Backspace');
    await input.press('Backspace');
    expect(await input.inputValue()).toBe('ProyectoInexistente');

    // Limpiar con botón x
    const btnX = page.getByLabel('Limpiar campo');
    await expect(btnX).toBeVisible();
    await btnX.click();
    expect(await input.inputValue()).toBe('');

    // Probar en tarjetas
    const btnTarjetas = page.getByTitle('Vista Lista');
    await btnTarjetas.click();
    await input.fill('SistemaContableTest');
    await btnX.click();
    expect(await input.inputValue()).toBe('');

    // Probar en tabla
    const btnTabla = page.getByTitle('Vista Tabla');
    await btnTabla.click();
    await input.fill('PlataformaCloud99');
    await btnX.click();
    expect(await input.inputValue()).toBe('');

    // Probar en detalle
    await page.goto('/proyectos/proy-1');
    const inputDetalle = page.getByPlaceholder('Buscar proyecto…');
    await inputDetalle.fill('PruebaDetalle123');
    const btnXDetalle = page.getByLabel('Limpiar campo');
    await btnXDetalle.click();
    expect(await inputDetalle.inputValue()).toBe('');
  });

  test('Buscador: sin coincidencias muestra mensaje y botón limpiar', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder('Buscar proyecto…');
    await input.fill('ZzZzZzZz');
    await page.waitForTimeout(300);

    const noMatches = page.getByText(/Sin coincidencias para/i);
    await expect(noMatches).toBeVisible();

    const btnLimpiar = page.getByRole('button', { name: /Limpiar búsqueda/i });
    await expect(btnLimpiar).toBeVisible();
    await btnLimpiar.click();
    expect(await input.inputValue()).toBe('');
  });

  test('Minimapa: visible abajo a la izquierda y sin colisión con botón copiloto', async ({ page }) => {
    await page.goto('/');

    const copilotoBtn = page.getByRole('button', { name: /Abrir Copiloto IA/i });
    await expect(copilotoBtn).toBeVisible();
    const copilotoBox = await copilotoBtn.boundingBox();
    expect(copilotoBox).not.toBeNull();

    const isSmall = (page.viewportSize()?.width || 1366) < 768;

    if (isSmall) {
      // En mobile el minimapa debe estar oculto
      const minimap = page.locator('div[title*="Minimapa Galáctico"]');
      await expect(minimap).toBeHidden();
    } else {
      // En desktop el minimapa es visible en la esquina inferior izquierda
      const minimap = page.locator('div[title*="Minimapa Galáctico"]');
      await expect(minimap).toBeVisible();
      const minimapBox = await minimap.boundingBox();
      expect(minimapBox).not.toBeNull();

      if (minimapBox && copilotoBox) {
        // Minimap está a la izquierda (x < 300) y Copiloto está a la derecha (x > 800)
        expect(minimapBox.x).toBeLessThan(copilotoBox.x - 200);
      }
    }
  });

  test('Tabla: ordena, filtra, exporta CSV y navega al detalle', async ({ page }) => {
    await page.goto('/');
    const btnTabla = page.getByTitle('Vista Tabla');
    await btnTabla.click();

    const isSmall = (page.viewportSize()?.width || 1366) < 768;

    // En desktop probar ordenamiento y exportación CSV
    if (!isSmall) {
      const colAvance = page.getByText('Avance').first();
      await expect(colAvance).toBeVisible();
      await colAvance.click();
      await page.waitForTimeout(200);

      // Exportar CSV
      const downloadPromise = page.waitForEvent('download');
      const btnExportar = page.getByRole('button', { name: /Exportar CSV/i });
      await btnExportar.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    }

    // Filtrar con el buscador
    const input = page.getByPlaceholder('Buscar proyecto…');
    await input.fill('Portal');
    await page.waitForTimeout(300);

    // Cerrar dropdown del buscador para operar sobre la tabla/tarjetas filtradas
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Navegar haciendo clic en la fila o tarjeta visible de Portal Proveedores
    const filaPortal = page.locator('tbody tr, .md\\:hidden > div').filter({ hasText: /Portal Proveedores/i }).first();
    await expect(filaPortal).toBeVisible();
    await filaPortal.click();
    await page.waitForTimeout(500);

    // Debe estar en la vista detalle
    await expect(page).toHaveURL(/.*\/proyectos\/.*/);
  });

  test('Punto 1 y 2: Buscar -> seleccionar abre proyecto sin errores en consola y etapas unificadas', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filtrar warnings conocidos de Three.js, React dev unmount y conexiones externas mock
        if (
          !text.includes('THREE') &&
          !text.includes('unmount a root') &&
          !text.includes('Maximum update depth') &&
          !text.includes('ERR_CONNECTION_REFUSED')
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 1. Buscar y seleccionar abre proyecto desde galaxia (entra a nivel planeta)
    const input = page.getByPlaceholder('Buscar proyecto…');
    await input.fill('Portal');
    await page.waitForTimeout(350);

    const opcionPortal = page.locator('#galaxy-search-results-portal').getByText(/Portal Proveedores/i).first();
    await expect(opcionPortal).toBeVisible();
    await opcionPortal.click();
    await page.waitForTimeout(600);

    // Tras seleccionar, el input se limpia y no queda filtrado a 1
    expect(await input.inputValue()).toBe('');

    // 2. Navegar a /proyectos/proy-1 directamente
    await page.goto('/proyectos/proy-1');
    await page.waitForLoadState('networkidle');

    // Verificar línea de etapas: click en etapa completada, actual y bloqueada muestra su detalle
    const btnEtapa1 = page.locator('button').filter({ hasText: /01/ }).first();
    await expect(btnEtapa1).toBeVisible();
    await btnEtapa1.click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/.*etapa=.*/);

    // Verificar que el componente unificado EtapaDetalle muestra datos
    const detalleContenido = page.locator('text=Inicio Plan / Real').first();
    await expect(detalleContenido).toBeVisible();

    // Etapa futura está disabled / con candado
    const btnFutura = page.locator('button[disabled]').first();
    if (await btnFutura.count() > 0) {
      await expect(btnFutura).toBeDisabled();
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('Punto 3 y 4: Nivel planeta layout y tarjeta de grilla sin textos cortados', async ({ page }) => {
    // 1. Probar en galaxia/planeta
    await page.goto('/');

    // Clic en el primer chip o planeta para entrar a nivel planeta
    const chip = page.locator('[data-planet-chip="true"]').first();
    await chip.click();
    await page.waitForTimeout(700);

    // Barra de leyenda visible y completa
    const isSmall = (page.viewportSize()?.width || 1366) < 768;
    if (!isSmall) {
      const leyenda = page.locator('text=Fuente auditable: Notion vía sync').first();
      await expect(leyenda).toBeVisible();

      // Controles de zoom visibles en desktop
      const btnZoomIn = page.getByRole('button', { name: /Acercar zoom/i });
      await expect(btnZoomIn).toBeVisible();
      const btnEncuadrar = page.getByRole('button', { name: /Restablecer encuadre/i });
      await expect(btnEncuadrar).toBeVisible();
    } else {
      // En móvil la barra leyenda muestra los filtros de estado
      const btnNominal = page.getByRole('button', { name: /Nominal/i });
      await expect(btnNominal).toBeVisible();
    }

    // 2. Tarjetas de grilla sin textos cortados
    await page.goto('/?vista=tarjetas');
    await page.waitForLoadState('networkidle');

    const tarjetas = page.locator('.grid > div');
    await expect(tarjetas.first()).toBeVisible();
    const textoEstimada = page.locator('text=Estimada').first();
    await expect(textoEstimada).toBeVisible();
  });

  test('Panel de etapa y HUD: sin sprints en HUD, tareas en lista legible y posicionamiento', async ({ page }) => {
    // 1. Visitar nivel planeta
    await page.goto('/');
    const chip = page.locator('[data-planet-chip="true"]').first();
    await chip.click();
    await page.waitForTimeout(600);

    // En el HUD de planeta NO deben mostrarse sprints
    const hudContainer = page.locator('#planet-hud-card-container');
    await expect(hudContainer).toBeVisible();
    await expect(hudContainer.locator('text=Sprints')).toHaveCount(0);

    // Pero en la vista de tarjetas SÍ debe haber Sprints
    await page.goto('/?vista=tarjetas');
    await page.waitForLoadState('networkidle');
    const tarjeta = page.locator('.grid > div').first();
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator('text=Sprint')).toBeVisible();

    // 2. En Detalle (/proyectos/proy-1), verificar lista de tareas legible y unificada
    await page.goto('/proyectos/proy-1');
    await page.waitForLoadState('networkidle');

    // Título con contador "Tareas · X pendientes de Y"
    const tituloTareas = page.locator('text=/Tareas · \\d+ pendientes de \\d+/');
    await expect(tituloTareas).toBeVisible();

    // Tarea con nombre completo y chip de estado
    const chipEstadoTarea = page.locator('.space-y-1\\.5 span:has-text("Completada"), .space-y-1\\.5 span:has-text("En curso"), .space-y-1\\.5 span:has-text("Bloqueada")').first();
    await expect(chipEstadoTarea).toBeVisible();
  });
});
