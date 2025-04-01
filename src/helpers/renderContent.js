export async function renderContent(module, config, userName) {
  const renderPromises = [];
  const renderTargets = [];

  Object.keys(module).forEach((key) => {
    if ([null, 0, false].includes(config[key])) return;
    if (module[key].render) {
      renderPromises.push(module[key].render);
    }
    if (module[key].targetSelectors) {
      renderTargets.push(...module[key].targetSelectors);
    }
  });

  function main() {
    const targetElementsExist = renderTargets.every(
      (selector) => !!document.querySelector(selector),
    );

    if (document.body && targetElementsExist) {
      Promise.all(renderPromises.map((render) => render(config, userName)));
    } else {
      requestAnimationFrame(main);
    }
  }

  main();
}
