import { extractNumbers } from '@/helpers/string';

export const PARENT_SELECTOR = '#page_sections_song_temp';
export const MOUNT_TARGET_SELECTOR = '.page_song_header_info .page_section_main_info_music_rating_main';

const INFO_SONG_ID = '.page_section_share_method_labeled input[aria-label="RYM Shortcut"]';
const INFO_ARTISTS_SELECTOR = '.page_song_header_info_artist a.artist';

// Artist names extraction with fallbacks
export function getArtistNames(parentEl: HTMLElement): RYMArtistNames {
  const anchors = parentEl.querySelectorAll<HTMLAnchorElement>(INFO_ARTISTS_SELECTOR);
  const artists: RYMArtistNames = [];

  anchors.forEach((a) => {
    const original = a.querySelector('.ui_name_locale_original')?.textContent?.trim() || '';
    const language = a.querySelector('.ui_name_locale_language')?.textContent?.trim() || '';
    const fallback = a.querySelector('.ui_name_locale')?.childNodes?.[0]?.textContent?.trim() || '';

    let artistName = '';
    let artistNameLocalized = '';

    if (original && language) {
      artistName = original; // canonical = 제니
      artistNameLocalized = language; // localized = Jennie
    } else if (original) {
      artistName = original;
    } else if (fallback) {
      artistName = fallback;
    } else {
      const hrefName = decodeURIComponent(a.getAttribute('href')?.split('/').pop() || '');
      artistName = hrefName;
      artistNameLocalized = hrefName;
    }

    artists.push({
      artistName,
      artistNameLocalized,
    });
  });

  return artists;
}

// Bulletproof song title extraction with multiple strategies
export function getSongTitle(parentEl: HTMLElement): string {
  const strategies = [
    () => {
      const title = parentEl.querySelector('.page_song_header_main_info h1 .ui_name_locale_original');
      return (title?.textContent || '').trim();
    },

    () => {
      const breadcrumbItem = parentEl.querySelector('#page_song_breadcrumb li:last-child span');
      return (breadcrumbItem?.textContent || '').trim();
    },

    () => {
      const mediaLinkContainer = parentEl.querySelector('.media_link_container');
      const dataAlbumsValue = mediaLinkContainer?.getAttribute('data-albums');
      return dataAlbumsValue;
    },
  ];

  for (const strategy of strategies) {
    const value = strategy();
    if (value) return value;
  }

  return '';
}

// Bulletproof song ID extraction with multiple strategies
export function getSongId(parentEl: HTMLElement): string {
  const strategies = [
    () => {
      const input = parentEl.querySelector(INFO_SONG_ID) as HTMLInputElement | null;
      return input?.value ? extractNumbers(input.value) : '';
    },

    () => {
      const mediaLinkContainer = parentEl.querySelector('.media_link_container');
      return mediaLinkContainer?.id ? extractNumbers(mediaLinkContainer.id) : '';
    },

    () => {
      const listsRoot = parentEl.querySelector('#page_section_lists_root');
      const assocId = listsRoot?.getAttribute('data-assoc-id');
      return assocId ? extractNumbers(assocId) : '';
    },

    () => {
      const addBtn = parentEl.querySelector('.page_section_lists_header_add button[onclick*="onClickAddToList"]');
      const onclick = addBtn?.getAttribute('onclick');
      if (!onclick) return '';

      const match = onclick.match(/onClickAddToList\([^,]+,\s*['"](\d+)['"]\)/);
      return match?.[1] || '';
    }
  ];

  for (const strategy of strategies) {
    const value = strategy();
    if (value) return value;
  }

  return '';
}
