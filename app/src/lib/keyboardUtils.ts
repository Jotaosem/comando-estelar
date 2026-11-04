/**
 * Determina si un evento de teclado proviene de un elemento editable (input, textarea, etc.)
 * para evitar que atajos o navegación 3D capturen teclas como flechas, Backspace o Delete.
 */
export function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable ||
    el.getAttribute('role') === 'textbox'
  );
}

