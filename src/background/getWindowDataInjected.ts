type AnyObject = { [key: string | symbol]: any };
type NotifyFn = (path: string, value: any) => void;

export default function getWindowDataInjected(
  propName: string,
  deepPaths: string[] | undefined,
  slug: string,
  watch = false,
  deep = false
): void {
  function dispatch(field: string | null, value: any): void {
    const eventName = `${slug}:field-update`;
    const event = new CustomEvent(eventName, {
      detail: { prop: propName, field, value }
    });
    window.dispatchEvent(event);
  }

  const base = (window as AnyObject)[propName];
  if (!base || typeof base !== 'object') return;

  if (!deepPaths || !Array.isArray(deepPaths) || deepPaths.length === 0) {
    dispatch(null, base);
    return;
  }

  for (const fullPath of deepPaths) {
    const pathParts = fullPath.split('.');
    let target: any = base;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) return;
      target = target[pathParts[i]];
    }

    const lastKey = pathParts[pathParts.length - 1];
    if (!target || typeof target !== 'object') return;

    let currentValue = target[lastKey];
    dispatch(fullPath, currentValue);

    if (watch) {
      if (deep && typeof currentValue === 'object' && currentValue !== null) {
        currentValue = createWatchedProxy(currentValue, (subPath, val) => {
          dispatch(`${fullPath}.${subPath}`, val);
        });
      }

      Object.defineProperty(target, lastKey, {
        configurable: true,
        enumerable: true,
        get() {
          return currentValue;
        },
        set(newVal: any) {
          if (deep && typeof newVal === 'object' && newVal !== null) {
            newVal = createWatchedProxy(newVal, (subPath, val) => {
              dispatch(`${fullPath}.${subPath}`, val);
            });
          }
          currentValue = newVal;
          dispatch(fullPath, newVal);
        }
      });
    }
  }
}

function createWatchedProxy(obj: AnyObject, notify: NotifyFn, path: string[] = []): AnyObject {
  return new Proxy(obj, {
    set(target, key, value) {
      if (typeof key === 'symbol') return false;
      target[key] = value;
      notify([...path, key].join('.'), value);
      return true;
    },
    get(target, key) {
      if (typeof key === 'symbol') return target[key]; // no TS error now
      const val = target[key];
      if (typeof val === 'object' && val !== null) {
        return createWatchedProxy(val, notify, [...path, key]);
      }
      return val;
    }
  });
}
