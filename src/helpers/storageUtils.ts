import browser from 'webextension-polyfill';
import * as constants from './constants';

const STORAGE_TYPES = ['local', 'sync'];

export type StorageType = 'local' | 'sync';

export interface StorageGetResult { [key: string]: any; }

export function storageGet<T = StorageGetResult>(
  keys: string | string[] | null,
  storageType: StorageType = 'sync'
): Promise<T> {
  if (!STORAGE_TYPES.includes(storageType)) throw new Error(`Invalid storage type: ${storageType}`);

  return new Promise<T>((resolve, reject) => {
    browser.storage[storageType].get(keys)
      .then((result: StorageGetResult) => {
        if (typeof keys === 'string') {
          resolve(result[keys] as T);
        } else {
          resolve(result as T);
        }
      })
      .catch((err: any) => reject(err));
  });
}

export function storageSet(
  payload: { [key: string]: any; },
  storageType: StorageType = 'sync'
): Promise<void> {
  if (!STORAGE_TYPES.includes(storageType)) throw new Error(`Invalid storage type: ${storageType}`);
  return browser.storage[storageType].set(payload);
}

export interface StorageRemoveOptions {
  keys: string | string[];
  storageType?: StorageType;
}

export function storageRemove(
  keys: string | string[],
  storageType: StorageType = 'sync'
): Promise<void> {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return browser.storage[storageType].remove(keys);
}

export async function storageGetSyncedWithLocal(keys: string | string[] | null) {
  let result = await storageGet(keys, 'local');
  result = result || await storageGet(keys, 'sync');
  return result;
}

export async function storageSetSyncedWithLocal(payload: { [key: string]: any; }) {
  return Promise.all([
    storageSet(payload, 'sync'),
    storageSet(payload, 'local'),
  ]);
}

export async function getLastFmApiKey() {
  return (await storageGetSyncedWithLocal('lastfmApiKey')) as unknown as string ?? '';
}

export async function setLastFmApiKey(key: string) {
  return storageSetSyncedWithLocal({ lastfmApiKey: key });
}

export async function getRymSyncTimestamp() {
  return (await storageGet('rymSyncTimestamp', 'local')) as unknown as number ?? null;
}

export async function setRymSyncTimestamp(timestamp: number) {
  return storageSet({ rymSyncTimestamp: timestamp }, 'local');
}

export async function getModuleCustomizationConfig() {
  const keysToGet = Object.keys(constants.MODULE_CUSTOMIZATION_CONFIG);
  const result = await storageGetSyncedWithLocal(keysToGet) as ModuleCustomizationConfig;
  return Object.assign({}, constants.MODULE_CUSTOMIZATION_CONFIG, result);
}

export async function setModuleCustomizationConfig(config: ModuleCustomizationConfig) {
  return Promise.all([
    storageSet(config, 'sync'),
    storageSet(config, 'local'),
  ]);
}

export async function getModuleToggleConfig() {
  const keysToGet = Object.keys(constants.MODULE_TOGGLE_CONFIG);
  const result = await storageGetSyncedWithLocal(keysToGet) as ModuleToggleConfig;
  return Object.assign({}, constants.MODULE_TOGGLE_CONFIG, result);
}

export async function setModuleToggleConfig(config: ModuleToggleConfig) {
  return Promise.all([
    storageSet(config, 'sync'),
    storageSet(config, 'local'),
  ]);
}

export async function getProfileOptions(): Promise<AddonOptions> {
  const keysToGet = Object.keys(constants.PROFILE_OPTIONS_DEFAULT);
  const result = await storageGetSyncedWithLocal(keysToGet) as AddonOptions;
  return Object.assign({}, constants.PROFILE_OPTIONS_DEFAULT, result);
}

export async function updateProfileOptions(options: Partial<AddonOptions>) {
  return storageSetSyncedWithLocal(options);
}

export async function getUserData() {
  return (await storageGetSyncedWithLocal('userData')) as UserData;
};

export async function getLastfmUserName() {
  const userData = await getUserData() as UserData;
  return userData?.name ?? '';
};

/**
 * Generates a deterministic and safe key for browser.storage.local/sync
 * based on a prefix and variable input values.
 *
 * - Ensures same key is produced every time for the same inputs (static).
 * - Avoids special character issues by hashing raw data.
 * - Produces short, collision-resistant keys using a simple bitwise hash.
 *
 * @param prefix - The static prefix for your storage key (e.g. 'releaseStats')
 * @param parts - Variable list of values to be encoded into the key
 * @returns A string like 'releaseStats_ab12cd' safe for use as a storage key
 */
export function generateStorageKey(prefix: string, ...parts: (string | number | null | undefined)[]): string {
  // Normalize all parts into strings, replacing null/undefined with ''
  const raw = parts.map(p => String(p ?? '')).join('::');

  // Simple deterministic hash function (bitwise variation of DJB2)
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i); // hash * 31 + charCode
    hash |= 0; // Convert to 32bit integer
  }

  // Convert final hash to base36 (letters + numbers), strip sign
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}
