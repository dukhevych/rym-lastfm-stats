document.getElementById('extractButton').addEventListener('click', () => {
    browser.tabs.query({ active: true, currentWindow: true }, tabs => {
        browser.tabs.sendMessage(tabs[0].id, { action: "extractData" }, ({ data, title }) => {
            browser.runtime.sendMessage({ action: "saveData", data, title });
        });
    });
});
