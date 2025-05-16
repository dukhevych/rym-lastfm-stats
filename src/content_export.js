import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { LASTFM_COLOR } from '@/helpers/constants.js';
import { upgradeRymDB } from '@/helpers/rymSync.js';
import data from '@/data.csv?raw';

(async function () {
  const form = document.querySelector('form.music_export');

  const formSubmitButton = form.querySelector('button[type="submit"]');
  formSubmitButton.style.display = 'none';

  const formSyncButton = document.createElement('button');

  formSyncButton.type = 'button';
  formSyncButton.classList.add(...formSubmitButton.classList);
  formSyncButton.style.backgroundColor = LASTFM_COLOR;
  formSyncButton.textContent = 'Sync with RYM Last.fm Stats';

  formSubmitButton.insertAdjacentElement('afterend', formSyncButton);

  formSyncButton.addEventListener('click', async function (e) {
    e.preventDefault();

    formSubmitButton.setAttribute('disabled', 'true');

    // const formData = new FormData(form);

    // if (formData.get('g-recaptcha-response') === '') return;

    try {
      // const response = await fetch(form.action, {
      //   method: "POST",
      //   body: formData,
      // });

      // if (!response.ok) {
      //   throw new Error("Request failed: " + response.status);
      // }

      // const exportData = await response.text();
      const exportData = data;

      // Parse the CSV data
      const rows = exportData.split('\n').slice(1);
      // const rows = exportData.split('\n');

      const parsedData = [];

      rows.forEach(row => {
        const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, ''));

        if (columns.length !== 11) return;

        const id = columns[0];

        if (!id) return;

        const firstName = columns[1];
        const lastName = columns[2];
        const firstNameLocalized = columns[3];
        const lastNameLocalized = columns[4];

        const title = columns[5];
        const releaseDate = +columns[6];
        const rating = +columns[7];
        // const ownership = columns[8];
        // const purchaseDate = columns[9];
        // const mediaType = columns[10];

        const getCombinedName = (firstName, lastName) => [firstName, lastName]
          .filter(Boolean)
          .join(' ')
          .trim()
          .replace(/\s&amp;\s/g, ' & ')
          .replace(/\sand\s/g, ' & ');

        const artistName = getCombinedName(firstName, lastName);
        const artistNameLocalized = getCombinedName(firstNameLocalized, lastNameLocalized);

        const getNormalizedString = (string) => {
          if (!string) return '';

          return utils.deburr(string.toLowerCase());
        };

        const item = {
          id,
          title,
          releaseDate,
          rating,
          artistName,
          artistNameLocalized,
          $artistName: getNormalizedString(artistName),
          $artistNameLocalized: getNormalizedString(artistNameLocalized),
          $title: getNormalizedString(title),
        };

        // if (["8796541", "14296064", "1078761", "13652180", "11311758"].includes(id)) {
        //   console.log(item);
        // }

        if (constants.isDev) {
          item._raw = row;
        }

        parsedData.push(item);
      });

      await upgradeRymDB(parsedData);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while syncing data with RYM.');
    } finally {
      formSubmitButton.setAttribute('disabled', 'true');
    }
  });
})();
