import { useEffect, useRef, type RefObject } from 'react';

/**
 * Hook para calcular en cada frame la visibilidad de los labels proyectados 3D
 * según los HUDs montados actualmente.
 * NUNCA deja flags pegados; resetea y re-evalúa continuamente.
 */
export function useHideLabelsUnderHud(
  hudRefs: (RefObject<HTMLElement | null> | HTMLElement | null | string)[],
  nivel?: string
) {
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Limpieza inicial o al cambiar de nivel: restablecer todos los labels antes del loop
    const resetLabels = () => {
      const labels = document.querySelectorAll<HTMLElement>('[data-orbit-label="true"], [data-planet-chip="true"]');
      labels.forEach((label) => {
        label.style.opacity = '1';
        label.style.pointerEvents = 'auto';
      });
    };
    resetLabels();

    const checkCollisions = () => {
      // Obtener los rectángulos de todos los HUD visibles montados
      const hudRects: DOMRect[] = [];
      for (const item of hudRefs) {
        let el: HTMLElement | null = null;
        if (typeof item === 'string') {
          el = document.getElementById(item);
        } else if (item && 'current' in item) {
          el = item.current;
        } else if (item instanceof HTMLElement) {
          el = item;
        }

        if (el && el.offsetParent !== null && document.body.contains(el)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            hudRects.push(rect);
          }
        }
      }

      const labelElements = document.querySelectorAll<HTMLElement>('[data-orbit-label="true"], [data-planet-chip="true"]');
      const MARGIN = 8;

      labelElements.forEach((label) => {
        if (hudRects.length === 0) {
          label.style.opacity = '1';
          label.style.pointerEvents = 'auto';
          return;
        }

        const labelRect = label.getBoundingClientRect();
        if (labelRect.width === 0 && labelRect.height === 0) return;

        let collides = false;
        for (const hudRect of hudRects) {
          const overlaps = !(
            labelRect.right < hudRect.left - MARGIN ||
            labelRect.left > hudRect.right + MARGIN ||
            labelRect.bottom < hudRect.top - MARGIN ||
            labelRect.top > hudRect.bottom + MARGIN
          );

          if (overlaps) {
            collides = true;
            break;
          }
        }

        if (collides) {
          label.style.opacity = '0';
          label.style.pointerEvents = 'none';
        } else {
          label.style.opacity = '1';
          label.style.pointerEvents = 'auto';
        }
      });

      animFrameId.current = requestAnimationFrame(checkCollisions);
    };

    animFrameId.current = requestAnimationFrame(checkCollisions);

    return () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
      }
      resetLabels();
    };
  }, [hudRefs, nivel]);
}

