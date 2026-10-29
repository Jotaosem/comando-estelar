import { test, expect } from '@playwright/test';

test.describe('Mission Control - Semantic Galaxy 2.5D Validation', () => {
  test('Desktop 1366x768 - Breadcrumb, MapControls and Search', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('http://localhost:5173/');

    // 1. Breadcrumb en nivel galaxia muestra solo GALAXIA
    const breadcrumb = page.locator('header').first();
    await expect(page.getByText('GALAXIA')).toBeVisible();

    // 2. Buscador visible con atajo
    const searchInput = page.getByPlaceholder(/Buscar proyecto/i);
    await expect(searchInput).toBeVisible();

    // 3. Minimapa visible
    const minimap = page.locator('.hud-glass').filter({ hasText: 'RADAR 2.5D' });
    await expect(minimap).toBeVisible();

    // Screenshot inicial
    await page.screenshot({ path: 'screenshot-desktop-1366x768-galaxy.png' });
  });

  test('Mobile 390x844 - Viewport and Overlays', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/');

    await expect(page.getByText('GALAXIA')).toBeVisible();
    await page.screenshot({ path: 'screenshot-mobile-390x844-galaxy.png' });
  });
});
