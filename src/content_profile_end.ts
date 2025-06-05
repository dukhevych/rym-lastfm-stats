import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';
import { RecordsAPI } from '@/helpers/records-api';

(async function () {
  window.addEventListener('load', async () => {
    const isMyProfile = utils.isMyProfile();

    if (!isMyProfile) return;

    const recentItems = Array.from(document.querySelectorAll('#musicrecent tr[id^="page_catalog_item_"]'));

    const parsedData = recentItems.map(item => {
      const ratingEl = item.querySelector('.or_q_rating_date_s img');
      const rating = ratingEl ? parseInt(ratingEl.src.split('/').pop().split('.')[0]) : '';
      const releaseLink = item.querySelector('.or_q_albumartist_td a.album');
      const releaseId = releaseLink.title.replace('[Album', '').replace(']', '');
      const title = releaseLink.innerText;
      const year = item.querySelector('.or_q_albumartist i:has(a.album) + span').innerText
        .replace('(', '').replace(')', '');
      const ownershipText = item.querySelector('.or_q_ownership').textContent.trim();

      let ownership = 'n';
      let format = '';

      if (ownershipText) {
        ownership = constants.RYM_OWNERSHIP_TYPES_EXTRA_LABELS[ownershipText] || 'o';

        // Formats for 'Used to Own' and 'Wishlist' are not available on Profile page
        // Only 'In collection' is used by addon anyway, so we ignore formats for other ownership types
        if (ownership === 'o') {
          format = constants.RYM_FORMATS_INVERTED[ownershipText] || '';
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
      console.log('[content_profile_end] Parsed data:', parsedData);
    }

    const dbData = await RecordsAPI.getByIds(parsedData.map(data => data.id), true);

    let addedQty = 0;
    let updatedQty = 0;

    await Promise.all(
      parsedData.map((data) => {
        const dbItem = dbData[data.id];

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

    console.log(`[content_profile_end] Added ${addedQty} records, updated ${updatedQty} records`);
  });
})();
