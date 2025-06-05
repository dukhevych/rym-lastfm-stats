// ✅ FIXED: use "import * as" to import both type + runtime-compatible reference
declare module 'webextension-polyfill' {
  import * as browser from 'firefox-webext-browser';
  export default browser;
}
