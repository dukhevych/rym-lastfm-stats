import sync from '@/modules/sync/index.js';
import { renderContent } from '@/helpers/renderContent.js';

(async function () {
  await renderContent(sync);
})();
