import * as utils from '@/helpers/utils';
import { RYMDiscographyType } from '@/helpers/enums';

export const PARENT_SELECTOR = '.artist_left_col';
export const ARTIST_ID_SELECTOR = 'input.rym_shortcut';
export const ARTIST_INFO_SELECTOR = '.artist_info_main';

export function getArtistId(parent: HTMLElement) {
  const artistIdInput: HTMLInputElement = parent.querySelector(ARTIST_ID_SELECTOR)!;
  return utils.extractIdFromTitle(artistIdInput.value);
}

export function getArtistNames(parent: HTMLElement) {
  let artistAkaNames: string[] = [];
  const currentRelativeUrl = decodeURIComponent(window.location.pathname);

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

  const discographyParent = document.getElementById('discography');
  const additionalArtists = new Set<string>();

  if (discographyParent) {
    const possibleIds = [
      RYMDiscographyType.Album,
      RYMDiscographyType.EP,
      RYMDiscographyType.Single,
    ].map(type => `disco_type_${type}`);

    Array.from(discographyParent.children)
      .forEach(child => {
        if (!possibleIds.includes(child.id)) return;
        const artists = new Set<string>();
        Array.from(child.querySelectorAll(`.disco_subline a.disco_sub_artist[href="${currentRelativeUrl}"]`)).forEach(artistLink => {
          const artistName = utils.getDirectInnerText(artistLink);
          artistName && artists.add(artistName);

          const localizedName = (artistLink.querySelector('span.subtext')?.textContent ?? '').trim();
          localizedName && artists.add(utils.removeArtistNameBrackets(localizedName));
        });
        artists.forEach(artist => additionalArtists.add(artist));
      });
  }

  additionalArtists.delete(artistName);
  additionalArtists.delete(artistNameLocalized);

  return {
    artistName,
    artistNameLocalized,
    artistAkaNames,
    artistAdditionalNames: Array.from(additionalArtists),
  };
}