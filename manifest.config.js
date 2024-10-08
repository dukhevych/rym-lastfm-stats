const baseManifest = require('./manifest.json');

const browserSpecificConfigs = {
  chrome: {
    "background": {
      "service_worker": "background.js"
    }
  },
  firefox: {
    "background": {
      "scripts": ["background.js"]
    },
    "browser_specific_settings": {
      "gecko": {
        "id": "rymlastfmstats@rateyourmusic.com"
      }
    }
  }
};

function generateManifest(browser) {
  const manifest = {
    ...baseManifest,
    ...browserSpecificConfigs[browser]
  };

  return JSON.stringify(manifest, null, 2);
}

module.exports = generateManifest;
