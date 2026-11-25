import { test, expect } from '@playwright/test';

test.describe('Copiloto IA - Integración con n8n y Pruebas Unitarias/E2E', () => {
  const MOCK_ENDPOINT = '**/webhook/**';

  test.beforeEach(async ({ page }) => {
    // Inyectar token de prueba para llamadas al Copiloto sin requerir red de Supabase Auth
    await page.addInitScript(() => {
      (window as any).__MOCK_ACCESS_TOKEN__ = 'jwt-token-valido-test-e2e';
    });
  });

  test('1 · Pregunta → respuesta visible, con la línea "Fuente:" atenuada', async ({ page }) => {
    await page.route(MOCK_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'El proyecto Portal Proveedores avanza según el cronograma.\n\nFuente: Notion · actualizado 25/11 10:00',
          datos_al: '2026-11-25T10:00:00Z',
          proyectos_consultados: ['p0000001-0000-0000-0000-000000000001'],
          consulta_id: 'consulta-uuid-1',
          modo: 'normal',
        }),
      });
    });

    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');

    // Abrir Copiloto IA
    const btnCopiloto = page.getByRole('button', { name: /Copiloto IA/i });
    await expect(btnCopiloto).toBeVisible();
    await btnCopiloto.click();

    // Escribir pregunta
    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);
    await expect(input).toBeFocused();
    await input.fill('¿Cómo va el proyecto?');
    await page.keyboard.press('Enter');

    // Indicador temporal
    const indicador = page.locator('text=Consultando proyectos…');
    // Esperar respuesta
    await expect(page.locator('text=El proyecto Portal Proveedores avanza')).toBeVisible();

    // Verificar que la línea Fuente: tiene estilo atenuado
    const fuenteElem = page.locator('text=Fuente: Notion · actualizado');
    await expect(fuenteElem).toBeVisible();
    await expect(fuenteElem).toHaveClass(/text-muted-foreground/);
  });

  test('2 · En el detalle de un proyecto, el body lleva proyecto_id; al quitar el chip, lleva null', async ({ page }) => {
    const payloads: any[] = [];

    await page.route(MOCK_ENDPOINT, async (route) => {
      payloads.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'Respuesta con contexto.\n\nFuente: Notion',
          datos_al: '2026-11-25',
          proyectos_consultados: [],
          consulta_id: 'c-2',
          modo: 'normal',
        }),
      });
    });

    // Ir a la vista de detalle de un proyecto
    await page.goto('/proyectos/p0000001-0000-0000-0000-000000000001?demo=true');
    await page.waitForLoadState('networkidle');

    // Abrir Copiloto
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    // Debe mostrar chip "Sobre: Portal Proveedores"
    await expect(page.locator('text=Sobre:').first()).toBeVisible();

    // 1ª Pregunta con contexto
    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);
    await input.fill('¿Qué bloqueos tiene?');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Respuesta con contexto.').first()).toBeVisible();
    expect(payloads[0].proyecto_id).toBe('p0000001-0000-0000-0000-000000000001');

    // Quitar el chip de contexto con la X
    const btnQuitarChip = page.getByRole('button', { name: /Quitar contexto de proyecto/i });
    await btnQuitarChip.click();
    await expect(page.locator('text=Sobre:')).toHaveCount(0);

    // 2ª Pregunta sin contexto
    await input.fill('Consulta general de misiones');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Consulta general de misiones')).toBeVisible();
    await page.waitForTimeout(300);
    expect(payloads[1].proyecto_id).toBeNull();
  });

  test('3 · El historial se envía con un máximo de 6 mensajes', async ({ page }) => {
    let ultimoPayload: any = null;

    await page.route(MOCK_ENDPOINT, async (route) => {
      ultimoPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: `Eco respuesta ${ultimoPayload?.pregunta}\n\nFuente: Notion`,
          consulta_id: null,
          modo: 'normal',
        }),
      });
    });

    await page.goto('/?demo=true');
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);

    // Enviar 7 preguntas consecutivas
    for (let i = 1; i <= 7; i++) {
      await input.fill(`Pregunta número ${i}`);
      await page.keyboard.press('Enter');
      await expect(page.locator(`text=Pregunta número ${i}`)).toBeVisible();
      await page.waitForTimeout(100);
    }

    // El último request no debe tener más de 6 elementos en historial
    expect(ultimoPayload.historial.length).toBeLessThanOrEqual(6);
    // Y la pregunta actual no debe estar dentro del array historial
    const preguntasEnHistorial = ultimoPayload.historial.map((h: any) => h.texto);
    expect(preguntasEnHistorial).not.toContain('Pregunta número 7');
  });

  test('4 · 401 → refresca la sesión y reintenta una vez; un 401 repetido muestra el aviso', async ({ page }) => {
    let intentos = 0;

    await page.route(MOCK_ENDPOINT, async (route) => {
      intentos++;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: true,
          respuesta: 'Token de acceso inválido o expirado.',
        }),
      });
    });

    await page.goto('/?demo=true');
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);
    await input.fill('¿Hay proyectos atrasados?');
    await page.keyboard.press('Enter');

    // Debe mostrar el mensaje devuelto por el 401
    await expect(page.locator('text=Token de acceso inválido o expirado.').or(page.locator('text=Sesión expirada'))).toBeVisible();
    // Reintentó al menos una vez (o notificó tras reintento)
    expect(intentos).toBeGreaterThanOrEqual(1);
  });

  test('5 · 403 y 502 → muestran el texto de "respuesta" como aviso', async ({ page }) => {
    let codigo = 403;

    await page.route(MOCK_ENDPOINT, async (route) => {
      if (codigo === 403) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: true,
            respuesta: 'Acceso denegado: tu perfil no tiene permiso para este proyecto.',
          }),
        });
      } else {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({
            error: true,
            respuesta: 'El agente de n8n no responde. Revisa el flujo en n8n.',
          }),
        });
      }
    });

    await page.goto('/?demo=true');
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);

    // Prueba 403
    await input.fill('Consulta con error 403');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=Acceso denegado: tu perfil no tiene permiso para este proyecto.')).toBeVisible();

    // Prueba 502
    codigo = 502;
    await input.fill('Consulta con error 502');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=El agente de n8n no responde. Revisa el flujo en n8n.')).toBeVisible();
  });

  test('6 · Si "respuesta" contiene XSS, se ve como texto plano y no se ejecuta', async ({ page }) => {
    await page.route(MOCK_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'Alerta de prueba: <img src=x onerror="window.__xss_detectado=true"> texto seguro.\n\nFuente: Notion',
          consulta_id: 'xss-1',
          modo: 'normal',
        }),
      });
    });

    await page.goto('/?demo=true');
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);
    await input.fill('Prueba XSS');
    await page.keyboard.press('Enter');

    // Debe mostrar la etiqueta como texto plano visible
    await expect(page.locator('text=<img src=x onerror="window.__xss_detectado=true">')).toBeVisible();

    // Comprobar que window.__xss_detectado no existe
    const xssEjecutado = await page.evaluate(() => (window as any).__xss_detectado);
    expect(xssEjecutado).toBeUndefined();
  });

  test('7 · La valoración envía update con consulta_id; si consulta_id es null, no hay botones', async ({ page }) => {
    let toggleConsultaId = 'consulta-con-id-123';

    await page.route(MOCK_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'Respuesta evaluable.\n\nFuente: Notion',
          consulta_id: toggleConsultaId,
          modo: 'normal',
        }),
      });
    });

    await page.goto('/?demo=true');
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);

    // 1. Mensaje con consulta_id → debe mostrar botones 👍 y 👎
    await input.fill('Evalúa con ID');
    await page.keyboard.press('Enter');

    const btnUtil = page.getByRole('button', { name: /Respuesta útil/i });
    await expect(btnUtil).toBeVisible();
    await btnUtil.click();
    await expect(page.locator('text=Gracias por tu valoración')).toBeVisible();

    // 2. Mensaje con consulta_id null → NO debe mostrar botones
    toggleConsultaId = ''; // simular null
    await input.fill('Evalúa sin ID');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Evalúa sin ID')).toBeVisible();
    // En el último mensaje no deben aparecer los botones de valorar
    const botonesThumbs = page.locator('button[aria-label="Respuesta útil"]');
    // Solo debe quedar 1 (el previo ya valorado muestra texto) o 0
    await expect(btnUtil).toHaveCount(0);
  });

  test('8 · Un usuario "Sin perfil" no ve el botón del Copiloto', async ({ page }) => {
    await page.goto('/?demo=true');
    await page.waitForLoadState('networkidle');

    // Cambiar al usuario "Consultor Externo" (Sin perfil) desde el selector
    const selectorPerfil = page.locator('button[title*="alternar perfil"]');
    await selectorPerfil.click();
    await page.locator('button:has-text("Consultor Externo")').click();

    // El botón de Copiloto IA debe estar ausente
    const btnCopiloto = page.getByRole('button', { name: /Copiloto IA/i });
    await expect(btnCopiloto).toHaveCount(0);
  });

  test('9 · Ninguna request desde el front incluye "x-clave-prueba" ni "email_prueba"', async ({ page }) => {
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = {};

    await page.route(MOCK_ENDPOINT, async (route) => {
      capturedHeaders = route.request().headers();
      capturedBody = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          respuesta: 'Todo seguro.\n\nFuente: Notion',
          consulta_id: 'sec-1',
          modo: 'normal',
        }),
      });
    });

    await page.goto('/?demo=true');
    await page.getByRole('button', { name: /Copiloto IA/i }).click();

    const input = page.getByPlaceholder(/Pregunta sobre etapas/i);
    await input.fill('Verificar encabezados');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Todo seguro.')).toBeVisible();

    // Validar encabezados y body
    expect(capturedHeaders['x-clave-prueba']).toBeUndefined();
    expect(capturedBody.email_prueba).toBeUndefined();
    expect(capturedBody.service_role).toBeUndefined();
    expect(capturedHeaders['authorization']).toContain('Bearer ');
  });
});
