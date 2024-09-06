import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';

export async function renderContent(module) {
  const storageItems = await utils.getStorageItems();

  const config = Object.assign({}, constants.OPTIONS_DEFAULT, storageItems);

  console.log('RYM Last.fm Stats config:', config);
  console.log('module', module);

  const renderPromises = [];
  const renderTargets = [];

  Object.keys(module).forEach((key) => {
    console.log(key);
    console.log(module[key].render);
    if (!config[key]) return;
    if (module[key].render) {
      renderPromises.push(module[key].render);
    }
    if (module[key].targetSelectors) {
      renderTargets.push(...module[key].targetSelectors);
    }
  });

  console.log('renderPromises', renderPromises.length);
  console.log('renderTargets', renderTargets.length);

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
