export function withSvgAttrs(raw: string, attrs: Record<string, string> = {}): string {
  if (!raw) return raw;
  const match = raw.match(/<svg\b[^>]*>/i);
  if (!match) return raw;

  const opening = match[0];
  const start = match.index ?? 0;
  const end = start + opening.length;

  let newOpening = opening;

  // Merge class attribute specially
  if (typeof attrs.class === 'string' && attrs.class.trim()) {
    const classRe = /\bclass=("|')(.*?)(\1)/i;
    if (classRe.test(newOpening)) {
      newOpening = newOpening.replace(classRe, (_m, q, val) => `class=${q}${val} ${attrs.class}${q}`);
    } else {
      // insert before closing '>'
      newOpening = newOpening.replace(/>$/, ` class="${attrs.class}">`);
    }
  }

  // Apply other attributes (fill, width, height, etc.)
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') continue;
    const attrRe = new RegExp(`\\b${key}=("|')(.*?)(\\1)`, 'i');
    if (attrRe.test(newOpening)) {
      newOpening = newOpening.replace(attrRe, `${key}="$2"`);
    } else {
      newOpening = newOpening.replace(/>$/, ` ${key}="${val}">`);
    }
  }

  return raw.slice(0, start) + newOpening + raw.slice(end);
}

export function withSvgClass(raw: string, className?: string): string {
  if (!className) return raw;
  return withSvgAttrs(raw, { class: className });
}

