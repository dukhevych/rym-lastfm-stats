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

    const link = `<a href=${url} target="_blank">View on Last.fm</a>`;

    content.innerHTML = link;

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

    const playcountSpan = playcount !== undefined ? `<span title="${playcount} plays">${utils.formatNumber(
      parseInt(playcount)
    )} plays</span>` : null;
    const listenersSpan = listeners !== undefined ? `<span title="${listeners} listeners">${utils.formatNumber(
      parseInt(listeners)
    )} listeners</span>` : null;
    const userplaycountSpan = userplaycount !== undefined ? `<strong title="I listened ${userplaycount} times">My scrobbles: ${utils.formatNumber(
      parseInt(userplaycount)
    )}</strong>` : null;

    const link = `<a href=${url} target="_blank">View on Last.fm</a>`;

    content.innerHTML = [
      listenersSpan,
      playcountSpan,
      userplaycountSpan,
      link,
    ]
      .filter((x) => x)
      .join("&nbsp;&nbsp;|&nbsp;&nbsp;");

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
