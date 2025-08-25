import { getDirectInnerText } from '@/helpers/dom';
import { extractNumbers } from '@/helpers/string';

export const PARENT_SELECTOR = '#column_container_right .section_main_info';
export const INFO_TABLE_SELECTOR = '.album_info tbody';
export const INFO_ARTISTS_SELECTOR = '.album_info [itemprop="byArtist"] a.artist';
export const INFO_ALBUM_TITLE_SELECTOR = '.album_title';
export const INFO_ALBUM_RELEASE_YEAR_SELECTOR = '.album_info a[href^="/charts/top/"] b';
export const INFO_RELEASE_ID = '.album_title .album_shortcut';

export function getReleaseYear(parentEl: HTMLElement): number | '' {
  const yearElement = parentEl.querySelector(INFO_ALBUM_RELEASE_YEAR_SELECTOR);
  if (!yearElement) return '';
  const yearText = (yearElement.textContent ?? '').trim();
  const match = yearText.match(/^\d{4}/);
  return match ? Number(match[0]) : '';
}

export function getArtistNames(parentEl: HTMLElement): RYMArtistNames {
  const artistLinks: HTMLAnchorElement[] = Array.from(parentEl.querySelectorAll(INFO_ARTISTS_SELECTOR));

  return Array.from(artistLinks)
    .map((artistLink) => {
      let localizedName = artistLink.querySelector('.subtext')?.textContent || '';
      if (localizedName) {
        localizedName = localizedName.replace(/^\[|\]$/g, '');
      }
      return {
        artistNameLocalized: localizedName,
        artistName: getDirectInnerText(artistLink),
        artistId: extractNumbers(artistLink.title),
      };
    });
}

export function getReleaseTitle(parentEl: HTMLElement): { title: string, titleLocalized: string } {
  const titleElement = parentEl.querySelector(INFO_ALBUM_TITLE_SELECTOR);

  if (!titleElement) return { title: '', titleLocalized: '' };

  let title = getDirectInnerText(titleElement);
  let titleLocalized = (titleElement.querySelector('span:has(+ input)')?.textContent || '').trim();

  return { title, titleLocalized };
}

export function getReleaseType(parentEl: HTMLElement): ERYMReleaseType | null {
  const typeCell = parentEl.querySelector('tr:nth-child(2) td');
  if (!typeCell || !typeCell.textContent) return null;
  return typeCell.textContent.toLowerCase().split(', ')[0] as ERYMReleaseType;
}

export function getReleaseId(parentEl: HTMLElement): string {
  const element = parentEl.querySelector(INFO_RELEASE_ID) as HTMLInputElement | null;
  if (!element) return '';
  return extractNumbers(element.value);
}
