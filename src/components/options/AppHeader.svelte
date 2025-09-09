<script lang="ts">
import browser from 'webextension-polyfill';

import iconBugSvg from '@/assets/icons/iconBug.svg';
import iconGithubSvg from '@/assets/icons/iconGithub.svg';
import iconPatreonSvg from '@/assets/icons/iconPatreon.svg';
import * as constants from '@/helpers/constants';
import { withSvgClass } from '@/helpers/svg';
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
  {@html withSvgClass(iconBugSvg, `h-4 w-4 ${classes}`)}
{/snippet}

{#snippet iconPatreon(classes = '')}
  {@html withSvgClass(iconPatreonSvg, `h-4 w-4 ${classes}`)}
{/snippet}

{#snippet iconGithub(classes = '')}
  {@html withSvgClass(iconGithubSvg, `h-4 w-4 ${classes}`)}
{/snippet}

<header class="flex flex-col">
  <div class="bg-zinc-900 py-2">
    <div class="max-w-screen-lg w-full mx-auto">
      <div class="flex px-3 justify-between items-center">
        <div class="flex items-center gap-3 text-sm text-white font-bold">
          <a
            href="https://www.patreon.com/c/BohdanDukhevych"
            target="_blank"
            class="flex items-center gap-2 py-0.5 hoverable:hover:underline"
          >
            {@render iconPatreon('text-[#f96854] h-5 w-5')}
            <span>Support project</span>
          </a>
          |
          <a
            href={feedbackUrl()}
            target="_blank"
            class="flex items-center gap-2 py-0.5 hoverable:hover:underline"
          >
            <span>Leave feedback</span>
          </a>
        </div>
        <div class="flex items-center gap-3 text-sm text-white font-bold">
          <a
            href={reportIssueUrl()}
            target="_blank"
            class="flex items-center gap-2 py-0.5 hoverable:hover:underline"
          >
            {@render iconBug('text-red-400 h-5 w-5')}
            <span>Report bug</span>
          </a>
          |
          <a
            href="https://github.com/dukhevych/rym-lastfm-stats"
            target="_blank"
            class="flex items-center gap-2 py-0.5 hoverable:hover:underline"
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
