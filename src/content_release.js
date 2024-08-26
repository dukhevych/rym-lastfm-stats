import release from "@/modules/release/index.js";
import { renderContent } from "@/helpers/renderContent.js";

(async function () {
  await renderContent(release);
})();
