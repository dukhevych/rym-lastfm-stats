import profile from '@/modules/profile/index.js';
import { renderContent } from '@/helpers/renderContent.js';

(async function () {
  await renderContent(profile);
})();
