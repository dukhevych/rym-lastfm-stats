export function createSvgUse(symbolId, viewBox = '0 0 24 24') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');

  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${symbolId}`);
  svg.appendChild(use);

  return svg;
}

export function createElement(tag, classNames = [], attrs = {}, children = []) {
  const el = document.createElement(tag);

  if (typeof classNames === 'string') classNames = [classNames];
  el.classList.add(...classNames);

  Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));

  children.forEach(child => el.appendChild(child));

  return el;
}

export function setAttributes(el, attrs) {
  Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
}

export function appendMany(parent, children = []) {
  children.forEach(child => parent.appendChild(child));
  return parent;
}
