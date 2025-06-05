import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

export const INFO_CONTAINER_SELECTOR = '.album_info tbody';
export const INFO_ARTISTS_SELECTOR = '.album_info [itemprop="byArtist"] a.artist';
export const INFO_ALBUM_TITLE_SELECTOR = '.album_title';
export const INFO_ALBUM_RELEASE_YEAR_SELECTOR = '.album_info a[href^="/charts/top/"] b';
export const INFO_RELEASE_ID = '.album_title .album_shortcut';

export function getReleaseYear() {
  const yearElement = document.querySelector(INFO_ALBUM_RELEASE_YEAR_SELECTOR);
  if (!yearElement) return '';
  const yearText = (yearElement.textContent ?? '').trim();
  const match = yearText.match(/^\d{4}/);
  return match ? Number(match[0]) : '';
}

export function getArtistNames() {
  const artistLinks = document.querySelectorAll(INFO_ARTISTS_SELECTOR);
  const artistNames = Array.from(artistLinks)
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

  if (constants.isDev) console.log('Parsed artists:', artistNames);

  return artistNames;
}

export function getReleaseTitle() {
  const title = document.querySelector(INFO_ALBUM_TITLE_SELECTOR);
  if (!title) return '';
  return Array.from(title.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => (node.textContent ?? '').trim())
    .join('');
}

export function getReleaseType() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (!infoTable) return null;
  const typeCell = infoTable.querySelector('tr:nth-child(2) td');
  if (!typeCell || !typeCell.textContent) return null;
  const releaseType = typeCell.textContent.toLowerCase().split(', ')[0];
  return releaseType;
}

export function getReleaseId() {
  const element = document.querySelector(INFO_RELEASE_ID) as HTMLInputElement | null;
  if (!element) return '';
  return utils.extractIdFromTitle(element.value);
}
