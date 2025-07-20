export function waitForDOMReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      return resolve(undefined);
    }

    const check = () => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        resolve(undefined);
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  });
}

export interface CheckDOMConditionOptions {
  targetSelectors: string[];
  conditionCallback?: () => any;
}

export async function checkDOMCondition(
  targetSelectors: string[],
  conditionCallback?: () => any
): Promise<any> {
  return new Promise((resolve) => {
    function _() {
      const targetElementsExist = targetSelectors.every(
        (selector) => !!document.querySelector(selector),
      );

      if (document.body && targetElementsExist) {
        resolve(conditionCallback?.());
      } else {
        requestAnimationFrame(_);
      }
    }
    _();
  });
}

export function getDirectInnerText(element: Element | null): string {
  if (!element) return '';

  return Array.from(element.childNodes)
    .filter((node: ChildNode) => node.nodeType === Node.TEXT_NODE)
    .map((node: ChildNode) => (node.textContent ?? '').trim())
    .join(' ')
    .trim();
};

export interface CreateElementProps {
  style?: Partial<CSSStyleDeclaration>;
  className?: string | string[];
  dataset?: { [key: string]: string };
  [key: string]: any;
}

export type Child = Node | string | number | boolean | null | undefined;
export type Children = Child | Child[];

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: CreateElementProps,
  ...children: Children[]
): HTMLElementTagNameMap[K];

export function createElement(
  tag: string,
  props?: CreateElementProps,
  ...children: Children[]
): HTMLElement;

export function createElement(
  tag: string,
  props: CreateElementProps = {},
  ...children: Children[]
): HTMLElement {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'className') {
      if (Array.isArray(value)) el.classList.add(...value);
      else el.classList.add(...value.trim().split(/\s+/)); // handles 'foo bar'
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        el.dataset[dataKey] = dataValue != null ? String(dataValue) : undefined;
      }
    } else if (key in el) {
      (el as any)[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children.flat()) {
    if (child == null) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return el;
}

type InsertionPosition =
  | 'beforebegin' // insert before targetEl
  | 'afterbegin'  // insert inside targetEl, before first child
  | 'beforeend'   // insert inside targetEl, after last child
  | 'afterend'    // insert after targetEl
  | 'append'      // alias for appendChild
  | 'prepend'     // alias for prepend
  | 'replace';    // replace targetEl entirely

interface InsertElementOptions {
  target: Element;
  element: Element;
  position: InsertionPosition;
}

export function insertElement({ target, element, position }: InsertElementOptions): void {
  switch (position) {
    case 'beforebegin':
    case 'afterbegin':
    case 'beforeend':
    case 'afterend':
      target.insertAdjacentElement(position, element);
      break;

    case 'append':
      target.appendChild(element);
      break;

    case 'prepend':
      target.insertBefore(element, target.firstChild);
      break;

    case 'replace':
      target.replaceWith(element);
      break;

    default:
      throw new Error(`Unknown insertion position: ${position}`);
  }
}