<template>
  <header
    class="
      bg-gray-200
      dark:bg-gray-800
    "
  >
    <div class="mx-auto flex w-full max-w-[1024px] items-center justify-between px-2 py-6">
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
        <button
          type="button"
          class="
            font-bold
            hover:underline
          "
          @click.prevent="showModal = true"
        >
          Help
        </button>
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

        <div
          v-if="isLoggedIn"
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
            <strong>
              <a
                :href="userData.url"
                target="_blank"
              >{{ userData.name }}</a>
            </strong>
            (<a
              href="#"
              class="
                text-clr-rym font-bold
                hover:underline
              "
              @click.prevent="$emit('logout')"
            >logout</a>)
          </div>
        </div>

        <div v-if="!isLoggedIn">
          <div v-if="identityApiSupported">
            <button
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
                <span>Sign in</span>
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Modal -->
  <div
    v-show="showModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
    @click.self="showModal = false"
  >
    <div
      class="
        mx-2 my-[2vh] flex max-h-[96vh] w-full max-w-[1024px] flex-col self-start rounded rounded-lg
        bg-gray-200 shadow-lg
        dark:bg-gray-800
      "
    >
      <div
        class="
          bg-rym-gradient flex shrink-0 items-center justify-between px-6 py-3 font-bold text-white
          [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]
        "
      >
        <h2 class="text-xl font-bold">
          How it works?
        </h2>
        <button
          class="
            flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 p-2 text-gray-500
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
</template>

<script setup>
import browser from 'webextension-polyfill';
import { computed, ref } from 'vue';
import * as constants from '@/helpers/constants';

const appVersion = process.env.APP_VERSION;

const reportIssueUrl = computed(() => {
  const baseUrl = 'https://github.com/dukhevych/rym-lastfm-stats/issues/new';

  const params = new URLSearchParams({
    template: 'bug_report.yml',
    browser: navigator.userAgent,
    'extension-version': browser.runtime.getManifest().version,
  });

  return `${baseUrl}?${params.toString()}`;
});

const showModal = ref(false);

defineEmits(['logout']);
</script>