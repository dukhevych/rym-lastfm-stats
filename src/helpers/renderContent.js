import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';

export async function renderContent(module) {
  const storageItems = await utils.getSyncedOptions();

  const config = Object.assign({}, constants.OPTIONS_DEFAULT, storageItems);

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

  async function main() {
    const targetElementsExist = renderTargets.every(
      (selector) => !!document.querySelector(selector),
    );

    if (document.body && targetElementsExist) {
      Promise.all(renderPromises.map((render) => render(config)));
    } else {
      requestAnimationFrame(main);
    }
  }

  main();
}
