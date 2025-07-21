import svgLoader from '@/assets/icons/loader.svg?raw';
import starSvg from '@/assets/icons/star.svg?raw';
import lastfmSvg from '@/assets/icons/lastfm.svg?raw';
import lastfmSquareSvg from '@/assets/icons/lastfm-square.svg?raw';
import playlistSvg from '@/assets/icons/playlist.svg?raw';
import volumeSvg from '@/assets/icons/volume.svg?raw';
import brushSvg from '@/assets/icons/brush.svg?raw';
import closeSvg from '@/assets/icons/close.svg?raw';
import lockSvg from '@/assets/icons/lock.svg?raw';
import unlockSvg from '@/assets/icons/unlock.svg?raw';
import pollingStartSvg from '@/assets/icons/polling-start.svg?raw';
import pollingStopSvg from '@/assets/icons/polling-stop.svg?raw';
import swapSvg from '@/assets/icons/swap.svg?raw';
import playSvg from '@/assets/icons/play.svg?raw';
import peopleSvg from '@/assets/icons/people.svg?raw';

const svgSpriteId = 'svg-sprite';

interface SvgSprite extends SVGSVGElement {}
let svgSprite: SvgSprite | null = null;

export const createSVGSprite = function() {
  svgSprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgSprite.setAttribute('id', svgSpriteId);
  svgSprite.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgSprite.setAttribute('style', 'display:none;');

  addIconToSVGSprite(svgLoader, 'svg-loader-symbol');
  addIconToSVGSprite(starSvg, 'svg-star-symbol');
  addIconToSVGSprite(lastfmSvg, 'svg-lastfm-symbol');
  addIconToSVGSprite(lastfmSquareSvg, 'svg-lastfm-square-symbol');
  addIconToSVGSprite(playlistSvg, 'svg-playlist-symbol');
  addIconToSVGSprite(volumeSvg, 'svg-volume-symbol');
  addIconToSVGSprite(brushSvg, 'svg-brush-symbol');
  addIconToSVGSprite(closeSvg, 'svg-close-symbol');
  addIconToSVGSprite(lockSvg, 'svg-lock-symbol');
  addIconToSVGSprite(unlockSvg, 'svg-unlock-symbol');
  addIconToSVGSprite(pollingStartSvg, 'svg-polling-start-symbol');
  addIconToSVGSprite(pollingStopSvg, 'svg-polling-stop-symbol');
  addIconToSVGSprite(swapSvg, 'svg-swap-symbol');
  addIconToSVGSprite(playSvg, 'svg-play-symbol');
  addIconToSVGSprite(peopleSvg, 'svg-people-symbol');

  return svgSprite;
}

export function insertSVGSprite(svgSprite: SVGSVGElement) {
  return new Promise<SVGSVGElement>((resolve) => {
    if (document.body) {
      document.body.appendChild(svgSprite);
      resolve(svgSprite);
    } else {
      function _() {
        if (document.body) {
          document.body.appendChild(svgSprite);
          resolve(svgSprite);
        } else {
          requestAnimationFrame(_);
        }
      }
      _();
    }
  });
}

export interface AddIconToSVGSprite {
  (iconRaw: string, iconName: string): void;
}

export const addIconToSVGSprite: AddIconToSVGSprite = function(iconRaw, iconName) {
  if (!svgSprite) {
    console.error('SVG sprite not found');
    return;
  }
  if (!iconRaw) {
    console.error('Icon raw data is empty');
    return;
  }
  if (!iconName) {
    console.error('Icon name is empty');
    return;
  }
  if (svgSprite.querySelector(`#${iconName}`)) {
    console.warn(`Icon with name "${iconName}" already exists in the SVG sprite.`);
    return;
  }
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(iconRaw, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
  symbolElement.setAttribute('id', iconName);
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    symbolElement.setAttribute('viewBox', viewBox);
  }
  Array.from(svgElement.childNodes).forEach(node => {
    symbolElement.appendChild(node.cloneNode(true));
  });

  svgSprite.appendChild(symbolElement);
}

export interface CreateSvgUseOptions {
  iconName: string;
  viewBox?: string;
}

export const createSvgUse = function(
  iconName: string,
  viewBox: string = '0 0 24 24'
): SVGSVGElement {
  const wrapper: SVGSVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('viewBox', viewBox);
  const useElement: SVGUseElement = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  useElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${iconName}`);
  wrapper.appendChild(useElement);
  return wrapper;
}

export async function initSprite() {
  await insertSVGSprite(createSVGSprite());
}