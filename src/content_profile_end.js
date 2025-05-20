import * as utils from '@/helpers/utils.js';
import { RecordsAPI } from '@/helpers/records-api.js';

(async function () {
  window.addEventListener('load', async () => {
    const isMyProfile = utils.isMyProfile();

    if (!isMyProfile) return;

    const recentItems = Array.from(document.querySelectorAll('#musicrecent tr[id^="page_catalog_item_"]'));

    const parsedData = recentItems.map(item => {
      const rating = parseInt(item.querySelector('.or_q_rating_date_s img').src.split('/').pop().split('.')[0]);
      const releaseLink = item.querySelector('.or_q_albumartist_td a.album');
      const releaseId = releaseLink.title.replace('[Album', '').replace(']', '');
      const title = releaseLink.innerText;
      const year = item.querySelector('.or_q_albumartist i:has(a.album) + span').innerText
        .replace('(', '').replace(')', '');

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
        $artistName: utils.normalizeForSearch(artistName),
        $artistNameLocalized: utils.normalizeForSearch(artistNameLocalized),
        $title: utils.normalizeForSearch(title),
      }

      return itemData;
    });

    const dbData = await RecordsAPI.getByIds(parsedData.map(data => data.id), true);

    await Promise.all(
      parsedData.map((data) => {
        const dbItem = dbData[data.id];

        if (!dbItem) {
          return RecordsAPI.add(data);
        }

        delete dbItem._raw;

        if (dbItem.rating !== data.rating) {
          return RecordsAPI.updateRating(data.id, data.rating);
        }

        return Promise.resolve(false);
      })
    );
  });
})();
