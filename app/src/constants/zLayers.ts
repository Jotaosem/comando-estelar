/**
 * Constantes de capas de z-index de la aplicación.
 * Orden de capas:
 * canvas (0) < labels 3D (<=20) < HUD (40) < popovers/dropdown (50) < modales/toasts (60)
 */

export const Z_LAYERS = {
  CANVAS: 0,
  LABELS_3D: [20, 0] as [number, number],
  HUD: 40,
  POPOVER_DROPDOWN: 50,
  MODAL_TOAST: 60,
} as const;
