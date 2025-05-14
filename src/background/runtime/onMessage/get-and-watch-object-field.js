const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((message, sender) => {
  if (
    message?.type === "get-and-watch-object-field" &&
    sender.tab?.id &&
    typeof message.propName === "string" &&
    typeof message.fieldName === "string"
  ) {
    browserAPI.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: "MAIN",
      args: [message.propName, message.fieldName],
      func: (propName, fieldName) => {
        function dispatch(value) {
          window.dispatchEvent(new CustomEvent("my-extension:field-update", {
            detail: { prop: propName, field: fieldName, value }
          }));
        }

        const target = window[propName];
        if (!target || typeof target !== "object") return;

        let currentValue = target[fieldName];

        Object.defineProperty(target, fieldName, {
          configurable: true,
          enumerable: true,
          get() {
            return currentValue;
          },
          set(newVal) {
            currentValue = newVal;
            dispatch(newVal);
          }
        });

        if (currentValue !== undefined) {
          dispatch(currentValue);
        }
      }
    });
  }
});
