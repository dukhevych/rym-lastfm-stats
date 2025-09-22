const baseManifest = require('./manifest.json');

const browserSpecificConfigs = {
  chrome: {
    "background": {
      "service_worker": "background.js"
    },
    "oauth2": {
      "client_id": "dummy",
      "scopes": ["dummy"],
      "redirect_uris": [
        "https://dummy"
      ]
    }
  },
  firefox: {
    "background": {
      "scripts": ["background.js"]
    },
    "browser_specific_settings": {
      "gecko": {
        "id": "rymlastfmstats@rateyourmusic.com",
        "data_collection_permissions": {
          "required": ["none"]
        }
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
