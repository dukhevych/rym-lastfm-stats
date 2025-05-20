import * as utils from '@/helpers/utils.js';

export const INFO_CONTAINER_SELECTOR = '.album_info tbody';
export const INFO_ARTISTS_SELECTOR = '.album_info [itemprop="byArtist"] a.artist';
export const INFO_ALBUM_TITLE_SELECTOR = '.album_title';
export const INFO_ALBUM_RELEASE_YEAR_SELECTOR = '.album_info a[href^="/charts/top/"] b';

export function getReleaseYear() {
  const yearElement = document.querySelector(INFO_ALBUM_RELEASE_YEAR_SELECTOR);
  if (!yearElement) return null;
  const yearText = yearElement.textContent.trim();
  const match = yearText.match(/^\d{4}/);
  return match ? Number(match[0]) : null;
}

export function getArtistNames() {
  const artistLinks = document.querySelectorAll(INFO_ARTISTS_SELECTOR);
  return Array.from(artistLinks)
    .map((artist) => {
      let localizedName = artist.querySelector('.subtext')?.textContent || '';
      if (localizedName) {
        localizedName = localizedName.replace(/^\[|\]$/g, '');
      }
      return {
        artistNameLocalized: localizedName,
        artistName: utils.getDirectInnerText(artist),
      };
    });
}

export function getReleaseTitle() {
  const title = document.querySelector(INFO_ALBUM_TITLE_SELECTOR);
  if (!title) return null;
  return Array.from(title.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .join('');
}
