import { LASTFM_COLOR } from '@/helpers/constants.js';
import { upgradeRymDB } from '@/helpers/rymSync.js';

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

      // Parse the CSV data
      const rows = exportData.split('\n').slice(1);

      const parsedData = rows.map(row => {
        const columns = row.split(',');
        const item = {
          id: columns[0]?.replace(/"/g, '').trim(),
          firstName: columns[1]?.replace(/"/g, '').trim(),
          lastName: columns[2]?.replace(/"/g, '').trim(),
          firstNameLocalized: columns[3]?.replace(/"/g, '').trim(),
          lastNameLocalized: columns[4]?.replace(/"/g, '').trim(),
          title: columns[5]?.replace(/"/g, '').trim(),
          releaseDate: columns[6]?.replace(/"/g, '').trim(),
          rating: columns[7]?.replace(/"/g, '').trim(),
        };

        let releaseName = `${item.lastNameLocalized || item.lastName} - ${item.title}`;

        if (item.firstNameLocalized || item.firstName) {
          releaseName = `${item.firstNameLocalized || item.firstName} ${releaseName}`;
        }

        return {
          ...item,
          releaseName,
        }
      }).filter(item => item.id);

      await upgradeRymDB(parsedData);
      alert('RYM data successfully synced!');
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while syncing data with RYM.');
    }
  });
})();
