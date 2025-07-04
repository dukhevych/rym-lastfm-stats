import search from '@/modules/search';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';

(async function () {
  const config = await getFullConfig();
  await renderContent(search, config);
})();
