import list from '@/modules/list';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';

(async function () {
  const config = await getFullConfig();
  await renderContent(list, config);
})();
