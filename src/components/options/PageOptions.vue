<template>
  <div></div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import browser from 'webextension-polyfill';

// HELPERS
import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import {
  storageGet,
  storageSet,
  getUserData,
  getProfileOptions,
  updateProfileOptions,
  getLastFmApiKey,
  setLastFmApiKey,
} from '@/helpers/storageUtils';

// ENVIRONMENT CONSTANTS
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

// FLAGS
const loading = ref(true);
const saved = ref(false);
const dirty = ref(false);
const showModal = ref(false);
const identityApiSupported = !!(browser.identity && browser.identity.launchWebAuthFlow);
const fallbackUsername = ref('');

// STATE
const options = reactive(Object.assign({}, constants.PROFILE_OPTIONS_DEFAULT));
const config = ref<AddonOptions>();
const lastFmApiKey = ref<string>();
const userData = ref<UserData>();
const isLoggedIn = computed(() => {
  return userData.value && userData.value.name;
});
const rymSyncTimestamp = ref<number>();

const dbRecordsQty = ref<number>();

let submitTimer: NodeJS.Timeout | null = null;

const submit = async () => {
  const newConfig = JSON.parse(JSON.stringify(options));

  Object.keys(newConfig).forEach((key) => {
    if (config.value && newConfig[key] === config.value[key as keyof AddonOptions]) {
      delete newConfig[key];
    }
  });

  await updateProfileOptions(newConfig);

  config.value = newConfig;
  saved.value = true;

  if (submitTimer) {
    clearTimeout(submitTimer);
  }

  submitTimer = setTimeout(() => {
    if (!dirty.value) {
      saved.value = false;
    }
  }, 3000);
  dirty.value = false;
};

const closeModalHandler = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    showModal.value = false;
  }
}

const init = async () => {
  try {
    const syncedOptions = await getProfileOptions();
    dbRecordsQty.value = await RecordsAPI.getQty()

    config.value = syncedOptions;

    Object.assign(options, config.value);

    const syncedUserData = await getUserData();

    userData.value = syncedUserData;

    rymSyncTimestamp.value = await storageGet('rymSyncTimestamp', 'local');

    lastFmApiKey.value = await getLastFmApiKey();

    watch(
      () => [options, lastFmApiKey],
      async () => {
        saved.value = false;
        dirty.value = true;
        await setLastFmApiKey(lastFmApiKey.value || '');
        submit();
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
