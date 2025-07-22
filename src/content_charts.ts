import charts from '@/modules/charts';
import { renderContent } from '@/helpers/renderContent';
import { getFullConfig } from '@/helpers/storageUtils';

(async function () {
  const config = await getFullConfig();
  await renderContent(charts, config, 'charts');
})();
