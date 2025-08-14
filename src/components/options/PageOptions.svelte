<svelte:options runes={true} />

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';
// import { watch } from 'runed';
import browser from 'webextension-polyfill';

import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import {
  storageGet,
  storageSet,
  storageRemove,
  getProfileOptions,
  getRymSyncTimestamp,
  updateProfileOptions,
  getUserData,
  getLastFmApiKey,
} from '@/helpers/storageUtils';
import * as utils from '@/helpers/utils';

import FormToggle from './FormToggle.svelte';

const appVersion = process.env.APP_VERSION;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

// FLAGS
let isLoading = $state(true);
let signinInProgress = $state(false);

let fallbackUsername = $state('');
let activeTab = $state(new URLSearchParams(window.location.search).get('tab') || 'modules');

let currentConfig = $state<AddonOptions>();
let form: AddonOptions = $state(constants.PROFILE_OPTIONS_DEFAULT);

let userData = $state<UserData>();
const isLoggedIn = $derived(() => !!userData?.name);

let dbRecordsQty = $state<number>();
const dbRecordsQtyLabel = $derived(() => {
  if (!dbRecordsQty) return 'No records yet';
  let str = `Records: ${dbRecordsQty}`;
  if (!rymSyncTimestamp) str += ' (so far)';
  return str;
});

let rymSyncTimestamp = $state<number>();
const rymSyncTimestampLabel = $derived(() => {
  if (!rymSyncTimestamp) return 'No sync performed yet';
  return `Last sync ${formatDistanceToNow(rymSyncTimestamp, { addSuffix: true })}`;
});

let lastfmApiKey = $state('');
let lastfmApiInputType = $state('password');
let submitTimer: NodeJS.Timeout | null = null;

const moduleSettingsPreviews = {
  'artist-stats': [
    {
      type: 'animation',
      on: '/images/options/artist-stats-on.jpg',
      off: '/images/options/artist-stats-off.jpg',
    },
  ],
  'release-stats': [
    {
      type: 'animation',
      on: '/images/options/release-stats-on.jpg',
      off: '/images/options/release-stats-off.jpg',
    },
  ],
  'song-stats': [
    {
      type: 'animation',
      on: '/images/options/song-stats-on.jpg',
      off: '/images/options/song-stats-off.jpg',
    },
  ],
  'recent-tracks': [
    '/images/options/recent-tracks-1-playing.jpg',
    '/images/options/recent-tracks-2-playing.jpg',
    '/images/options/recent-tracks-3-playing.jpg',
    '/images/options/recent-tracks-1-stopped.jpg',
  ],
  'top-albums': [
    '/images/options/top-albums.jpg',
  ],
  'top-artists': [
    '/images/options/top-artists.jpg',
  ],
};

let activePreviewKey = $state('artist-stats');

function handleApiKeyFocus(e: Event) {
  (e.target as HTMLInputElement).select();
  lastfmApiInputType = 'text';
}

function handleApiKeyBlur(e: Event) {
  (e.target as HTMLInputElement).value = (
    e.target as HTMLInputElement
  ).value.trim();
  lastfmApiInputType = 'password';
}

async function submit() {
  const newConfig = JSON.parse(JSON.stringify(form));
  Object.keys(newConfig).forEach((key) => {
    if (currentConfig && newConfig[key] === currentConfig[key as keyof AddonOptions]) {
      delete newConfig[key];
    }
  });
  await updateProfileOptions(newConfig);
  currentConfig = newConfig;
}

async function reset() {
  const doConfirm = confirm('Are you sure you want to reset all settings?');
  if (!doConfirm) return;
  Object.assign(form, constants.PROFILE_OPTIONS_DEFAULT);
  await submit();
}

async function openAuthPage() {
  if (!SYSTEM_API_KEY) {
    alert('API Key is not set');
    return;
  }

  signinInProgress = true;

  try {
    const redirectUri = browser.identity.getRedirectURL();

    const authUrl = `https://www.last.fm/api/auth/?api_key=${SYSTEM_API_KEY}&cb=${encodeURIComponent(redirectUri)}`;

    const redirectUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    const finalUrl = new URL(redirectUrl);
    const token = finalUrl.searchParams.get('token');

    if (!token) {
      throw new Error('No token returned');
    }

    const sessionKey = await utils.fetchSessionKey(token);
    if (!sessionKey) throw new Error('Invalid session key');

    const data = await api.fetchUserData(sessionKey, SYSTEM_API_KEY);

    if (!data) throw new Error('No data returned');

    const normalizedData = {
      name: data.name,
      url: data.url,
      image: data.image?.[0]?.['#text'],
    };

    userData = normalizedData;

    await storageSet({
      userData: normalizedData,
    });

    signinInProgress = false;
  } catch (err) {
    console.error('Auth failed:', err);
    signinInProgress = false;
  }
}

async function init() {
  const data = await Promise.all([
    getProfileOptions(),
    getLastFmApiKey(),
    getUserData(),
    RecordsAPI.getQty(),
    getRymSyncTimestamp(),
  ]);

  console.log('data', JSON.stringify(data, null, 2));

  currentConfig = data[0];
  form = data[0];
  lastfmApiKey = data[1];
  userData = data[2];
  dbRecordsQty = data[3] ?? null;
  rymSyncTimestamp = data[4] ?? null;

  isLoading = false;
}

function openRymSync() {
  window.open('https://rateyourmusic.com/music_export?sync', '_blank');
}

async function logout() {
  const doConfirm = confirm('Are you sure you want to logout?');
  if (!doConfirm) return;
  await storageRemove('userData');
  userData = undefined;
}

const reportIssueUrl = $derived(() => {
  const baseUrl = 'https://github.com/dukhevych/rym-lastfm-stats/issues/new';

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    browser: navigator.userAgent,
    'extension-version': browser.runtime.getManifest().version,
  });

  return `${baseUrl}?${params.toString()}`;
});

async function fallbackLogin() {
  const userDataRaw = await api.fetchUserDataByName(
    fallbackUsername,
    SYSTEM_API_KEY!,
  );

  if (userDataRaw) {
    const normalizedData = {
      name: userDataRaw.name,
      url: userDataRaw.url,
      image: userDataRaw.image?.[0]?.['#text'],
    };

    userData = normalizedData;

    await storageSet({
      userData: normalizedData,
    });
  }
}

// watch(
//   () => $state.snapshot(options),
//   (v, v2) => {
//     console.log('options changed');
//     console.log(JSON.stringify(v, null, 2));
//     console.log(JSON.stringify(v2, null, 2));
//   },
//   { lazy: true },
// );

init();

interface CardProps {
  isValid: boolean;
  title: string;
  validStatus: string;
  invalidStatus: string;
  action?: () => void;
  hasWarning?: boolean;
  note?: string | string[];
  isLoading?: boolean;
}

interface TabLinkProps {
  href: string;
  label: string;
  icon: (size?: number) => any;
  isActive: boolean;
  onClick: (e: MouseEvent) => void;
}
</script>

{#snippet tabLink({
  href,
  label,
  icon,
  isActive,
  onClick
}: TabLinkProps)}
  <a
    href={href}
    onclick={onClick}
    class="tab [--tab-border-color:var(--color-gray-200)] dark:[--tab-border-color:var(--color-gray-800)] {isActive ? 'tab-active [--tab-bg:var(--color-gray-50)] dark:[--tab-bg:var(--color-gray-900)]' : ''}"
  >
    {@render icon()}
    {label}
  </a>
{/snippet}

{#snippet iconKey(size = 4)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size}"
    ><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"
    ></path><path d="m21 2-9.6 9.6"></path><circle cx="7.5" cy="15.5" r="5.5"
    ></circle>
  </svg>
{/snippet}

{#snippet iconBarChart(size = 4)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size}"
    ><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"
    ></path><path d="M8 17v-3"></path>
  </svg>
{/snippet}

{#snippet iconClock(size = 4)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size}"
    ><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"
    ></polyline>
  </svg>
{/snippet}

{#snippet card({
  isValid,
  hasWarning = false,
  isLoading = false,
  title,
  note,
  validStatus,
  invalidStatus,
  action,
}: CardProps)}
  <svelte:element
    this={!isValid && action ? 'button' : 'div'}
    data-slot="card"
    class={[
      'text-card-foreground flex flex-col gap-6 rounded-xl py-6 border-2 text-left',
      isValid ? 'shadow-sm border-green-200 bg-green-50 dark:bg-green-900 dark:border-green-800' : '',
      !isValid ? 'border-zinc-200 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800' : '',
      hasWarning ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-800' : '',
      isLoading ? 'pointer-events-none opacity-50' : '',
      (!isValid && action) ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : '',
    ].join(' ')}
    onclick={!isValid && action ? action : undefined}
    role={!isValid && action ? 'button' : undefined}
  >
    <div data-slot="card-content" class="p-4">
      <div class="flex items-center gap-2">
        {#if isValid}
          {@render iconSuccess()}
        {:else}
          {@render iconError()}
        {/if}

        <div class="flex grow items-center gap-1">
          <div>
            <h3 class="font-bold">{title}</h3>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {isValid ? validStatus : invalidStatus}
            </div>
          </div>
          {#if note && note.length > 0}
            <div class="text-xs text-gray-600 dark:text-gray-300 text-right grow flex flex-col gap-1">
              {#if typeof note === 'string'}
                {note}
              {/if}
              {#if Array.isArray(note)}
                {#each note as n}
                  <p>{n}</p>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </svelte:element>
{/snippet}

{#snippet iconSettings(size = 4)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size}"
    ><path
      d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
    ></path><circle cx="12" cy="12" r="3"></circle>
  </svg>
{/snippet}

{#snippet iconSuccess(size = 5)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size} text-green-600"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <path d="m9 11 3 3L22 4"></path>
  </svg>
{/snippet}

{#snippet iconError(size = 5)}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-{size} w-{size} text-red-600"
  >
    <path d="M18 6L6 18"></path>
    <path d="M6 6l12 12"></path>
  </svg>
{/snippet}

<div
  class="min-h-viewport flex flex-col"
  style:display={isLoading ? 'none' : 'block'}
>
  <header>
    <nav class="navbar bg-base-200 shadow-sm">
      <div
        class="max-w-screen-xl mx-auto flex grow items-center justify-center py-3"
      >
        <a
          href="https://rateyourmusic.com"
          target="_blank"
          class="flex items-center gap-3"
        >
          <img src="/icons/icon48.png" alt="" />
          <h1 class="relative select-none text-2xl font-bold">
            <span
              class="absolute right-0 top-0 -translate-y-1/2 text-[10px] font-bold"
            >
              {appVersion}
              {#if constants.isDev}DEV{/if}
            </span>
            <span class="text-red-600">RYM Last.fm Stats</span>
          </h1>
        </a>
      </div>
    </nav>
  </header>
  <main class="max-w-screen-xl mx-auto w-full flex flex-col gap-3">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {@render card({
        isValid: isLoggedIn(),
        title: 'Last.fm OAuth',
        validStatus: 'Connected',
        invalidStatus: 'Not connected',
        note: userData?.name ? [
          'Username:',
          userData.name,
        ] : 'Guest',
        action: openAuthPage,
        isLoading: signinInProgress,
      })}
      {@render card({
        isValid: lastfmApiKey.length === 32,
        title: 'API Key',
        validStatus: 'Configured',
        invalidStatus: 'Not configured',
        action: () => activeTab = 'api-auth',
      })}
      {@render card({
        isValid: !!rymSyncTimestamp,
        title: 'RYM Sync',
        validStatus: 'Completed',
        invalidStatus: 'Not completed',
        note: [
          rymSyncTimestampLabel(),
          dbRecordsQtyLabel(),
        ],
        action: openRymSync,
      })}
    </div>

    <pre>{JSON.stringify(constants.MODULE_TOGGLE_CONFIG, null, 2)}</pre>
    <pre>{JSON.stringify(constants.CONFIG_DEFAULTS, null, 2)}</pre>
    <pre>{JSON.stringify(constants.PROFILE_OPTIONS_DEFAULT, null, 2)}</pre>
    <!-- <pre>{JSON.stringify(options, null, 2)}</pre>

    <pre>{JSON.stringify(utils.pick(options, Object.keys(constants.MODULE_TOGGLE_CONFIG) as (keyof AddonOptions)[]), null, 2)}</pre>
    <pre>{JSON.stringify(utils.omit(options, Object.keys(constants.MODULE_TOGGLE_CONFIG) as (keyof AddonOptions)[]), null, 2)}</pre> -->

    <div>
      <nav>
        <ul class="tabs mx-6 tabs-lift *:grow relative">
          <li class="*:flex *:items-center *:gap-2">
            {@render tabLink({
              href: '#',
              label: 'Modules',
              icon: iconSettings,
              isActive: activeTab === 'modules',
              onClick: () => activeTab = 'modules',
            })}
          </li>
          <li class="*:flex *:items-center *:gap-2">
            {@render tabLink({
              href: '#',
              label: 'Recent Tracks',
              icon: iconClock,
              isActive: activeTab === 'recent-tracks',
              onClick: () => activeTab = 'recent-tracks',
            })}
          </li>
          <li class="*:flex *:items-center *:gap-2">
            {@render tabLink({
              href: '#',
              label: 'Top Content',
              icon: iconBarChart,
              isActive: activeTab === 'top-content',
              onClick: () => activeTab = 'top-content',
            })}
          </li>
          <li class="*:flex *:items-center *:gap-2">
            {@render tabLink({
              href: '#',
              label: 'API & Auth',
              icon: iconKey,
              isActive: activeTab === 'api-auth',
              onClick: () => activeTab = 'api-auth',
            })}
          </li>
        </ul>
        <!-- <a class="tab [--tab-border-color:var(--color-gray-200)] dark:[--tab-border-color:var(--color-gray-800)] {activeTab === 'modules' ? 'tab-active [--tab-bg:var(--color-gray-50)] dark:[--tab-bg:var(--color-gray-900)]' : ''}" href="#tab=modules" onclick={(e) => { e.preventDefault(); activeTab = 'modules' }}>
          {@render iconSettings()}
          Modules
        </a> -->
        <!-- <a class="tab [--tab-border-color:var(--color-gray-200)] dark:[--tab-border-color:var(--color-gray-800)] {activeTab === 'recent-tracks' ? 'tab-active [--tab-bg:var(--color-gray-50)] dark:[--tab-bg:var(--color-gray-900)]' : ''}" href="#tab=recent-tracks" onclick={(e) => { e.preventDefault(); activeTab = 'recent-tracks' }}>
          {@render iconClock()}
          Recent Tracks
        </a>
        <a class="tab [--tab-border-color:var(--color-gray-200)] dark:[--tab-border-color:var(--color-gray-800)] {activeTab === 'top-content' ? 'tab-active [--tab-bg:var(--color-gray-50)] dark:[--tab-bg:var(--color-gray-900)]' : ''}" href="#tab=top-content" onclick={(e) => { e.preventDefault(); activeTab = 'top-content' }}>
          {@render iconBarChart()}
          Top Content
        </a>
        <a class="tab [--tab-border-color:var(--color-gray-200)] dark:[--tab-border-color:var(--color-gray-800)] {activeTab === 'api-auth' ? 'tab-active [--tab-bg:var(--color-gray-50)] dark:[--tab-bg:var(--color-gray-900)]' : ''}" href="#tab=api-auth" onclick={(e) => { e.preventDefault(); activeTab = 'api-auth' }}>
          {@render iconKey()}
          API & Auth
        </a> -->
      </nav>

      <div class="mt-[-1px] flex flex-col gap-6 border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900" class:hidden={activeTab !== 'modules'}>
        <header class="flex flex-col gap-2">
          <div class="flex items-center justify-center gap-2">
            {@render iconSettings(5)}
            <h3 class="text-lg font-semibold">Module Settings</h3>
          </div>
          <div class="text-gray-600 dark:text-gray-400 text-center">
            Enable or disable specific enhancement modules
          </div>
        </header>
        <div class="flex">
          <aside class="flex flex-col gap-3 w-1/3 border-r border-gray-200 dark:border-gray-800">
            <div class="flex flex-col gap-4 border-y border-l border-gray-200 dark:border-gray-800 py-4">
              <h4 class="font-medium text-gray-900 dark:text-gray-100 px-4 flex items-baseline justify-between">
                Last.fm Stats
                <span class="text-xs dark:text-blue-200 text-blue-600">
                  Updates every {utils.msToHuman(constants.STATS_CACHE_LIFETIME_GUEST_MS)}
                </span>
              </h4>
              {#if !lastfmApiKey || !isLoggedIn()}
                <div class="text-xs dark:text-orange-200 text-red-600 px-4 flex flex-col gap-1">
                  {#if !lastfmApiKey}
                    <p>Add a Last.fm API key to increase rate limit</p>
                  {/if}
                  {#if !isLoggedIn()}
                    <p>Connect to Last.fm to <strong>enable personal scrobbling</strong> stats</p>
                  {/if}
                </div>
              {/if}
              <div>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-4 select-none"
                  onmouseenter={() => activePreviewKey = 'artist-stats'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Artist Statistics</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Show Last.fm stats on artist pages
                    </p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked />
                </label>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-4 select-none"
                  onmouseenter={() => activePreviewKey = 'release-stats'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Release Statistics</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Show Last.fm stats on release pages
                    </p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked />
                </label>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-4 select-none"
                  onmouseenter={() => activePreviewKey = 'song-stats'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Song Statistics</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Show Last.fm stats on song pages
                    </p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked />
                </label>
              </div>
            </div>
            <div class="flex flex-col gap-4 border-y border-l border-gray-200 dark:border-gray-800 py-4">
              <h4 class="font-medium text-gray-900 dark:text-gray-100 px-3 flex items-baseline justify-between">
                Profile Features
                {#if !lastfmApiKey}
                  <span class="text-xs dark:text-orange-200 text-red-600">
                    ⚠️ Last.fm API key is required
                  </span>
                {/if}
              </h4>
              <div>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-3 select-none"
                  onmouseenter={() => activePreviewKey = 'recent-tracks'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Recent Tracks Widget</span>
                    <p class="text-xs text-gray-500">
                      Show recent tracks on profile
                    </p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked disabled={!lastfmApiKey} />
                </label>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-3 select-none"
                  onmouseenter={() => activePreviewKey = 'top-albums'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Top Albums Widget</span>
                    <p class="text-xs text-gray-500">Show top albums on profile</p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked disabled={!lastfmApiKey} />
                </label>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-3 select-none"
                  onmouseenter={() => activePreviewKey = 'top-artists'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Top Artists Widget</span>
                    <p class="text-xs text-gray-500">Show top artists on profile</p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked disabled={!lastfmApiKey} />
                </label>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 py-2 px-3 select-none"
                  onmouseenter={() => activePreviewKey = 'strict-search'}
                  onmouseleave={() => activePreviewKey = ''}
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Strict Search Results</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Enhanced search filtering
                    </p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked disabled={!lastfmApiKey} />
                </label>
              </div>
            </div>
            <div class="flex flex-col gap-4 border-y border-l border-gray-200 dark:border-gray-800 py-4">
              <h4 class="font-medium text-gray-900 dark:text-gray-100 px-3">
                Other Features
              </h4>
              <div>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md rounded-r-none py-2 px-3 select-none"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">List User Ratings</span>
                    <p class="text-xs text-gray-500">Show ratings in lists</p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked />
                </label>
                <label
                  class="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md rounded-r-none py-2 px-3 select-none"
                >
                  <div class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium">Chart User Ratings</span>
                    <p class="text-xs text-gray-500">Show ratings in charts</p>
                  </div>
                  <input type="checkbox" class="toggle toggle-primary" checked />
                </label>
              </div>
            </div>
          </aside>

          <!-- Visual preview -->
          <div class="w-2/3 *:w-full *:max-w-[800px] flex items-center flex-col gap-3">
            {#if !activePreviewKey}
              <div class="h-full flex items-center justify-center text-gray-600 dark:text-gray-400 text-center text-xl font-medium p-4 rounded-lg bg-gray-100 dark:bg-gray-800 cursor-default">
                Hover over a module in sidebar to see it's visual preview
              </div>
            {:else}
              <div class="flex flex-col gap-3">
                <h3 class="text-lg font-semibold">Visual Preview</h3>
                {#each Object.entries(moduleSettingsPreviews) as [key, previews]}
                  <div data-preview-key={key} class:hidden={activePreviewKey !== key}>
                    {#each previews as preview}
                      {#if typeof preview === 'string'}
                        <img src={preview} alt={`Visual preview for ${key}`} />
                      {/if}
                      {#if typeof preview === 'object' && preview.type === 'animation'}
                        <div class="grid relative">
                          <img src={preview.on} alt="" class="[grid-area:1/1] animate-fadeA will-change-opacity" />
                          <img src={preview.off} alt="" class="[grid-area:1/1] animate-fadeB pointer-events-none will-change-opacity" />
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="mt-[-1px] flex flex-col gap-6 border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900" class:hidden={activeTab !== 'recent-tracks'}>
        <header class="flex flex-col gap-2">
          <div class="flex items-center justify-center gap-2">
            {@render iconClock(5)}
            <h3 class="text-lg font-semibold">Recent Tracks</h3>
          </div>
          <div class="text-gray-600 dark:text-gray-400 text-center">
            Configure the recent tracks widget
          </div>
        </header>

        <!-- <div class="flex"> -->
          <div class="flex flex-col gap-3 border border-gray-200 dark:border-gray-800">
            SETTINGS GO HERE
          </div>
        <!-- </div> -->
      </div>

      <div class="space-y-6" class:hidden={activeTab !== 'top-content'}>
        <div class="flex items-center gap-2 mb-4">
          {@render iconBarChart(5)}
          <h3 class="text-lg font-semibold">Top Content</h3>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Configure the top content widgets
        </p>

        <div class="flex">
          <div class="flex flex-col gap-3 border-r border-gray-200 dark:border-gray-800">
            SETTINGS GO HERE
          </div>
        </div>
      </div>

      <div class="space-y-6" class:hidden={activeTab !== 'api-auth'}>
        <div class="flex items-center gap-2 mb-4">
          {@render iconKey(5)}
          <h3 class="text-lg font-semibold">API & Auth</h3>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Configure the API and authentication settings
        </p>

        <div class="flex">
          <div class="flex flex-col gap-3 border-r border-gray-200 dark:border-gray-800">
            SETTINGS GO HERE
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button class="btn btn-primary">
        {@render iconSettings(5)}
        Save Configuration
      </button>
    </div>
  </main>
  <!-- <div>
    <button class="btn btn-neutral">Neutral</button>
    <button class="btn btn-primary">Primary</button>
    <button class="btn btn-secondary">Secondary</button>
    <button class="btn btn-accent">Accent</button>
    <button class="btn btn-info">Info</button>
    <button class="btn btn-success">Success</button>
    <button class="btn btn-warning">Warning</button>
    <button class="btn btn-error">Error</button>
  </div> -->
</div>

<style>
/* fix for Chrome default extension font style */
:global(body) {
  font-size: inherit;
  font-family: inherit;
}

@keyframes fadeA {
  0%, 89.99% { opacity: 1; }
  90%, 100% { opacity: 0; }
}
@keyframes fadeB {
  0%, 89.99% { opacity: 0; }
  90%, 100% { opacity: 1; }
}

.animate-fadeA {
  animation: fadeA 5s infinite ease-in-out;
}
.animate-fadeB {
  animation: fadeB 5s infinite ease-in-out;
}
</style>
