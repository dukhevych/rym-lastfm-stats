<script lang="ts">
import browser from 'webextension-polyfill';

import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';

const appVersion = process.env.APP_VERSION!;

const feedbackUrl = $derived(() => {
  if (browserName === 'firefox') {
    return 'https://addons.mozilla.org/en-US/firefox/addon/rym-last-fm-stats/';
  }
  return 'https://chromewebstore.google.com/detail/rym-lastfm-stats/bckjjmcflcmmcnlogmgogofcmldpcgpk/reviews';
});

const reportIssueUrl = $derived(() => {
  const baseUrl = 'https://github.com/dukhevych/rym-lastfm-stats/issues/new';

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    browser: navigator.userAgent,
    'extension-version': browser.runtime.getManifest().version,
  });

  return `${baseUrl}?${params.toString()}`;
});

let browserName = $state<'firefox' | 'chrome' | 'other'>();
const slogan = $derived(
  () =>
    constants.SLOGAN_VARIANTS[
      Math.floor(Math.random() * constants.SLOGAN_VARIANTS.length)
    ],
);

async function init() {
  browserName = await utils.detectBrowser();
}

init();
</script>

{#snippet iconBug(classes = '')}
  <svg
    class="h-4 w-4 {classes}"
    width="800px"
    height="800px"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.416 2.62412C17.7607 2.39435 17.8538 1.9287 17.624 1.58405C17.3943 1.23941 16.9286 1.14628 16.584 1.37604L13.6687 3.31955C13.1527 3.11343 12.5897 3.00006 12.0001 3.00006C11.4105 3.00006 10.8474 3.11345 10.3314 3.31962L7.41603 1.37604C7.07138 1.14628 6.60573 1.23941 6.37596 1.58405C6.1462 1.9287 6.23933 2.39435 6.58397 2.62412L8.9437 4.19727C8.24831 4.84109 7.75664 5.70181 7.57617 6.6719C8.01128 6.55973 8.46749 6.50006 8.93763 6.50006H15.0626C15.5328 6.50006 15.989 6.55973 16.4241 6.6719C16.2436 5.70176 15.7519 4.841 15.0564 4.19717L17.416 2.62412Z"
      fill="currentColor"
    />
    <path
      d="M1.25 14.0001C1.25 13.5859 1.58579 13.2501 2 13.2501H5V11.9376C5 11.1019 5.26034 10.327 5.70435 9.68959L3.22141 8.69624C2.83684 8.54238 2.6498 8.10589 2.80366 7.72131C2.95752 7.33673 3.39401 7.1497 3.77859 7.30356L6.91514 8.55841C7.50624 8.20388 8.19807 8.00006 8.9375 8.00006H15.0625C15.8019 8.00006 16.4938 8.20388 17.0849 8.55841L20.2214 7.30356C20.606 7.1497 21.0425 7.33673 21.1963 7.72131C21.3502 8.10589 21.1632 8.54238 20.7786 8.69624L18.2957 9.68959C18.7397 10.327 19 11.1019 19 11.9376V13.2501H22C22.4142 13.2501 22.75 13.5859 22.75 14.0001C22.75 14.4143 22.4142 14.7501 22 14.7501H19V15.0001C19 16.1808 18.7077 17.2932 18.1915 18.2689L20.7786 19.3039C21.1632 19.4578 21.3502 19.8943 21.1963 20.2789C21.0425 20.6634 20.606 20.8505 20.2214 20.6966L17.3288 19.5394C16.1974 20.8664 14.5789 21.7655 12.75 21.9604V15.0001C12.75 14.5858 12.4142 14.2501 12 14.2501C11.5858 14.2501 11.25 14.5858 11.25 15.0001V21.9604C9.42109 21.7655 7.80265 20.8664 6.67115 19.5394L3.77859 20.6966C3.39401 20.8505 2.95752 20.6634 2.80366 20.2789C2.6498 19.8943 2.83684 19.4578 3.22141 19.3039L5.80852 18.2689C5.29231 17.2932 5 16.1808 5 15.0001V14.7501H2C1.58579 14.7501 1.25 14.4143 1.25 14.0001Z"
      fill="currentColor"
    />
  </svg>
{/snippet}

{#snippet iconPatreon(classes = '')}
  <svg
    fill="none"
    width="800px"
    height="800px"
    viewBox="0 0 32 32"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    class="h-4 w-4 {classes}"
  >
    <path
      d="M20.23 1.604c-0.008-0-0.017-0-0.027-0-5.961 0-10.793 4.832-10.793 10.793s4.832 10.793 10.793 10.793c5.955 0 10.783-4.822 10.793-10.775v-0.001c-0.004-5.953-4.816-10.781-10.763-10.809h-0.003zM1.004 1.604v28.792h5.274v-28.792z"
      fill="currentColor"
    />
  </svg>
{/snippet}

{#snippet iconGithub(classes = '')}
  <svg
    class="h-4 w-4 {classes}"
    width="800px"
    height="800px"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
  >
    <path
      fill="currentColor"
      fill-rule="evenodd"
      d="M8 1C4.133 1 1 4.13 1 7.993c0 3.09 2.006 5.71 4.787 6.635.35.064.478-.152.478-.337 0-.166-.006-.606-.01-1.19-1.947.423-2.357-.937-2.357-.937-.319-.808-.778-1.023-.778-1.023-.635-.434.048-.425.048-.425.703.05 1.073.72 1.073.72.624 1.07 1.638.76 2.037.582.063-.452.244-.76.444-.935-1.554-.176-3.188-.776-3.188-3.456 0-.763.273-1.388.72-1.876-.072-.177-.312-.888.07-1.85 0 0 .586-.189 1.924.716A6.711 6.711 0 018 4.381c.595.003 1.194.08 1.753.236 1.336-.905 1.923-.717 1.923-.717.382.963.142 1.674.07 1.85.448.49.72 1.114.72 1.877 0 2.686-1.638 3.278-3.197 3.45.251.216.475.643.475 1.296 0 .934-.009 1.688-.009 1.918 0 .187.127.404.482.336A6.996 6.996 0 0015 7.993 6.997 6.997 0 008 1z"
      clip-rule="evenodd"
    />
  </svg>
{/snippet}

<header class="flex flex-col">
  <div class="bg-zinc-900 py-2">
    <div class="max-w-screen-lg w-full mx-auto">
      <div class="flex px-3 justify-between items-center">
        <div class="flex items-center gap-3 text-sm text-white font-bold">
          <a
            href="https://www.patreon.com/c/BohdanDukhevych"
            target="_blank"
            class="flex items-center gap-2 py-0.5 hover:underline"
          >
            {@render iconPatreon('text-[#f96854] h-5 w-5')}
            <span>Support project</span>
          </a>
          |
          <a
            href={feedbackUrl()}
            target="_blank"
            class="flex items-center gap-2 py-0.5 hover:underline"
          >
            <span>Leave feedback</span>
          </a>
        </div>
        <div class="flex items-center gap-3 text-sm text-white font-bold">
          <a
            href={reportIssueUrl()}
            target="_blank"
            class="flex items-center gap-2 py-0.5 hover:underline"
          >
            {@render iconBug('text-red-400 h-5 w-5')}
            <span>Report issue</span>
          </a>
          |
          <a
            href="https://github.com/dukhevych/rym-lastfm-stats"
            target="_blank"
            class="flex items-center gap-2 py-0.5 hover:underline"
          >
            {@render iconGithub('h-5 w-5 text-[#08872B]')}
            <span>Github</span>
          </a>
        </div>
      </div>
    </div>
  </div>
  <div class="max-w-screen-lg w-full mx-auto py-1 md:py-2 lg:py-3">
    <div class="flex items-center gap-3">
      <div class="flex flex-col flex-1 justify-start"></div>
      <div class="flex flex-col gap-2 items-center justify-center py-3">
        <a
          href="https://rateyourmusic.com"
          target="_blank"
          class="flex items-center gap-3"
        >
          <img src="/icons/icon48.png" alt="" class="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12" />
          <h1 class="relative select-none text-lg md:text-xl lg:text-2xl font-bold">
            <span
              class="absolute right-0 top-0 -translate-y-1/2 text-[8px] md:text-[10px] font-bold"
            >
              {appVersion}
              {#if constants.isDev}DEV{/if}
            </span>
            <span class="text-red-600">RYM Last.fm Stats</span>
          </h1>
        </a>
        <div class="text-zinc-400 text-xs md:text-sm italic">
          ✦ {slogan()} ✦
        </div>
      </div>
      <div class="flex flex-1 justify-end"></div>
    </div>
  </div>
</header>
