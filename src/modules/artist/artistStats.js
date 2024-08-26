import * as utils from "@/helpers/utils.js";
import * as api from '@/helpers/api.js';

const META_TITLE_SELECTOR = 'meta[property="og:title"]';
const ARTIST_CONTAINER_SELECTOR = ".artist_info_main";

function parseArtist(metaContent) {
  const artist = metaContent.replace(" discography - RYM/Sonemic", "");
  return artist;
}

function getArtist() {
  const metaTag = document.querySelector(META_TITLE_SELECTOR);
  if (metaTag) return parseArtist(metaTag.content);
  return null;
}

function insertDummyLink(artist) {
  const infoBlock = document.querySelector(ARTIST_CONTAINER_SELECTOR);

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
  const infoBlock = document.querySelector(ARTIST_CONTAINER_SELECTOR);

  if (infoBlock) {
    const heading = document.createElement("div");
    heading.classList.add("info_hdr");
    heading.textContent = label;

    const content = document.createElement("div");
    content.classList.add("info_content");

    const listenersSpan = listeners !== undefined ? utils.createSpan(`${listeners} listeners`, `${utils.shortenNumber(parseInt(listeners))} listeners`) : null;
    const playcountSpan = playcount !== undefined ? utils.createSpan(`${playcount}, ${parseInt(playcount / listeners)} per listener`, `${utils.shortenNumber(parseInt(playcount))} plays`) : null;
    const userplaycountSpan = userplaycount !== undefined ? utils.createStrong(`${userplaycount} scrobbles`, `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`) : null;
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

async function render(config) {
  if (!config) return;

  const artist = getArtist();

  if (!artist) {
    console.error("No artist found.");
    return;
  }

  if (!config.lastfmApiKey) {
    insertDummyLink(artist);
    console.log("Last.fm credentials not set. Please set Last.fm API Key in the extension options.");
    return;
  }

  const userName = config.lastfmUsername;

  const data = await api.fetchArtistStats(userName, config.lastfmApiKey, {
    artist,
  });

  const { playcount, listeners, userplaycount } = data.artist.stats;
  const { url } = data.artist;

  insertArtistStats(
    {
      playcount,
      listeners,
      userplaycount,
      url,
    },
  );
}

export default {
  render,
  targetSelectors: [
    META_TITLE_SELECTOR,
    ARTIST_CONTAINER_SELECTOR,
  ],
};
