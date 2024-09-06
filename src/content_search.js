import search from '@/modules/search/index.js';
import { renderContent } from '@/helpers/renderContent.js';

(async function () {
  console.log('rendering search');
  await renderContent(search);
  console.log('ended rendering search');
})();
