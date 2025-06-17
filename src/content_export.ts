import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { LASTFM_COLOR } from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import { createElement as h } from '@/helpers/utils';

(async function () {
  const form: HTMLFormElement | null = document.querySelector('form.music_export');

  if (!form) {
    console.warn('Music export form not found.');
    return;
  }

  const formSubmitButton: HTMLElement | null = form.querySelector('button[type="submit"]');

  if (!formSubmitButton) {
    console.warn('Form submit button not found.');
    return;
  }

  formSubmitButton.style.display = 'none';

  const includeReviewsCheckbox: HTMLElement | null = form.querySelector('label[for="include_reviews"]');

  if (!includeReviewsCheckbox) {
    console.warn('Include reviews checkbox not found.');
  } else {
    includeReviewsCheckbox.style.display = 'none';
  }

  const statusMessage = h('div', {
    style: {
      display: 'none',
      marginTop: '10px',
    },
  });

  const formSyncButtonText = 'Sync with RYM Last.fm Stats';

  const formSyncButton = h('button', {
    type: 'button',
    class: formSubmitButton.className,
    style: {
      backgroundColor: LASTFM_COLOR,
    },
    textContent: formSyncButtonText,
  });

  formSubmitButton.insertAdjacentElement('afterend', formSyncButton);
  formSyncButton.insertAdjacentElement('afterend', statusMessage);

  formSyncButton.addEventListener('click', async function (e) {
    e.preventDefault();

    statusMessage.textContent = '';
    statusMessage.style.display = 'none';

    formSyncButton.setAttribute('disabled', 'true');
    formSyncButton.textContent = 'Syncing...';

    statusMessage.style.display = 'block';

    const formData = new FormData(form);

    if (formData.get('g-recaptcha-response') === '') return;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Request failed: " + response.status);
      }

      const exportData = await response.text();
      const rows = exportData.split('\n').slice(1);

      const parsedData: IRYMRecordDB[] = [];

      rows.forEach(row => {
        const columns = utils.decodeHtmlEntities(row)
          .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
          .map(s => s.replace(/^"|"$/g, ''));

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
        const ownership = columns[8] as ERYMOwnershipStatus;
        const format = columns[10] as ERYMFormat;

        const getCombinedName = (firstName: string, lastName: string) => [firstName, lastName]
          .filter(Boolean)
          .join(' ')
          .trim()
          .replace(/\sand\s/g, ' & ');

        const artistName = getCombinedName(firstName, lastName);
        const artistNameLocalized = getCombinedName(firstNameLocalized, lastNameLocalized);

        const item: IRYMRecordDB = {
          id,
          title,
          releaseDate,
          rating,
          artistName,
          artistNameLocalized,
          ownership,
          format,
          $artistName: utils.normalizeForSearch(artistName),
          $artistNameLocalized: utils.normalizeForSearch(artistNameLocalized),
          $title: utils.normalizeForSearch(title),
        };

        if (constants.isDev) {
          item._raw = row;
        }

        parsedData.push(item);
      });

      constants.isDev && console.log('Parsed Data:', parsedData);

      if (parsedData.length === 0) {
        statusMessage.textContent = 'No records found to sync.';
        return;
      }

      await RecordsAPI.setBulk(parsedData);
      const recordsQty = await RecordsAPI.getQty();

      if (parsedData.length === recordsQty) {
        statusMessage.textContent = `✅ Synced successfully ${recordsQty} records.`;
        await utils.storageSet({
          rymSyncTimestamp: Date.now(),
        }, 'local');
      } else {
        statusMessage.textContent = `⚠️ Could not sync. Please, try again.`;
      }
    } catch (error) {
      console.error('Error:', error);
      console.log('Copy this error message and contact addon support:');
      console.log(JSON.stringify(error, null, 2));
      alert('An error occurred while syncing data with RYM. Please contact addon support.');
    } finally {
      formSyncButton.removeAttribute('disabled');
      formSyncButton.textContent = formSyncButtonText;
    }
  });
})();
