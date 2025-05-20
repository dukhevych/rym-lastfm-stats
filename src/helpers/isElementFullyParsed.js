export default function isElementFullyParsed(el) {
  if (!el || !(el instanceof Element)) return false;

  let current = el;

  while (current && current !== document.body) {
    if (current.nextElementSibling) {
      return true;
    }
    current = current.parentElement;
  }

  return current === document.body;
}
