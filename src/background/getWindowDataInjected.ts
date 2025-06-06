export default function getWindowDataInjected(
  propName,
  deepPaths,
  slug,
  watch = false,
  deep = false,
) {
  function dispatch(field, value) {
    const eventName = `${slug}:field-update`;
    const event = new CustomEvent(eventName, {
      detail: { prop: propName, field, value }
    });
    window.dispatchEvent(event);
  }

  const base = window[propName];

  if (!base || typeof base !== "object") return;

  if (!deepPaths || !Array.isArray(deepPaths) || deepPaths.length === 0) {
    dispatch(null, base);
    return;
  }

  for (const fullPath of deepPaths) {
    const pathParts = fullPath.split('.');
    let target = base;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) {
        return;
      }
      target = target[pathParts[i]];
    }

    const lastKey = pathParts[pathParts.length - 1];
    if (!target || typeof target !== "object") {
      return;
    }

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
        set(newVal) {
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

function createWatchedProxy(obj, notify, path = []) {
  return new Proxy(obj, {
    set(target, key, value) {
      target[key] = value;
      notify([...path, key].join('.'), value);
      return true;
    },
    get(target, key) {
      const val = target[key];
      if (typeof val === 'object' && val !== null) {
        return createWatchedProxy(val, notify, [...path, key]);
      }
      return val;
    }
  });
}
