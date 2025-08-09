<svelte:options runes={true} />

<div
  class="min-h-viewport flex flex-col"
>
  <header>
    <nav class="navbar bg-base-200 shadow-sm">
      <div class="max-w-screen-xl grow mx-auto flex items-center justify-between">
        <div class="grow flex items-center gap-3">
          <a
            href="https://rateyourmusic.com"
            target="_blank"
            class="flex items-center gap-3"
          >
            <img
              src="/icons/icon48.png"
              alt=""
            >
            <h1 class="relative select-none text-2xl font-bold">
              <span
                class="absolute right-0 top-0 -translate-y-1/2 text-[10px] font-bold"
              >
                {appVersion} {#if constants.isDev}DEV{/if}
              </span>
              <span class="text-red-600">RYM Last.fm Stats</span>
            </h1>
          </a>
        </div>
        <div class="flex gap-2">
          {#if !isLoggedIn() && identityApiSupported}
          <button
            class="btn bg-clr-lastfm font-bold text-white hover:bg-clr-lastfm-light"
            disabled={signinInProgress}
            onclick={openAuthPage}
          >
            {#if signinInProgress}
              In progress...
            {:else}
              <svg
                fill="currentColor"
                viewBox="0 0 32 32"
                class="h-6 w-6"
              >
                <path d="M14.131 22.948l-1.172-3.193c0 0-1.912 2.131-4.771 2.131-2.537 0-4.333-2.203-4.333-5.729 0-4.511 2.276-6.125 4.515-6.125 3.224 0 4.245 2.089 5.125 4.772l1.161 3.667c1.161 3.561 3.365 6.421 9.713 6.421 4.548 0 7.631-1.391 7.631-5.068 0-2.968-1.697-4.511-4.844-5.244l-2.344-0.511c-1.624-0.371-2.104-1.032-2.104-2.131 0-1.249 0.985-1.984 2.604-1.984 1.767 0 2.704 0.661 2.865 2.24l3.661-0.444c-0.297-3.301-2.584-4.656-6.323-4.656-3.308 0-6.532 1.251-6.532 5.245 0 2.5 1.204 4.077 4.245 4.807l2.484 0.589c1.865 0.443 2.484 1.224 2.484 2.287 0 1.359-1.323 1.921-3.828 1.921-3.703 0-5.244-1.943-6.124-4.625l-1.204-3.667c-1.541-4.765-4.005-6.531-8.891-6.531-5.287-0.016-8.151 3.385-8.151 9.192 0 5.573 2.864 8.595 8.005 8.595 4.14 0 6.125-1.943 6.125-1.943z" />
              </svg>
              Sign in
            {/if}
          </button>
          {/if}

          {#if isLoggedIn()}
          <div class="dropdown dropdown-end">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold">{userData?.name}</span>
              <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
                <div class="w-10 rounded-full">
                  <img
                    alt=""
                    src={userData?.image}
                  >
                </div>
              </div>
            </div>
            <ul
              tabindex="0"
              class="menu menu-sm dropdown-content bg-base-200 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <li>
                <a href={userData?.url} target="_blank">
                  Visit Last.fm profile
                </a>
              </li>
              <li><a href="#" onclick={logout}>Logout</a></li>
            </ul>
          </div>
          <!-- <div class="avatar">
            <div class="w-10">
              <img
                src={userData?.image}
                alt=""
              />
            </div>
          </div> -->
          {/if}
        </div>
      </div>
    </nav>
  </header>
  <main>
    <form>
      <h2>Modules Turn On/Off</h2>
      <fieldset>
        {#each constants.MODULES_ARRAY as module}
          <div>
            <FormToggle bind:checked={options[module as keyof ModuleToggleConfig]} label={module} />
          </div>
        {/each}
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

<script lang="ts">
import FormToggle from './FormToggle.svelte';
import { formatDistanceToNow } from 'date-fns';
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

const appVersion = process.env.APP_VERSION;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

let loading = $state(true);
let saved = $state(false);
let dirty = $state(false);
let signinInProgress = $state(false);
let showModal = $state(false);
const identityApiSupported = $state(!!(browser.identity && browser.identity.launchWebAuthFlow));
let fallbackUsername = $state('');
const options = $state(Object.assign({}, constants.OPTIONS_DEFAULT));
let config = $state<AddonOptions>();
let userData = $state<UserData>();
let dbRecordsQty = $state<number>();
const isLoggedIn = $derived(() => userData && userData.name);
let rymSyncTimestamp = $state<number>();
let lastfmApiInputType = $state('password');

let submitTimer: NodeJS.Timeout | null = null;

function handleApiKeyFocus(e: Event) {
  (e.target as HTMLInputElement).select();
  lastfmApiInputType = 'text';
}

function handleApiKeyBlur(e: Event) {
  (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.trim();
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
      interactive: true
    });

    const finalUrl = new URL(redirectUrl);
    const token = finalUrl.searchParams.get("token");

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
}

const init = async () => {
  try {
    const syncedOptions = await getSyncedOptions();
    dbRecordsQty = await RecordsAPI.getQty()

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

const hasApiKey = $derived(() => options.lastfmApiKey && options.lastfmApiKey.length === 32);

const openRymSync = () => {
  window.open('https://rateyourmusic.com/music_export?sync', '_blank');
}

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
  const userDataRaw = await api.fetchUserDataByName(fallbackUsername, SYSTEM_API_KEY!);

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

init();
</script>

<style>
/* fix for Chrome default extension font style */
:global(body) {
  font-size: inherit;
  font-family: inherit;
}
</style>