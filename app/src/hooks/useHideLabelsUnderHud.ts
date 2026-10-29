import { useEffect, useRef, type RefObject } from 'react';

/**
 * Hook para ocultar (opacity 0, pointer-events none) los labels proyectados 3D
 * cuyo bounding rect o punto proyectado caiga dentro del getBoundingClientRect
 * de cualquiera de los contenedores HUD visibles + 8px de margen de seguridad.
 */
export function useHideLabelsUnderHud(hudRefs: (RefObject<HTMLElement | null> | HTMLElement | null | string)[]) {
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const checkCollisions = () => {
      // Obtener los rectángulos de todos los HUD visibles
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

        if (el && el.offsetParent !== null) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            hudRects.push(rect);
          }
        }
      }

      if (hudRects.length > 0) {
        // Encontrar todos los contenedores de etiquetas 3D proyectadas
        const labelElements = document.querySelectorAll<HTMLElement>('[data-orbit-label="true"], [data-planet-chip="true"]');
        const MARGIN = 8;

        labelElements.forEach((label) => {
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
          }
        });
      }

      animFrameId.current = requestAnimationFrame(checkCollisions);
    };

    animFrameId.current = requestAnimationFrame(checkCollisions);

    return () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [hudRefs]);
}
