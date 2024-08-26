import * as utils from "@/helpers/utils.js";

export async function renderContent(module) {
  const config = await utils.getStorageItems();

  console.log('RYM Last.fm Stats config:', config);

  const renderPromises = [];
  const renderTargets = [];

  Object.keys(module).forEach((key) => {
    if (!config[key]) return;
    if (module[key].render) {
      renderPromises.push(module[key].render);
    }
    if (module[key].targetSelectors) {
      renderTargets.push(...module[key].targetSelectors);
    }
  });

  async function main() {
    const targetElementsExist = renderTargets.every((selector) => !!document.querySelector(selector));

    if (document.body && targetElementsExist) {
      Promise.all(renderPromises.map((render) => render(config)));
    } else {
      requestAnimationFrame(main);
    }
  }

  main();
}
