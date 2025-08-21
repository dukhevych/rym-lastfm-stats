<svelte:options runes={true} />

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';
import type { Snippet } from 'svelte';
import { getTopArtists } from '@/api/getTopArtists';
import { tick } from 'svelte';
import browser from 'webextension-polyfill';

import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import {
  storageSet,
  storageRemove,
  getModuleToggleConfig,
  getModuleCustomizationConfig,
  getRymSyncTimestamp,
  updateProfileOptions,
  getUserData,
  getLastFmApiKey,
  setLastFmApiKey,
} from '@/helpers/storageUtils';
import * as utils from '@/helpers/utils';

import FormToggle from './FormToggle.svelte';
import FormToggleGroup from './FormToggleGroup.svelte';
import TabContent from './TabContent.svelte';

const appVersion = process.env.APP_VERSION!;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY!;

// FLAGS
let isLoading = $state(true);
let signinInProgress = $state(false);
let lastfmApiKeyInput: HTMLInputElement | null = null;
let fallbackUsername = $state('');

let browserName = $state<"firefox" | "chrome" | "other">();
const slogan = $derived(() => constants.SLOGAN_VARIANTS[Math.floor(Math.random() * constants.SLOGAN_VARIANTS.length)]);

type TabId = 'modules' | 'customization' | 'api-auth';

interface Tab {
  id: TabId;
  label: string;
  icon: Snippet;
}

const tabs: Tab[] = [
  {
    id: 'modules',
    label: 'Modules',
    icon: iconSwitch,
  },
  {
    id: 'customization',
    label: 'Customization',
    icon: iconSettings,
  },
  {
    id: 'api-auth',
    label: 'API & Auth',
    icon: iconKey,
  },
];

let hashValue = window.location.hash ? window.location.hash.slice(1) : null;

async function removeApiKey() {
  const doConfirm = confirm('Are you sure you want to remove the API key?');
  if (!doConfirm) return;
  await setLastFmApiKey('');
  lastfmApiKeySaved = '';
  lastfmApiKey = '';
}

function getInitialTab() {
  if (hashValue) return tabs.find((tab) => tab.id === hashValue)?.id || 'modules';
  return 'modules';
}

let activeTab = $state(getInitialTab());
// let currentConfig = $state<ModuleToggleConfig>();
let formModules: ModuleToggleConfig = $state(constants.MODULE_TOGGLE_CONFIG);
let formCustomization: AddonOptions = $state(constants.MODULE_CUSTOMIZATION_CONFIG);

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
const isRymSyncOutdated = $derived(() => {
  if (!rymSyncTimestamp) return false;
  const date = new Date(rymSyncTimestamp);
  const now = new Date();
  return now.getTime() - date.getTime() > constants.RYM_SYNC_OUTDATED_THRESHOLD_MS;
});
const hasRymSyncWarning = $derived(() => {
  if (!rymSyncTimestamp) return true;
  return isRymSyncOutdated();
});

const setupProgress = $derived(() => [isLoggedIn(), !!lastfmApiKeySaved, rymSyncTimestamp].filter(Boolean).length);

let lastfmApiKeySaved = $state('');
let lastfmApiKey = $state('');
let lastfmApiKeyValidationInProgress = $state(false);

async function onSubmitLastFmApiKey(e: Event) {
  e.preventDefault();
  if (!lastfmApiKey) return;
  if (lastfmApiKey === lastfmApiKeySaved) return;
  if (lastfmApiKey.length !== 32) {
    alert('Invalid API key. It should be 32 characters long.');
    return;
  }

  lastfmApiKeyValidationInProgress = true;

  try {
    await getTopArtists({
      apiKey: lastfmApiKey,
      params: { limit: 1 },
    });

    await setLastFmApiKey(lastfmApiKey);
    lastfmApiKeySaved = lastfmApiKey;
  } catch (err) {
    console.error(err);
    alert('Please check your API key and try again');
  }

  lastfmApiKeyValidationInProgress = false;
}

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

let activePreviewKey = $state('');

function handleApiKeyFocus(e: Event) {
  (e.target as HTMLInputElement).select();
}

function handleApiKeyBlur(e: Event) {
  (e.target as HTMLInputElement).value = (
    e.target as HTMLInputElement
  ).value.trim();
}

async function submit() {
  const newConfig = $state.snapshot(formModules);
  await updateProfileOptions(newConfig);
  // currentConfig = newConfig;
}

async function reset() {
  const doConfirm = confirm('Are you sure you want to reset all settings?');
  if (!doConfirm) return;
  Object.assign(formModules, constants.PROFILE_OPTIONS_DEFAULT);
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
      image: data.image?.[1]?.['#text'],
      playcount: data.playcount ? +data.playcount : null,
      registered: data.registered ? +data.registered?.['#text'] : null,
      albums: data.album_count ? +data.album_count : null,
      artists: data.artist_count ? +data.artist_count : null,
      tracks: data.track_count ? +data.track_count : null,
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
    getModuleToggleConfig(),
    getModuleCustomizationConfig(),
    getLastFmApiKey(),
    getUserData(),
    RecordsAPI.getQty(),
    getRymSyncTimestamp(),
    utils.detectBrowser(),
  ]);

  // currentConfig = data[0];
  formModules = data[0];
  formCustomization = data[1];
  lastfmApiKeySaved = data[2];
  lastfmApiKey = data[2];
  userData = data[3];
  dbRecordsQty = data[4] ?? null;
  rymSyncTimestamp = data[5] ?? null;
  browserName = data[6];

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
  valid: boolean;
  title: string;
  validStatus: string;
  invalidStatus: string;
  action?: () => void;
  warning?: boolean;
  note?: string | string[];
  loading?: boolean;
}

interface TabLinkProps {
  href: string;
  label: string;
  icon: (size?: number) => any;
  onClick: (e: MouseEvent) => void;
}
</script>

{#snippet tabLink({
  href,
  label,
  icon,
  onClick
}: TabLinkProps)}
  <a
    href={href}
    onclick={onClick}
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

{#snippet iconSwitch(size = 4)}
<svg width="800px" height="800px" class="h-4 w-4" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M156.31,43.63a9.9,9.9,0,0,0-14,14,60.1,60.1,0,1,1-85,0,9.9,9.9,0,0,0-14-14c-31,31-31,82,0,113s82,31,113,0A79.37,79.37,0,0,0,156.31,43.63Zm-56.5,66.5a10,10,0,0,0,10-10v-70a10,10,0,0,0-20,0v70A10,10,0,0,0,99.81,110.13Z" fill="currentColor" />
</svg>
{/snippet}

{#snippet card({
  valid,
  warning = false,
  loading = false,
  title,
  note,
  validStatus,
  invalidStatus,
  action,
}: CardProps)}
  <svelte:element
    this={!valid && action ? 'button' : 'div'}
    data-slot="card"
    class={[
      'flex flex-col gap-6 rounded-2xl border-2 text-left',
      !valid && 'bg-zinc-900 border-zinc-700',
      valid && 'shadow-sm border-teal-800 bg-teal-900/50',
      warning && 'bg-yellow-900/50 border-yellow-800',
      loading && 'pointer-events-none opacity-50',
      ((!valid || warning) && action) && 'cursor-pointer',
      (!valid && action) && 'hover:bg-zinc-800',
      (warning && action) && 'hover:bg-yellow-800/50',
    ].filter(Boolean).join(' ')}
    onclick={(!valid || warning) && action ? action : undefined}
    role={(!valid || warning) && action ? 'button' : undefined}
  >
    <div data-slot="card-content" class="p-4">
      <div class="flex items-center gap-2">
        {#if valid}
          {#if warning}
            {@render iconWarning()}
          {:else}
            {@render iconSuccess()}
          {/if}
        {:else}
          {@render iconError()}
        {/if}

        <div class="flex grow items-center gap-1">
          <div>
            <h3 class="font-bold">{title}</h3>
            <div class="text-sm text-zinc-600 dark:text-zinc-400">
              {valid ? validStatus : invalidStatus}
            </div>
          </div>
          {#if note && note.length > 0}
            <div class="text-xs text-zinc-600 dark:text-zinc-300 text-right grow flex flex-col gap-1">
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

{#snippet iconBug(classes = '')}
<svg class="h-4 w-4 {classes}" width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.416 2.62412C17.7607 2.39435 17.8538 1.9287 17.624 1.58405C17.3943 1.23941 16.9286 1.14628 16.584 1.37604L13.6687 3.31955C13.1527 3.11343 12.5897 3.00006 12.0001 3.00006C11.4105 3.00006 10.8474 3.11345 10.3314 3.31962L7.41603 1.37604C7.07138 1.14628 6.60573 1.23941 6.37596 1.58405C6.1462 1.9287 6.23933 2.39435 6.58397 2.62412L8.9437 4.19727C8.24831 4.84109 7.75664 5.70181 7.57617 6.6719C8.01128 6.55973 8.46749 6.50006 8.93763 6.50006H15.0626C15.5328 6.50006 15.989 6.55973 16.4241 6.6719C16.2436 5.70176 15.7519 4.841 15.0564 4.19717L17.416 2.62412Z" fill="currentColor" />
  <path d="M1.25 14.0001C1.25 13.5859 1.58579 13.2501 2 13.2501H5V11.9376C5 11.1019 5.26034 10.327 5.70435 9.68959L3.22141 8.69624C2.83684 8.54238 2.6498 8.10589 2.80366 7.72131C2.95752 7.33673 3.39401 7.1497 3.77859 7.30356L6.91514 8.55841C7.50624 8.20388 8.19807 8.00006 8.9375 8.00006H15.0625C15.8019 8.00006 16.4938 8.20388 17.0849 8.55841L20.2214 7.30356C20.606 7.1497 21.0425 7.33673 21.1963 7.72131C21.3502 8.10589 21.1632 8.54238 20.7786 8.69624L18.2957 9.68959C18.7397 10.327 19 11.1019 19 11.9376V13.2501H22C22.4142 13.2501 22.75 13.5859 22.75 14.0001C22.75 14.4143 22.4142 14.7501 22 14.7501H19V15.0001C19 16.1808 18.7077 17.2932 18.1915 18.2689L20.7786 19.3039C21.1632 19.4578 21.3502 19.8943 21.1963 20.2789C21.0425 20.6634 20.606 20.8505 20.2214 20.6966L17.3288 19.5394C16.1974 20.8664 14.5789 21.7655 12.75 21.9604V15.0001C12.75 14.5858 12.4142 14.2501 12 14.2501C11.5858 14.2501 11.25 14.5858 11.25 15.0001V21.9604C9.42109 21.7655 7.80265 20.8664 6.67115 19.5394L3.77859 20.6966C3.39401 20.8505 2.95752 20.6634 2.80366 20.2789C2.6498 19.8943 2.83684 19.4578 3.22141 19.3039L5.80852 18.2689C5.29231 17.2932 5 16.1808 5 15.0001V14.7501H2C1.58579 14.7501 1.25 14.4143 1.25 14.0001Z" fill="currentColor" />
</svg>
{/snippet}

{#snippet iconWarning(size = 5)}
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
    class="h-{size} w-{size} text-yellow-600"
  >
    <path d="M12 2L2 22h20L12 2z"></path>
    <circle cx="12" cy="12" r="1"></circle>
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

{#snippet iconPatreon(classes = '')}
  <svg fill="none" width="800px" height="800px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 {classes}">
    <path d="M20.23 1.604c-0.008-0-0.017-0-0.027-0-5.961 0-10.793 4.832-10.793 10.793s4.832 10.793 10.793 10.793c5.955 0 10.783-4.822 10.793-10.775v-0.001c-0.004-5.953-4.816-10.781-10.763-10.809h-0.003zM1.004 1.604v28.792h5.274v-28.792z" fill="currentColor" />
  </svg>
{/snippet}

{#snippet iconGithub(classes = '')}
<svg class="h-4 w-4 {classes}" width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
  <path fill="currentColor" fill-rule="evenodd" d="M8 1C4.133 1 1 4.13 1 7.993c0 3.09 2.006 5.71 4.787 6.635.35.064.478-.152.478-.337 0-.166-.006-.606-.01-1.19-1.947.423-2.357-.937-2.357-.937-.319-.808-.778-1.023-.778-1.023-.635-.434.048-.425.048-.425.703.05 1.073.72 1.073.72.624 1.07 1.638.76 2.037.582.063-.452.244-.76.444-.935-1.554-.176-3.188-.776-3.188-3.456 0-.763.273-1.388.72-1.876-.072-.177-.312-.888.07-1.85 0 0 .586-.189 1.924.716A6.711 6.711 0 018 4.381c.595.003 1.194.08 1.753.236 1.336-.905 1.923-.717 1.923-.717.382.963.142 1.674.07 1.85.448.49.72 1.114.72 1.877 0 2.686-1.638 3.278-3.197 3.45.251.216.475.643.475 1.296 0 .934-.009 1.688-.009 1.918 0 .187.127.404.482.336A6.996 6.996 0 0015 7.993 6.997 6.997 0 008 1z" clip-rule="evenodd"/>
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
  class="min-h-viewport flex flex-col {isLoading ? 'opacity-50 blur-xs' : ''} gap-3"
  style:display={isLoading ? 'none' : 'block'}
>
  <header class="flex flex-col gap-3">
    <div class="bg-zinc-900 py-2">
      <div class="max-w-screen-lg w-full mx-auto">
        <div class="flex justify-between items-center">
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
    <div class="max-w-screen-lg w-full mx-auto">
      <div class="flex items-center gap-3">
        <div class="flex flex-col flex-1 justify-start">
        </div>
        <div class="flex flex-col gap-2 items-center justify-center py-3">
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
          <div class="text-zinc-400 text-sm italic">
            ✦ {slogan()} ✦
          </div>
        </div>
        <div class="flex flex-1 justify-end">
        </div>
      </div>
    </div>
  </header>
  <main
    class="max-w-screen-lg mx-auto w-full flex flex-grow flex-col gap-6 pb-6"
  >
    <!-- STATUS CARDS -->
    <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
      {@render card({
        valid: isLoggedIn(),
        title: 'Last.fm',
        validStatus: 'Connected',
        invalidStatus: 'Not connected',
        note: userData?.name ? [
          'Username:',
          userData.name,
        ] : 'Guest',
        action: openAuthPage,
        loading: signinInProgress,
      })}
      {@render card({
        valid: !!lastfmApiKeySaved,
        title: 'Last.fm API Key',
        validStatus: 'Configured',
        invalidStatus: 'Not configured',
        action: () => {
          activeTab = 'api-auth';
          tick().then(() => {
            lastfmApiKeyInput?.focus();
          });
        },
      })}
      {@render card({
        valid: !!rymSyncTimestamp,
        title: 'RYM Sync',
        validStatus: isRymSyncOutdated() ? 'Outdated' : 'Completed',
        invalidStatus: 'Not completed',
        warning: isRymSyncOutdated(),
        note: [
          rymSyncTimestampLabel(),
          dbRecordsQtyLabel(),
        ],
        action: openRymSync,
      })}
    </div>

    <!-- CTA -->
    {#if setupProgress() < 3}
      <h2 class="text-zinc-400 text-lg text-center flex flex-col">
        <strong>You're almost there!</strong>
        <span class="text-sm text-white/50">{setupProgress()} / 3</span>
        <span class="text-sm text-white/50">Configure the remaining settings to complete the setup and get the most out of the extension:</span>
      </h2>
    {/if}

    <!-- CONTENT AREA -->
    <div class="p-6 bg-zinc-900 border-1 border-zinc-700 rounded-2xl flex flex-col gap-3">
      <!-- TABS -->
      <nav>
        <ul class="flex *:grow *:basis-0 gap-2 rounded-2xl p-1 bg-zinc-800">
          {#each tabs as tab}
            <li
              class="
                *:flex *:transition-colors *:items-center *:gap-2 *:justify-center *:rounded-xl *:p-1 *:text-sm
                {activeTab === tab.id ?
                  '*:bg-orange-800 pointer-events-none' :
                  '*:opacity-50 *:hover:opacity-100'
                }
              "
            >
              {@render tabLink({
                href: `#${tab.id}`,
                label: tab.label,
                icon: tab.icon,
                onClick: () => activeTab = tab.id,
              })}
            </li>
          {/each}
        </ul>
      </nav>

      <!-- TAB CONTENT -->
      <div>
        <TabContent
          active={activeTab === 'modules'}
          icon={iconSwitch}
          title="Modules"
          description="Enable or disable specific enhancement modules."
        >
          <div class="flex gap-3">
            <aside class="flex flex-col gap-8 w-1/3">
              <FormToggleGroup>
                <FormToggle
                  label="Last.fm Link in RYM Header"
                  description="Adds Last.fm link in RYM Header any page"
                  bind:checked={formModules.mainHeaderLastfmLink}
                  name="mainHeaderLastfmLink"
                  newOption
                />
              </FormToggleGroup>

              <FormToggleGroup title="Last.fm Stats">
                {#snippet note()}
                  Updates once in &lt; <strong>{utils.msToHuman(constants.getStatsCacheLifetime(userData?.name, lastfmApiKeySaved))}</strong> &gt;
                {/snippet}
                {#snippet warning()}
                  {#if !isLoading && (!lastfmApiKeySaved || !isLoggedIn())}
                    <div class="text-xs text-orange-200 flex flex-col gap-1">
                      {#if !lastfmApiKeySaved}
                        <p>Add a Last.fm API key to increase rate limit</p>
                      {/if}
                      {#if !isLoggedIn()}
                        <p>Connect to Last.fm to <strong>enable personal scrobbling</strong> stats</p>
                      {/if}
                    </div>
                  {/if}
                {/snippet}

                <FormToggle
                  label="Artist Statistics"
                  description="Show Last.fm stats on artist pages"
                  bind:checked={formModules.artistArtistStats}
                  name="artistArtistStats"
                />

                <FormToggle
                  label="Release Statistics"
                  description="Show Last.fm stats on release pages"
                  bind:checked={formModules.releaseReleaseStats}
                  name="releaseReleaseStats"
                />

                <FormToggle
                  label="Song Statistics"
                  description="Show Last.fm stats on song pages"
                  bind:checked={formModules.songSongStats}
                  name="songSongStats"
                  newOption
                />
              </FormToggleGroup>

              <FormToggleGroup title="Profile">
                {#snippet note()}
                  {#if !isLoading && !lastfmApiKeySaved}
                    <span class="text-orange-200 not-italic">
                      ⚠️ Last.fm API key is required
                    </span>
                  {/if}
                {/snippet}

                <FormToggle
                  label="Recent Tracks Widget"
                  description="Show recent tracks on profile"
                  bind:checked={formModules.profileRecentTracks}
                  disabled={!lastfmApiKeySaved}
                  name="profileRecentTracks"
                />
                <FormToggle
                  label="Top Albums Widget"
                  description="Show top albums on profile"
                  bind:checked={formModules.profileTopAlbums}
                  disabled={!lastfmApiKeySaved}
                  name="profileTopAlbums"
                />
                <FormToggle
                  label="Top Artists Widget"
                  description="Show top artists on profile"
                  bind:checked={formModules.profileTopArtists}
                  disabled={!lastfmApiKeySaved}
                  name="profileTopArtists"
                />
                <FormToggle
                  label="Strict Search Results"
                  description="Enhanced search filtering"
                  bind:checked={formModules.searchStrictResults}
                  disabled={!lastfmApiKeySaved}
                  name="searchStrictResults"
                />
              </FormToggleGroup>

              <FormToggleGroup title="RYM Ratings">
                {#snippet note()}
                  {#if !isLoading && hasRymSyncWarning()}
                    <span class="text-orange-200 not-italic">
                      ⚠️
                      {#if !rymSyncTimestamp}RYM Sync is required{/if}
                      {#if isRymSyncOutdated()}RYM Sync is outdated{/if}
                    </span>
                  {/if}
                {/snippet}

                <FormToggle
                  label="List User Ratings"
                  description="Show user ratings in lists"
                  bind:checked={formModules.listUserRating}
                  name="listUserRating"
                  newOption
                />

                <FormToggle
                  label="Chart User Ratings"
                  description="Show ratings in charts"
                  bind:checked={formModules.chartsUserRating}
                  name="chartsUserRating"
                  newOption
                />
              </FormToggleGroup>
            </aside>

            <!-- Visual preview -->
            <div class="w-2/3 *:w-full flex items-center flex-col gap-3">
              {#if !activePreviewKey}
                <div class="h-full flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-center text-xl font-medium p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 cursor-default">
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
        </TabContent>

        <TabContent
          active={activeTab === 'customization'}
          icon={iconSettings}
          title="Customization"
          description="Profile modules customization"
        >
          <pre>{JSON.stringify(formCustomization, null, 2)}</pre>
        </TabContent>

        <TabContent
          active={activeTab === 'api-auth'}
          icon={iconKey}
          title="API & Auth"
          description="Configure the API and authentication settings"
        >
          <div class="flex *:grow *:basis-[0] *:min-w-0 gap-6">
            <div>
              <form
                autocomplete="off"
                onsubmit={onSubmitLastFmApiKey}
                class="flex flex-col gap-3 items-start rounded-xl"
              >
                <div class="flex flex-col gap-2 w-full items-start">
                  <label
                    for="lastFmApiKey"
                    class="text-sm font-medium"
                  >Last.fm API Key</label>

                  <div class="flex gap-1 w-full items-center">
                    <div class="grow">
                      <input
                        type="text"
                        onfocus={handleApiKeyFocus}
                        onblur={handleApiKeyBlur}
                        disabled={lastfmApiKeyValidationInProgress}
                        readonly={!!lastfmApiKeySaved}
                        id="lastFmApiKey"
                        class="
                          w-full block min-w-0 font-mono rounded-lg outline-none
                          border text-sm p-2.5
                          bg-orange-700/50 border-orange-600 placeholder-zinc-400 text-white
                          focus:border-zinc-500 focus:ring-orange-500 focus:border-orange-500 focus:placeholder-transparent
                          disabled:opacity-50 disabled:cursor-wait
                          read-only:bg-orange-900/50 read-only:border-transparent read-only:cursor-default
                        "
                        bind:value={lastfmApiKey}
                        bind:this={lastfmApiKeyInput}
                        placeholder="PASTE API KEY HERE"
                      />
                    </div>
                  </div>
                </div>
                <div class="flex gap-4 px-2.5 items-center w-full">
                  {#if !lastfmApiKeySaved}
                    <button
                      type="submit"
                      disabled={lastfmApiKeyValidationInProgress || !!lastfmApiKeySaved}
                      class="
                        inline-flex gap-2 cursor-pointer px-5 py-2 text-sm font-medium text-white items-center border-1
                        bg-yellow-900/50 border-yellow-800 hover:bg-yellow-800/50 disabled:opacity-50 disabled:pointer-events-none
                        focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-blue-300
                        rounded-lg text-center
                      "
                    >
                      {@render iconKey(5)}
                      Save API Key
                    </button>
                  {/if}
                  {#if lastfmApiKeySaved}
                    <button
                      type="button"
                      onclick={removeApiKey}
                      class="
                        inline-flex ml-auto gap-2 cursor-pointer p-0 text-sm font-medium items-center
                        hover:text-red-400 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-blue-300
                        hover:underline
                      "
                    >
                      Remove API Key
                    </button>
                  {/if}
                  {#if !lastfmApiKeySaved}
                  <div class="flex items-center ml-auto gap-3">
                    <a href="https://www.last.fm/api/account/create" target="_blank" class="text-zinc-400 text-xs hover:text-zinc-300 flex items-center gap-2">
                      <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4">
                        <line x1="10.8492" y1="13.0606" x2="19.435" y2="4.47485" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.7886 4.12134L20.1421 8.01042" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.7886 4.12134L15.8995 3.76778" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18 13.1465V17.6465C18 19.3033 16.6569 20.6465 15 20.6465H6C4.34315 20.6465 3 19.3033 3 17.6465V8.64648C3 6.98963 4.34315 5.64648 6 5.64648H10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Create new API key
                    </a>
                    <a href="https://www.last.fm/api/accounts" target="_blank" class="text-zinc-400 text-xs hover:text-zinc-300 flex items-center gap-2">
                      <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4">
                        <line x1="10.8492" y1="13.0606" x2="19.435" y2="4.47485" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.7886 4.12134L20.1421 8.01042" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M19.7886 4.12134L15.8995 3.76778" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18 13.1465V17.6465C18 19.3033 16.6569 20.6465 15 20.6465H6C4.34315 20.6465 3 19.3033 3 17.6465V8.64648C3 6.98963 4.34315 5.64648 6 5.64648H10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      See my API keys
                    </a>
                  </div>
                  {/if}
                </div>

                {#if lastfmApiKeySaved}
                  <div class="flex items-center gap-2 border-zinc-600 text-xs border rounded-xl p-2">
                    {@render iconSuccess()} API key configured successfully. Enhanced features and higher Last.fm API rate limits are now available.
                  </div>
                {/if}

                <div class="text-xs text-zinc-400">
                  Optional: Provides access to additional Last.fm features and higher rate limits
                </div>
              </form>
            </div>
            <div class="flex flex-col gap-2">
              {#if !isLoggedIn()}
                <form
                  autocomplete="off"
                  onsubmit={(e) => {e.preventDefault();}}
                  class="flex flex-col gap-2 items-start rounded-xl bg-zinc-800 p-4 border-2 border-zinc-700"
                >
                  <button type="submit" class="inline-flex gap-2 cursor-pointer px-5 py-2.5 text-sm font-medium text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus-visible:ring-4 focus-visible:outline-none focus-visible:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus-visible:ring-blue-800">
                    {@render iconKey(5)}
                    Login
                  </button>
                </form>
              {:else if userData}
                <div class="text-sm">Logged in as:</div>
                <div class="flex flex-col gap-3">
                  <a
                    href={userData.url}
                    target="_blank"
                    class="h-10 flex items-center justify-between bg-zinc-700/50 pr-2.5 rounded-r-lg rounded-l-[2.5rem] hover:bg-zinc-700/70 transition-colors text-zinc-400 hover:text-white"
                  >
                    <span class="flex items-center gap-2 h-full">
                      <img
                        src={userData.image}
                        alt={userData.name?.[1]?.toUpperCase() || ''}
                        class="h-10 w-10 bg-zinc-700 text-center rounded-full outline outline-1 outline-zinc-300"
                      >
                      <strong class="text-white">{userData.name}</strong>
                    </span>
                    <span class="text-xs">Click to open profile</span>
                  </a>
                  <div class="flex gap-2 px-2.5">
                    <button
                      type="button"
                      onclick={logout}
                      class="
                        inline-flex ml-auto gap-2 cursor-pointer p-0 text-sm font-medium items-center
                        hover:text-red-400 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-blue-300
                        hover:underline
                      "
                    >
                      Logout
                    </button>
                  </div>
                  <div class="flex items-center gap-2 border-zinc-600 text-xs border rounded-xl p-2">
                    {@render iconSuccess()} <p>Logged in as <strong>{userData.name}</strong> last.fm user. Personal scrobbling stats and additional Profile features are now available.</p>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </TabContent>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="flex gap-2 justify-end">
      <button type="button" class="inline-flex gap-2 cursor-pointer px-5 py-2.5 text-sm font-medium text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus-visible:ring-4 focus-visible:outline-none focus-visible:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus-visible:ring-blue-800" onclick={reset}>
        Reset
      </button>
      <button type="submit" class="inline-flex gap-2 cursor-pointer px-5 py-2.5 text-sm font-medium text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus-visible:ring-4 focus-visible:outline-none focus-visible:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus-visible:ring-blue-800" onclick={submit}>
        {@render iconSettings(5)}
        Save Configuration
      </button>
    </div>
  </main>

  <footer class="flex flex-col gap-6 py-4 px-6 bg-zinc-900">
    <div class="max-w-screen-lg mx-auto w-full">
      <div class="text-xs text-zinc-400 flex gap-1 justify-between">
        <div>
          <strong>Disclaimer:</strong> This extension is a third-party tool and it's not affiliated with Last.fm or RYM.
        </div>
        <div class="text-white">
          <a class="hover:underline" href="mailto:landenmetal@gmail.com">Contact developer</a>&nbsp;&nbsp;|&nbsp;&nbsp;<span>RYM Last.fm Stats © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  </footer>
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
