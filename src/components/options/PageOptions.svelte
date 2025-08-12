<svelte:options runes={true} />

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';
import { watch } from 'runed';
import browser from 'webextension-polyfill';

import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import {
  storageGet,
  storageSet,
  storageRemove,
  getSyncedUserData,
  getSyncedOptions,
  updateSyncedOptions,
} from '@/helpers/storageUtils';
import * as utils from '@/helpers/utils';

import FormToggle from './FormToggle.svelte';

const appVersion = process.env.APP_VERSION;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

let loading = $state(true);
let saved = $state(false);
let dirty = $state(false);
let signinInProgress = $state(false);
let showModal = $state(false);
const identityApiSupported = $state(
  !!(browser.identity && browser.identity.launchWebAuthFlow),
);
let fallbackUsername = $state('');
const options: Partial<AddonOptions> = $state({});
let config = $state<AddonOptions>();
let userData = $state<UserData>();
let dbRecordsQty = $state<number>();
const isLoggedIn = $derived(() => !!userData?.name);
let rymSyncTimestamp = $state<number>();
let lastfmApiInputType = $state('password');

let submitTimer: NodeJS.Timeout | null = null;

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

const submit = async () => {
  const newConfig = JSON.parse(JSON.stringify(options));

  Object.keys(newConfig).forEach((key) => {
    if (config && newConfig[key] === config[key as keyof AddonOptions]) {
      delete newConfig[key];
    }
  });

  await updateSyncedOptions(newConfig);

  config = newConfig;
  saved = true;

  if (submitTimer) {
    clearTimeout(submitTimer);
  }

  submitTimer = setTimeout(() => {
    if (!dirty) {
      saved = false;
    }
  }, 3000);
  dirty = false;
};

const reset = async () => {
  const doConfirm = confirm('Are you sure you want to reset all settings?');
  if (!doConfirm) return;
  Object.assign(options, constants.PROFILE_OPTIONS_DEFAULT);
  await submit();
};

const openAuthPage = async () => {
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
};

const closeModalHandler = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    showModal = false;
  }
};

const init = async () => {
  try {
    const syncedOptions = await getSyncedOptions();
    dbRecordsQty = await RecordsAPI.getQty();

    config = syncedOptions;

    Object.assign(options, config);

    const syncedUserData = await getSyncedUserData();

    userData = syncedUserData;

    rymSyncTimestamp = await storageGet('rymSyncTimestamp', 'local');

    const debouncedSubmit = utils.debounce(() => {
      submit();
    }, 300);

    // watch(
    //   () => options,
    //   () => {
    //     saved = false;
    //     dirty = true;
    //     debouncedSubmit();
    //   },
    //   { deep: true },
    // );
    loading = false;
  } catch (error) {
    console.error(error);
  }
};

// $effect(
//   () => {
//     if (showModal) {
//       document.body.style.overflow = 'hidden';
//       document.addEventListener('keydown', closeModalHandler);
//     } else {
//       document.body.style.overflow = '';
//       document.removeEventListener('keydown', closeModalHandler);
//     }
//   },
// );

const hasApiKey = $derived(
  () => !!(options.lastfmApiKey && options.lastfmApiKey.length === 32),
);

const openRymSync = () => {
  window.open('https://rateyourmusic.com/music_export?sync', '_blank');
};

const logout = async () => {
  const doConfirm = confirm('Are you sure you want to logout?');
  if (!doConfirm) return;
  await storageRemove('userData');
  userData = undefined;
};

const reportIssueUrl = $derived(() => {
  const baseUrl = 'https://github.com/dukhevych/rym-lastfm-stats/issues/new';

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    browser: navigator.userAgent,
    'extension-version': browser.runtime.getManifest().version,
  });

  return `${baseUrl}?${params.toString()}`;
});

const fallbackLogin = async () => {
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
};

watch(
  () => $state.snapshot(options),
  (v, v2) => {
    console.log('options changed');
    console.log(JSON.stringify(v, null, 2));
    console.log(JSON.stringify(v2, null, 2));
  },
  { lazy: true },
);

init();

interface CardProps {
  isValid: boolean;
  title: string;
  validStatus: string;
  invalidStatus: string;
  action?: () => void;
  hasWarning?: boolean;
  isLoading?: boolean;
}
</script>

{#snippet card({
  isValid,
  hasWarning = false,
  isLoading = false,
  title,
  validStatus,
  invalidStatus,
  action,
}: CardProps)}
  <svelte:element
    this={!isValid && action ? 'button' : 'div'}
    data-slot="card"
    class="text-card-foreground flex flex-col gap-6 rounded-xl py-6 border-2"
    class:shadow-sm={isValid}
    class:border-green-200={isValid}
    class:bg-green-50={isValid}
    class:dark:bg-green-900={isValid}
    class:dark:border-green-800={isValid}
    class:border-zinc-200={!isValid}
    class:bg-zinc-50={!isValid}
    class:dark:bg-zinc-900={!isValid}
    class:dark:border-zinc-800={!isValid}
    class:cursor-pointer={!isValid && action}
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

        <div class="text-left">
          <h3 class="font-bold">{title}</h3>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {isValid ? validStatus : invalidStatus}
          </div>
        </div>
      </div>
    </div>
  </svelte:element>
{/snippet}

{#snippet iconSuccess()}
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
    class="lucide lucide-circle-check-big h-5 w-5 text-green-600"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <path d="m9 11 3 3L22 4"></path>
  </svg>
{/snippet}

{#snippet iconError()}
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
    class="lucide lucide-circle-x-big h-5 w-5 text-red-600"
  >
    <path d="M18 6L6 18"></path>
    <path d="M6 6l12 12"></path>
  </svg>
{/snippet}

<div class="min-h-viewport flex flex-col">
  <header>
    <nav class="navbar bg-base-200 shadow-sm">
      <div class="max-w-screen-xl mx-auto flex grow items-center justify-center py-3">
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
  <main class="max-w-screen-xl mx-auto w-full">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {@render card({
        isValid: isLoggedIn(),
        title: 'Last.fm OAuth',
        validStatus: 'Connected',
        invalidStatus: 'Not connected',
        action: openAuthPage,
      })}
      {@render card({
        isValid: hasApiKey(),
        title: 'API Key',
        validStatus: 'Configured',
        invalidStatus: 'Not configured',
      })}
      {@render card({
        isValid: !!rymSyncTimestamp,
        title: 'RYM Sync',
        validStatus: 'Completed',
        invalidStatus: 'Not completed',
      })}
    </div>

    <form>
      <h2>Modules Turn On/Off</h2>
      <fieldset>
        <!-- {#each constants.MODULES_ARRAY as module}
          <div>
            <FormToggle bind:checked={options[module as keyof ModuleToggleConfig]} label={module} />
          </div>
        {/each} -->
      </fieldset>
    </form>
  </main>
  <div>
    <button class="btn btn-neutral">Neutral</button>
    <button class="btn btn-primary">Primary</button>
    <button class="btn btn-secondary">Secondary</button>
    <button class="btn btn-accent">Accent</button>
    <button class="btn btn-info">Info</button>
    <button class="btn btn-success">Success</button>
    <button class="btn btn-warning">Warning</button>
    <button class="btn btn-error">Error</button>
  </div>
</div>

<ul class="steps steps-vertical lg:steps-horizontal">
  <li class="step step-primary">Register</li>
  <li class="step step-primary">Choose plan</li>
  <li class="step">Purchase</li>
  <li class="step">Receive Product</li>
</ul>

<style>
/* fix for Chrome default extension font style */
:global(body) {
  font-size: inherit;
  font-family: inherit;
}
</style>
