import * as utils from '@/helpers/utils';

export const PARENT_SELECTOR = '.artist_left_col';
export const ARTIST_ID_SELECTOR = 'input.rym_shortcut';
export const ARTIST_INFO_SELECTOR = '.artist_info_main';

export function getArtistId(parent: HTMLElement) {
  const artistIdInput: HTMLInputElement = parent.querySelector(ARTIST_ID_SELECTOR)!;
  return utils.extractIdFromTitle(artistIdInput.value);
}

export function getArtistNames(parent: HTMLElement) {
  let artistAkaNames: string[] = [];

  const artistNameHeader = parent.querySelector('.artist_name_hdr');
  const artistName = utils.getNodeDirectTextContent(artistNameHeader);
  const artistNameHeaderSpan = artistNameHeader?.querySelector('span');
  const artistNameLocalized = (artistNameHeaderSpan?.textContent ?? '').trim();

  const artistAkaNamesElementHeader = Array.from(parent.querySelectorAll(ARTIST_INFO_SELECTOR + ' .info_hdr')).find(element => {
    return element.textContent?.toLowerCase().includes('also known as');
  });

  if (artistAkaNamesElementHeader) {
    const artistAkaNamesElement = artistAkaNamesElementHeader.nextElementSibling;
    const artistAkaNamesText = artistAkaNamesElement?.querySelector('span')?.textContent;
    if (artistAkaNamesText) {
      artistAkaNamesText.split(', ').forEach(name => {
        const nameCleaned = name.replace(/\s*\[birth name\]$/i, '').trim(); // Check for other patterns to remove
        artistAkaNames.push(nameCleaned);
      });
    }
  }

  return {
    artistName,
    artistNameLocalized,
    artistAkaNames,
  };
}