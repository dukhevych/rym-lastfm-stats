<template>
  <div
    id="app"
    class="min-h-viewport flex flex-col"
  >
    <header
      class="mx-auto flex w-full max-w-[700px] items-center justify-between px-2 py-6"
    >
      <div class="flex items-center gap-3">
        <img
          src="/icons/icon48.png"
          alt=""
        >
        <h1 class="relative cursor-default select-none text-2xl font-bold">
          <span
            class="absolute right-0 top-0 -translate-y-1/2 text-[10px] font-bold"
          >
            {{ appVersion }}
            <template v-if="constants.isDev">DEV</template>
          </span>
          <span class="text-red-600">RYM Last.fm Stats</span>
        </h1>
      </div>
      <div class="flex items-center gap-5">
        <a
          href="https://www.patreon.com/c/BohdanDukhevych"
          target="_blank"
          class="
            font-bold
            hover:underline
          "
        >Patreon</a>
        <a
          :href="reportIssueUrl"
          target="_blank"
          class="
            font-bold
            hover:underline
          "
        >Report issue</a>
      </div>
    </header>

    <main class="flex flex-col px-2">
      <div class="mx-auto w-full max-w-[700px]">
        <div
          class="
            flex items-center justify-between gap-2 rounded bg-gray-200 p-4
            dark:bg-gray-800
          "
        >
          <div>
            <div
              v-if="userData"
              class="flex items-center gap-2"
            >
              <a
                v-if="userData.image"
                :href="userData.url"
                target="_blank"
              >
                <img
                  :src="userData.image"
                  alt="Last.fm Profile pic"
                  class="h-8 w-8 rounded-full"
                >
              </a>
              <div>
                Signed in as <strong><a
                  :href="userData.url"
                  target="_blank"
                >{{ userData.name }}</a></strong> (<a
                  href="#"
                  class="
                    text-clr-rym font-bold
                    hover:underline
                  "
                  @click.prevent="logout"
                >logout</a>)
              </div>
            </div>
            <button
              v-if="!userData"
              class="
                bg-clr-lastfm inline-flex min-w-[120px] items-center justify-center gap-3 rounded
                px-4 py-2 font-bold text-white transition-colors
                hover:bg-clr-lastfm-light
                disabled:pointer-events-none disabled:bg-gray-400
              "
              :disabled="signinInProgress"
              @click="openAuthPage"
            >
              <template v-if="signinInProgress">
                In progress...
              </template>
              <template v-else>
                <!-- eslint-disable max-len -->
                <svg
                  fill="currentColor"
                  viewBox="0 0 32 32"
                  class="h-6 w-6"
                >
                  <path d="M14.131 22.948l-1.172-3.193c0 0-1.912 2.131-4.771 2.131-2.537 0-4.333-2.203-4.333-5.729 0-4.511 2.276-6.125 4.515-6.125 3.224 0 4.245 2.089 5.125 4.772l1.161 3.667c1.161 3.561 3.365 6.421 9.713 6.421 4.548 0 7.631-1.391 7.631-5.068 0-2.968-1.697-4.511-4.844-5.244l-2.344-0.511c-1.624-0.371-2.104-1.032-2.104-2.131 0-1.249 0.985-1.984 2.604-1.984 1.767 0 2.704 0.661 2.865 2.24l3.661-0.444c-0.297-3.301-2.584-4.656-6.323-4.656-3.308 0-6.532 1.251-6.532 5.245 0 2.5 1.204 4.077 4.245 4.807l2.484 0.589c1.865 0.443 2.484 1.224 2.484 2.287 0 1.359-1.323 1.921-3.828 1.921-3.703 0-5.244-1.943-6.124-4.625l-1.204-3.667c-1.541-4.765-4.005-6.531-8.891-6.531-5.287-0.016-8.151 3.385-8.151 9.192 0 5.573 2.864 8.595 8.005 8.595 4.14 0 6.125-1.943 6.125-1.943z" />
                </svg>
                <!-- eslint-enable max-len -->
                <span>Sign in with Lastfm</span>
              </template>
            </button>
          </div>
          <button
            type="button"
            class="
              rounded bg-blue-500 px-4 py-2 font-bold text-white
              hover:bg-blue-700
            "
            @click.prevent="showModal = true"
          >
            How it works?
          </button>
        </div>

        <!-- RYM SYNC -->
        <div
          class="
            mt-4 flex items-center justify-between gap-2 rounded bg-gray-200 p-4
            dark:bg-gray-800
          "
        >
          <div>
            <p><strong>{{ rymSyncMessage }}</strong></p>
            <strong><code>{{ dbRecordsQty }}</code></strong> records synced with RYM
          </div>
          <button
            type="button"
            class="
              rounded bg-orange-500 px-4 py-2 font-bold text-white
              hover:bg-orange-700
            "
            :class="{
              'bg-red-500 hover:bg-red-700': !rymSyncTimestamp,
            }"
            @click.prevent="openRymSync"
          >
            <template v-if="rymSyncTimestamp">
              Re-sync
            </template>
            <template v-else>
              Run RYM Sync
            </template>
          </button>
        </div>

        <!-- Modal -->
        <div
          v-show="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          @click.self="showModal = false"
        >
          <div
            class="
              mx-2 my-[2vh] flex max-h-[96vh] w-full max-w-[1024px] flex-col self-start rounded
              rounded-lg bg-gray-200 shadow-lg
              dark:bg-gray-800
            "
          >
            <div
              class="
                bg-rym-gradient flex shrink-0 items-center justify-between px-6 py-3 font-bold
                text-white
                [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]
              "
            >
              <h2 class="text-xl font-bold">
                How it works?
              </h2>
              <button
                class="
                  flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 p-2
                  text-gray-500
                  hover:text-gray-700
                "
                @click="showModal = false"
              >
                <!-- eslint-disable max-len -->
                <svg
                  class="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 10.586l6.293-6.293 1.414 1.414L13.414 12l6.293 6.293-1.414 1.414L12 13.414l-6.293 6.293-1.414-1.414L10.586 12 4.293 5.707l1.414-1.414z"
                  />
                </svg>
                <!-- eslint-enable max-len -->
              </button>
            </div>
            <div class="flex flex-col gap-2 overflow-y-auto px-6 py-6">
              <p>
                <strong>RYM Last.fm Stats displays Last.fm data directly on RateYourMusic pages.</strong>
              </p>
              <p>
                By default extension only adds <strong>global listening stats</strong> on artist and release pages.
              </p>
              <p>This data is <strong>updated once per day</strong> and <strong>not personalized</strong>.</p>
              <div class="my-4 flex flex-col gap-1">
                <div class="flex w-full gap-1">
                  <img
                    src="/images/artist-static.jpg"
                    alt=""
                    class="block w-1/2 max-w-full"
                  >
                  <img
                    src="/images/release-static.jpg"
                    alt=""
                    class="block w-1/2 max-w-full"
                  >
                </div>
                <div class="text-center text-sm opacity-50">
                  The red boxes here show the global Last.fm stats that appear without a personal API key.
                </div>
              </div>

              <h2 class="my-2 text-xl font-bold">
                🔓 Unlock full stats with your own Last.fm API key
              </h2>
              <p>
                With your own Last.fm API key, <strong>you’ll remove all limits</strong> from artist and release stats.
              </p>
              <p>You’ll also get:</p>
              <ul class="my-2 list-disc pl-5">
                <li>
                  ✅ <strong>Personal</strong> scrobbling stats on artist and release pages
                </li>
                <li>
                  🧩 New profile sections:
                  <strong>Recently scrobbled tracks</strong>,
                  <strong>Top albums</strong>,
                  <strong>Top artists</strong>
                </li>
                <li>
                  👥 View this data on other users’ profiles (if their Last.fm username is found on page)
                </li>
              </ul>
              <img
                src="/images/recent.jpg"
                alt=""
                class="block h-auto w-full"
              >
              <img
                src="/images/top.jpg"
                alt=""
                class="block h-auto w-full"
              >
            </div>
            <div class="flex shrink-0 justify-end p-6">
              <button
                class="
                  rounded bg-blue-500 px-4 py-2 text-white
                  hover:bg-blue-700
                "
                @click="showModal = false"
              >
                Got it
              </button>
            </div>
          </div>
        </div>

        <form
          v-if="!loading"
          class="flex flex-col gap-5 py-5"
          @submit.prevent="submit"
        >
          <!-- MAIN SETTINGS -->
          <FormFieldset title="Last.fm API Key">
            <template #helper>
              <p>
                API Key is required for Profile enhancements and personal scrobbling stats on Artist and Release pages.
              </p>
            </template>

            <!-- LAST.FM API KEY -->
            <FormInput
              v-model="options.lastfmApiKey"
              name="lastfmApiKey"
              clearable
              placeholder="Add your lastfm API key here"
              min="32"
              max="32"
              :type="lastfmApiInputType"
              @focus="handleApiKeyFocus"
              @blur="handleApiKeyBlur"
            >
              <template #hint>
                Used for <strong>Enhanced Profile</strong>
                and unlocks <strong>personal scrobbling stats</strong> on <strong>Artist/Release</strong> pages.
              </template>
            </FormInput>

            <div class="flex items-center justify-between gap-3">
              <a
                href="https://www.last.fm/api/account/create"
                class="
                  inline-flex min-w-[120px] justify-center rounded bg-blue-600 px-4 py-2 text-sm
                  font-bold text-white transition-colors
                  hover:bg-blue-800
                "
                target="_blank"
              >
                Create New
              </a>
              <a
                href="https://www.last.fm/api/accounts"
                class="
                  font-bold
                  hover:underline
                "
                target="_blank"
              >
                My API Keys
              </a>
            </div>
          </FormFieldset>

          <div
            v-if="!userData || !hasApiKey"
            class="flex items-center gap-3"
          >
            <!-- eslint-disable max-len -->
            <svg
              class="h-6 w-6 shrink-0"
              fill="#cc3300"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              width="800px"
              height="800px"
              viewBox="0 0 478.125 478.125"
              xml:space="preserve"
            >
              <g>
                <g>
                  <g>
                    <circle
                      cx="239.904"
                      cy="314.721"
                      r="35.878"
                    />
                    <path
                      d="M256.657,127.525h-31.9c-10.557,0-19.125,8.645-19.125,19.125v101.975c0,10.48,8.645,19.125,19.125,19.125h31.9 c10.48,0,19.125-8.645,19.125-19.125V146.65C275.782,136.17,267.138,127.525,256.657,127.525z"
                    />
                    <path
                      d="M239.062,0C106.947,0,0,106.947,0,239.062s106.947,239.062,239.062,239.062c132.115,0,239.062-106.947,239.062-239.062 S371.178,0,239.062,0z M239.292,409.734c-94.171,0-170.595-76.348-170.595-170.596c0-94.248,76.347-170.595,170.595-170.595 s170.595,76.347,170.595,170.595C409.887,333.387,333.464,409.734,239.292,409.734z"
                    />
                  </g>
                </g>
              </g>
            </svg>
            <!-- eslint-enable max-len -->
            <p>
              To enable advanced features for your <strong>RYM Profile</strong> please
              <a
                v-if="!userData"
                href="#"
                class="
                  text-clr-rym font-bold
                  hover:underline
                "
                @click.prevent="openAuthPage"
              >sign in with Last.fm</a>
              <template v-else>
                sign in
              </template>
              and add your Last.fm API Key. You can create it by visiting <a
                href="https://www.last.fm/api/account/create"
                target="_blank"
                class="
                  text-clr-rym font-bold
                  hover:underline
                "
              >this link</a>
              (only "Application" field is required).
              If you already have an API Key, you can find it in your API Applications <a
                href="https://www.last.fm/api/accounts"
                target="_blank"
                class="
                  text-clr-rym font-bold
                  hover:underline
                "
              >here</a>.
            </p>
          </div>

          <!-- PROFILE -->
          <FormFieldset
            title="Profile"
            :disabled="!hasApiKey || !userData"
          >
            <template #helper>
              <p>
                Profile enhancements work only if you're signed in with Last.fm
              </p>
            </template>

            <!-- RECENT TRACKS -->
            <FormCheckbox
              v-model="options.recentTracks"
              name="recentTracks"
              label="Recent tracks"
            />

            <!-- RECENT TRACKS LIMIT -->
            <FormRange
              v-model="options.recentTracksLimit"
              name="recentTracksLimit"
              :label="`Recent tracks limit (${constants.RECENT_TRACKS_LIMIT_MIN}-${constants.RECENT_TRACKS_LIMIT_MAX})`"
              :min="constants.RECENT_TRACKS_LIMIT_MIN"
              :max="constants.RECENT_TRACKS_LIMIT_MAX"
              :disabled="options.recentTracks === false"
            />

            <FormSeparator />

            <!-- TOP ALBUMS -->
            <FormCheckbox
              v-model="options.topAlbums"
              name="topAlbums"
              label="Top albums"
            />

            <FormSeparator />

            <!-- TOP ARTISTS -->
            <FormCheckbox
              v-model="options.topArtists"
              name="topArtists"
              label="Top artists"
            />

            <!-- TOP ARTISTS LIMIT -->
            <FormRange
              v-model="options.topArtistsLimit"
              name="topArtistsLimit"
              :label="`Top artists limit (${constants.TOP_ARTISTS_LIMIT_MIN}-${constants.TOP_ARTISTS_LIMIT_MAX})`"
              :min="constants.TOP_ARTISTS_LIMIT_MIN"
              :max="constants.TOP_ARTISTS_LIMIT_MAX"
              :disabled="options.topArtists === false"
            />
            <!--
            <div style="--hue-start: 35; --hue-end: 70">
              <div
                class="h-10 w-10"
                style="background-color: hsl(var(--hue-start), 100%, 50%)"
              />
              <div
                class="h-10 w-10"
                style="background-color: hsl(var(--hue-end), 100%, 50%)"
              />
              <div
                class="h-10"
                style="background-size: 100% 100%; background-image: linear-gradient(to right, hsl(var(--hue-start), 100%, 50%), hsl(var(--hue-end), 100%, 50%))"
              />
            </div> -->

            <FormSeparator />

            <!-- RYM PLAY HISTORY HIDE -->
            <FormCheckbox
              v-model="options.rymPlayHistoryHide"
              name="rymPlayHistoryHide"
              label="Hide default 'RYM Play History' section"
            />
          </FormFieldset>

          <div class="form-actions flex items-center justify-between gap-5">
            <div class="mr-auto flex items-center gap-5">
              <a
                href="#"
                class="
                  font-bold text-blue-600
                  hover:underline
                "
                @click.prevent="reset"
              >
                Reset Settings
              </a>
            </div>
            <div class="ml-auto flex items-center gap-5">
              <transition name="slide-fade">
                <div
                  v-show="saved"
                  class="text-green-700"
                >
                  <b>Saved!</b>
                </div>
              </transition>
            </div>
          </div>
        </form>
      </div>
    </main>

    <footer
      class="
        mt-auto bg-gray-100 px-2 py-4
        dark:bg-gray-800
      "
    >
      <div
        class="
          mx-auto flex w-full max-w-[700px] items-center justify-between gap-2
          *:grow *:basis-0
        "
      >
        <div>
          <a
            href="mailto:landenmetal@gmail.com"
            target="_blank"
            class="
              flex items-center gap-2 font-bold
              hover:underline
            "
          >
            <!-- eslint-disable max-len -->
            <svg
              class="h-6 w-6"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
            >
              <path d="M3.87 4h13.25C18.37 4 19 4.59 19 5.79v8.42c0 1.19-.63 1.79-1.88 1.79H3.87c-1.25 0-1.88-.6-1.88-1.79V5.79c0-1.2.63-1.79 1.88-1.79zm6.62 8.6l6.74-5.53c.24-.2.43-.66.13-1.07-.29-.41-.82-.42-1.17-.17l-5.7 3.86L4.8 5.83c-.35-.25-.88-.24-1.17.17-.3.41-.11.87.13 1.07z" />
            </svg>
            <!-- eslint-enable max-len -->
            <span>Send Feedback</span>
          </a>
        </div>
        <div class="flex justify-center gap-4">
          <a
            href="https://www.last.fm/user/Landen_13/"
            class="
              font-bold text-blue-500
              hover:underline
            "
            target="_blank"
            title="Me on Last.fm"
          >
            <img
              src="/icons/lastfm.svg"
              alt="Last.fm"
              class="block h-6 w-6"
            >
          </a>
          <a
            href="https://rateyourmusic.com/~Landen"
            class="
              font-bold text-blue-500
              hover:underline
            "
            target="_blank"
            title="Me on RYM"
          >
            <img
              src="/icons/rym.svg"
              alt="RYM"
              class="block h-6 w-6"
            >
          </a>
          <a
            href="https://open.spotify.com/user/11139279910/playlists"
            class="
              font-bold text-blue-500
              hover:underline
            "
            target="_blank"
            title="Impressive Sound playlists"
          >
            <img
              src="/icons/spotify.svg"
              alt="Spotify"
              class="block h-6 w-6"
            >
          </a>
          <a
            href="https://www.linkedin.com/in/dukhevych/"
            class="
              font-bold text-blue-500
              hover:underline
            "
            target="_blank"
            title="LinkedIn"
          >
            <img
              src="/icons/linkedin.svg"
              alt="LinkedIn"
              class="block h-6 w-6"
            >
          </a>
          <a
            href="https://github.com/dukhevych/rym-lastfm-stats"
            class="
              font-bold text-blue-500
              hover:underline
            "
            target="_blank"
            title="GitHub"
          >
            <img
              src="/icons/github.svg"
              alt="Github"
              class="block h-6 w-6"
            >
          </a>
        </div>
        <div class="text-right">
          <strong>RYM Last.fm Stats © {{ new Date().getFullYear() }}</strong>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { RecordsAPI } from '@/helpers/records-api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import * as api from '@/helpers/api';
import FormInput from '@/components/options/FormInput.vue';
import FormCheckbox from '@/components/options/FormCheckbox.vue';
import FormFieldset from '@/components/options/FormFieldset.vue';
import FormRange from './FormRange.vue';
import FormSeparator from './FormSeparator.vue';

const appVersion = process.env.APP_VERSION;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const loading = ref(true);
const options = reactive(Object.assign({}, constants.OPTIONS_DEFAULT));

const config = ref(null);
const userData = ref(null);
const saved = ref(false);
const dirty = ref(false);
const signinInProgress = ref(false);
const showModal = ref(false);
const rymSyncTimestamp = ref(null);

const rymSyncMessage = computed(() => {
  if (!rymSyncTimestamp.value) return '⚠️ RYM Sync not performed yet';
  const date = new Date(rymSyncTimestamp.value);
  return `✅ Last full RYM Sync: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
});

const lastfmApiInputType = ref('password');

function handleApiKeyFocus(e) {
  e.target.select();
  lastfmApiInputType.value = 'text';
}

function handleApiKeyBlur(e) {
  e.target.value = e.target.value.trim();
  lastfmApiInputType.value = 'password';
}

const dbRecordsQty = ref(null);

const submit = async () => {
  const newConfig = JSON.parse(JSON.stringify(options));

  Object.keys(newConfig).forEach((key) => {
    if (newConfig[key] === config.value[key]) {
      delete newConfig[key];
    }
  });

  await utils.storageSet(newConfig);

  config.value = newConfig;
  saved.value = true;
  if (submit.timer) {
    clearTimeout(submit.timer);
  }
  submit.timer = setTimeout(() => {
    if (!dirty.value) {
      saved.value = false;
    }
  }, 3000);
  dirty.value = false;
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

  signinInProgress.value = true;

  try {
    const redirectUri = browserAPI.identity.getRedirectURL();

    const authUrl = `https://www.last.fm/api/auth/?api_key=${SYSTEM_API_KEY}&cb=${encodeURIComponent(redirectUri)}`;

    const redirectUrl = await browserAPI.identity.launchWebAuthFlow({
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

    const normalizedData = {
      name: data.name,
      url: data.url,
      image: data.image[0]?.['#text'],
    };

    userData.value = normalizedData;

    await utils.storageSet({
      userData: normalizedData,
      lastfmSession: sessionKey,
    });

    signinInProgress.value = false;
  } catch (err) {
    console.error('Auth failed:', err);
    signinInProgress.value = false;
  }
};

const closeModalHandler = (e) => {
  if (e.key === 'Escape') {
    showModal.value = false;
  }
}

const init = async () => {
  try {
    const syncedOptions = await utils.getSyncedOptions();
    dbRecordsQty.value = await RecordsAPI.getQty()

    config.value = syncedOptions;

    Object.assign(options, config.value);

    const syncedUserData = await utils.getSyncedUserData();

    userData.value = syncedUserData;

    rymSyncTimestamp.value = await utils.storageGet('rymSyncTimestamp', 'local');

    const debouncedSubmit = utils.debounce(() => {
      submit();
    }, 300);

    watch(
      () => options,
      () => {
        saved.value = false;
        dirty.value = true;
        debouncedSubmit();
      },
      { deep: true },
    );

    watch(
      () => showModal.value,
      () => {
        if (showModal.value) {
          document.body.style.overflow = 'hidden';
          document.addEventListener('keydown', closeModalHandler);
        } else {
          document.body.style.overflow = '';
          document.removeEventListener('keydown', closeModalHandler);
        }
      },
    )
    loading.value = false;
  } catch (error) {
    console.error(error);
  }
};

const hasApiKey = computed(() => {
  return options.lastfmApiKey && options.lastfmApiKey.length === 32;
});

const openRymSync = () => {
  window.open('https://rateyourmusic.com/music_export?sync', '_blank');
}

const logout = async () => {
  const doConfirm = confirm('Are you sure you want to logout?');
  if (!doConfirm) return;
  await browserAPI.storage.sync.remove('userData');
  userData.value = null;
};

const reportIssueUrl = computed(() => {
  const baseUrl = 'https://github.com/dukhevych/rym-lastfm-stats/issues/new';

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    browser: navigator.userAgent,
    'extension-version': browserAPI.runtime.getManifest().version,
  });

  return `${baseUrl}?${params.toString()}`;
});

init();
</script>

<style>
.slide-fade-enter-active {
  transition: all 0.15s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}
.slide-fade-enter-from {
  transform: translateY(-100%);
}
.slide-fade-leave-to {
  transform: translateY(100%);
}

/* fix for Chrome default extension font style */
body {
  font-size: inherit;
  font-family: inherit;
}
</style>
