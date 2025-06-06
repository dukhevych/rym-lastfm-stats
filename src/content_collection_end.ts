import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';
import { RecordsAPI } from '@/helpers/records-api';

(async function () {
  window.addEventListener('load', async () => {
    const isMyCollection = utils.isMyCollection();

    if (!isMyCollection) return;

    const collectionPageItems = Array.from(
      document.querySelectorAll('table.mbgen > tbody > tr[id^="page_catalog_item_"]:has(.or_q_rating_date_s)')
    );

    const parsedData: IRYMRecordDB[] = collectionPageItems.map(item => {
      const ratingEl: HTMLImageElement | null = item.querySelector('.or_q_rating_date_s img');
      const releaseLink: HTMLAnchorElement | null = item.querySelector('.or_q_albumartist_td a.album');
      const yearEl: HTMLSpanElement | null = item.querySelector('.or_q_albumartist i:has(a.album) + span');
      const ownershipEl: HTMLSpanElement | null = item.querySelector('.or_q_ownership');

      const rating = ratingEl && ratingEl.src ? parseInt(ratingEl.src.split('/').pop()?.split('.')[0] || '0') : '0';
      const releaseId = releaseLink ? releaseLink.title.replace('[Album', '').replace(']', '') : '';
      const title = releaseLink?.innerText || '';
      const year = yearEl ? yearEl.innerText.replace('(', '').replace(')', '') : '';
      const ownershipText = (ownershipEl?.textContent || '').trim();

      let ownership: ERYMOwnershipStatus = ERYMOwnershipStatus.NotCataloged; // default to 'n'
      let format: ERYMFormat | '' = ''; // default to ''

      function isOwnershipAltText(value: string): value is ERYMOwnershipAltText {
        return Object.values(ERYMOwnershipAltText).includes(value as ERYMOwnershipAltText);
      }

      if (ownershipText && isOwnershipAltText(ownershipText)) {
        ownership = constants.ERYMOwnershipAltToCode[ownershipText] || ERYMOwnershipStatus.InCollection;

        // Formats for 'Used to Own' and 'Wishlist' are not available on Collection page
        // Only 'In collection' is used by addon anyway, so we ignore formats for other ownership types
        if (ownership === ERYMOwnershipStatus.InCollection) {
          format = constants.RYMFormatsLabelsReverse[ownershipText] || '';
        }
      }

      const artistLinks = item.querySelectorAll('.or_q_albumartist_td a.artist');
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

      const { artistName, artistNameLocalized } = utils.combineArtistNames(artistNames);

      const itemData = {
        id: String(releaseId),
        title,
        releaseDate: Number(year),
        rating: Number(rating),
        artistName,
        artistNameLocalized: artistNameLocalized,
        ownership,
        format,
        $artistName: utils.normalizeForSearch(artistName),
        $artistNameLocalized: utils.normalizeForSearch(artistNameLocalized),
        $title: utils.normalizeForSearch(title),
      }

      return itemData;
    });

    if (constants.isDev) {
      console.log('Parsed Data:', parsedData);
    }

    const dbData = await RecordsAPI.getByIds(parsedData.map(data => data.id), true);

    let addedQty = 0;
    let updatedQty = 0;

    await Promise.all(
      parsedData.map((data) => {
        const dbItem = (dbData as Record<string, IRYMRecordDB>)[data.id];

        if (!dbItem) {
          addedQty++;
          return RecordsAPI.add(data);
        }

        delete dbItem._raw;

        if (dbItem.rating !== data.rating) {
          updatedQty++;
          return RecordsAPI.updateRating(data.id, data.rating);
        }

        return Promise.resolve(false);
      })
    );

    console.log(`[content_collection_end] Added ${addedQty} items, updated ${updatedQty} items`);
  });
})();
