(async function () {
  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('form.music_export');
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Request failed: " + response.status);
        }

        const exportData = await response.text();

        // Do something with resultText here
      } catch (err) {
        console.error("Submission error:", err);
      }
    });
  });
})();
