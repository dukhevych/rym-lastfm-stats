export default function isElementFullyParsed(el: Element | null | undefined): boolean {
  if (!el || !(el instanceof Element)) return false;

  let current: Element | null = el;

  while (current && current !== document.body) {
    if (current.nextElementSibling) {
      return true;
    }
    current = current.parentElement;
  }

  return current === document.body;
}
