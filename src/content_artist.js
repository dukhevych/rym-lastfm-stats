import * as utils from "./helpers/utils.js";

function parseArtist(metaContent) {
  const artist = metaContent.replace(" discography - RYM/Sonemic", "");
  return artist;
}

function getArtist() {
  const metaTag = document.querySelector('meta[property="og:title"]');
  if (metaTag) return parseArtist(metaTag.content);
  return null;
}

chrome.storage.sync.get(["lastfmUsername", "lastfmApiKey"], function (items) {
  const artist = getArtist();
  if (items.lastfmApiKey) {
    fetchArtistStats(items.lastfmUsername, items.lastfmApiKey, {
      artist,
    });
  } else {
    insertDummyLink(artist);
    console.log(
      "Last.fm credentials not set. Please set them in the extension options."
    );
  }
});

function insertDummyLink(artist) {
  const infoBlock = document.querySelector(".artist_info_main");

  if (infoBlock) {
    const heading = document.createElement("div");
    heading.classList.add("info_hdr");
    heading.textContent = 'Last.fm';

    const content = document.createElement("div");
    content.classList.add("info_content");

    const url = 'https://www.last.fm/music/' + encodeURIComponent(artist);

    const link = utils.createLink(url, 'View on Last.fm');

    content.appendChild(link);

    infoBlock.appendChild(heading);
    infoBlock.appendChild(content);
  }
}

function insertArtistStats(
  { playcount, listeners, userplaycount, url },
  label = "Last.fm"
) {
  const infoBlock = document.querySelector(".artist_info_main");

  console.log(playcount, listeners, userplaycount, url);

  if (infoBlock) {
    const heading = document.createElement("div");
    heading.classList.add("info_hdr");
    heading.textContent = label;

    const content = document.createElement("div");
    content.classList.add("info_content");

    const listenersSpan = listeners !== undefined ? utils.createSpan(`${listeners} listeners`, `${utils.formatNumber(parseInt(listeners))} listeners`) : null;
    const playcountSpan = playcount !== undefined ? utils.createSpan(`${playcount}, ${parseInt(playcount / listeners)} per listener`, `${utils.formatNumber(parseInt(playcount))} plays`) : null;
    const userplaycountSpan = userplaycount !== undefined ? utils.createStrong(`${userplaycount} scrobbles`, `My scrobbles: ${utils.formatNumber(parseInt(userplaycount))}`) : null;
    const link = utils.createLink(url, 'View on Last.fm');

    const elements = [listenersSpan, playcountSpan, userplaycountSpan, link].filter(x => x);

    elements.forEach((element, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
        content.appendChild(separator);
      }
      content.appendChild(element);
    });

    infoBlock.appendChild(heading);
    infoBlock.appendChild(content);
  }
}

function fetchArtistStats(username, apiKey, { artist }) {
  const baseUrl = "https://ws.audioscrobbler.com/2.0/";

  const _params = {
    method: "artist.getInfo",
    artist: artist,
    api_key: apiKey,
    format: "json",
  };

  if (username) {
    _params.user = username;
  }

  const params = new URLSearchParams(_params);

  const url = `${baseUrl}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const { playcount, listeners, userplaycount } = data.artist.stats;

      const { url } = data.artist;

      insertArtistStats(
        {
          playcount,
          listeners,
          userplaycount,
          url,
        },
        "Last.fm"
      );
    })
    .catch((error) => console.error("Error:", error));
}
