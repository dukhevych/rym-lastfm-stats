import profile from '@/modules/profile/index.js';
import { renderContent } from '@/helpers/renderContent.js';
import * as utils from '@/helpers/utils.js';

(async function () {
  await renderContent(profile, () => utils.isMyProfile());
})();
