/**
 * Constantes de capas de z-index y zonas seguras de la aplicación.
 * Orden de capas:
 * canvas (0) < labels 3D (<=20) < minimap (30) < HUD (40) < popovers/dropdown (50) < modales/toasts (60)
 */

export const Z_LAYERS = {
  CANVAS: 0,
  LABELS_3D: [20, 0] as [number, number],
  MINIMAP: 30,
  HUD: 40,
  COPILOTO_BTN: 40,
  POPOVER_DROPDOWN: 50,
  COPILOTO_PANEL: 50,
  MODAL_TOAST: 60,
} as const;

export const SAFE_ZONES = {
  // Zona segura para botón copiloto abajo a la derecha
  COPILOTO: {
    bottom: 24, // 1.5rem (bottom-6)
    right: 24,  // 1.5rem (right-6)
    width: 140, // aprox ancho del botón desplegado
    height: 48,
    clearanceBottom: 96, // margen para scroll/overlays
  },
  // Minimapa abajo a la izquierda, sobre la barra de leyenda (40px + 16px = 56px)
  MINIMAP: {
    bottom: 56, // 40px barra de leyenda + 16px margen
    left: 16,   // 16px margen
    width: 160,
    height: 100,
  },
} as const;
