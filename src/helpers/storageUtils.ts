declare const chrome: any;

import browser from 'webextension-polyfill';

import * as constants from './constants';

const STORAGE_TYPES = ['local', 'sync'];

export type StorageType = 'local' | 'sync';

export interface StorageGetResult {
  [key: string]: any;
}

export function storageGet<T = StorageGetResult>(
  keys: string | string[] | null,
  storageType: StorageType = 'sync'
): Promise<T> {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise<T>((resolve, reject) => {
    browser.storage[storageType].get(keys)
      .then((result: StorageGetResult) => {
        if (typeof keys === 'string') {
          resolve(result[keys] as T);
        } else {
          resolve(result as T);
        }
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

export interface StorageSetPayload {
  [key: string]: any;
}

export function storageSet(
  payload: StorageSetPayload,
  storageType: StorageType = 'sync'
): Promise<void> {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

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

export function getSyncedOptions() {
  return storageGet(Object.keys(constants.OPTIONS_DEFAULT));
};

export function getSyncedUserData() {
  return storageGet('userData');
};

export const getFullConfig = async () => {
  const storageItems = await getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };
  return config;
}

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

export async function getLastfmUserName() {
  const userData = await getSyncedUserData() as UserData;
  return userData?.name ?? '';
};