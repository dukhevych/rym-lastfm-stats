<svelte:options runes={true} />

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';
import browser from 'webextension-polyfill';

import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import {
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
import FormToggleGroup from './FormToggleGroup.svelte';
import TabContent from './TabContent.svelte';

const appVersion = process.env.APP_VERSION;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

// FLAGS
let isLoading = $state(true);
let signinInProgress = $state(false);

let fallbackUsername = $state('');
let activeTab = $state(new URLSearchParams(window.location.search).get('tab') || 'modules');

const tabs = [
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

let activePreviewKey = $state('');

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
  const newConfig = $state.snapshot(form);
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

{#snippet iconSwitch(size = 4)}
<svg width="800px" height="800px" class="h-4 w-4" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M156.31,43.63a9.9,9.9,0,0,0-14,14,60.1,60.1,0,1,1-85,0,9.9,9.9,0,0,0-14-14c-31,31-31,82,0,113s82,31,113,0A79.37,79.37,0,0,0,156.31,43.63Zm-56.5,66.5a10,10,0,0,0,10-10v-70a10,10,0,0,0-20,0v70A10,10,0,0,0,99.81,110.13Z" fill="currentColor" />
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
      'flex flex-col gap-6 rounded-2xl border-2 text-left',
      isValid ? 'shadow-sm border-teal-800 bg-teal-900/80' : '',
      !isValid ? 'border-zinc-200 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800' : '',
      hasWarning ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-800' : '',
      isLoading ? 'pointer-events-none opacity-50' : '',
      (!isValid && action) ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800' : '',
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
            <div class="text-sm text-zinc-600 dark:text-zinc-400">
              {isValid ? validStatus : invalidStatus}
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
  class="min-h-viewport flex flex-col {isLoading ? 'opacity-50 blur-xs' : ''} gap-6"
  style:display={isLoading ? 'none' : 'block'}
>
  <header class="max-w-screen-lg w-full mx-auto flex flex-col gap-2">
    <div class="flex flex-col gap-2 grow items-center justify-center py-6">
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
      <div class="text-muted">
        Configure your Last.fm and RateYourMusic integration settings
      </div>
    </div>
    <!-- STATUS CARDS -->
    <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
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
  </header>
  <main
    class="max-w-screen-lg mx-auto w-full flex flex-col gap-3 p-6 bg-zinc-900 border-1 border-zinc-700 rounded-2xl"
  >

    <nav>
      <ul class="flex *:grow gap-2 rounded-2xl p-2 bg-zinc-800">
        {#each tabs as tab}
          <li
            class="
              *:flex *:transition-colors *:items-center *:gap-2 *:justify-center *:rounded-xl *:p-1 *:text-sm
              {activeTab === tab.id ?
                '*:bg-teal-900 pointer-events-none' :
                '*:opacity-50 *:hover:opacity-100'
              }
            "
          >
            {@render tabLink({
              href: '#',
              label: tab.label,
              icon: tab.icon,
              onClick: () => activeTab = tab.id,
            })}
          </li>
        {/each}
      </ul>
    </nav>

    <div>
      <TabContent
        active={activeTab === 'modules'}
        icon={iconSwitch}
        title="Modules Settings"
        description="Enable or disable specific enhancement modules."
      >
        <aside class="flex flex-col gap-8 w-1/3">
          <FormToggleGroup title="Last.fm Stats">
            {#snippet note()}
              Updates once in &lt; <strong>{utils.msToHuman(constants.getStatsCacheLifetime(userData?.name, lastfmApiKey))}</strong> &gt;
            {/snippet}
            {#snippet warning()}
              {#if !isLoading && (!lastfmApiKey || !isLoggedIn())}
                <div class="text-xs text-orange-200 flex flex-col gap-1">
                  {#if !lastfmApiKey}
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
              bind:checked={form.artistArtistStats}
              name="artistArtistStats"
            />

            <FormToggle
              label="Release Statistics"
              description="Show Last.fm stats on release pages"
              bind:checked={form.releaseReleaseStats}
              name="releaseReleaseStats"
            />

            <FormToggle
              label="Song Statistics"
              description="Show Last.fm stats on song pages"
              bind:checked={form.songSongStats}
              name="songSongStats"
            />
          </FormToggleGroup>

          <FormToggleGroup title="Profile">
            {#snippet note()}
              {#if !isLoading && !lastfmApiKey}
                <span class="text-orange-200 not-italic">
                  ⚠️ Last.fm API key is required
                </span>
              {/if}
            {/snippet}

            <FormToggle
              label="Recent Tracks Widget"
              description="Show recent tracks on profile"
              bind:checked={form.profileRecentTracks}
              disabled={!lastfmApiKey}
              name="profileRecentTracks"
            />
            <FormToggle
              label="Top Albums Widget"
              description="Show top albums on profile"
              bind:checked={form.profileTopAlbums}
              disabled={!lastfmApiKey}
              name="profileTopAlbums"
            />
            <FormToggle
              label="Top Artists Widget"
              description="Show top artists on profile"
              bind:checked={form.profileTopArtists}
              disabled={!lastfmApiKey}
              name="profileTopArtists"
            />
            <FormToggle
              label="Strict Search Results"
              description="Enhanced search filtering"
              bind:checked={form.searchStrictResults}
              disabled={!lastfmApiKey}
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
              bind:checked={form.listUserRating}
              name="listUserRating"
            />

            <FormToggle
              label="Chart User Ratings"
              description="Show ratings in charts"
              bind:checked={form.chartsUserRating}
              name="chartsUserRating"
            />
          </FormToggleGroup>
        </aside>

        <!-- Visual preview -->
        <div class="w-2/3 *:w-full *:max-w-[800px] flex items-center flex-col gap-3">
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
      </TabContent>

      <TabContent
        active={activeTab === 'customization'}
        icon={iconSettings}
        title="Customization"
        description="Profile modules customization"
      >
        SETTINGS GO HERE
      </TabContent>

      <TabContent
        active={activeTab === 'api-auth'}
        icon={iconKey}
        title="API & Auth"
        description="Configure the API and authentication settings"
      >
        SETTINGS GO HERE
      </TabContent>
    </div>

    <div class="flex justify-end">
      <button type="submit" class="inline-flex gap-2 cursor-pointer px-5 py-2.5 text-sm font-medium text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 focus-visible:ring-4 focus-visible:outline-none focus-visible:ring-blue-300 rounded-lg text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus-visible:ring-blue-800" onclick={submit}>
        {@render iconSettings(5)}
        Save Configuration
      </button>
    </div>
  </main>
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
