import { insertElement, createElement } from '@/helpers/dom';
import { get } from 'svelte/store';
import type { RenderSettings } from '@/helpers/renderContent';

async function render(settings: RenderSettings) {
  const { configStore, context } = settings;
  const config = get(configStore);
  const userData = context?.userData as UserData;

  const headerEl = document.getElementById('page_header')!;
  const profileLinkEl = headerEl.querySelector('.header_profile');

  if (!profileLinkEl || !userData.name) {
    return;
  }

  console.log(config.mainHeaderLastfmLinkLabel);

  let label = config.mainHeaderLastfmLinkLabel;

  if (label.indexOf('$username') !== -1) {
    label = label.replace('$username', userData.name);
  }

  const lastfmProfileEl = createElement('a', {
    href: `https://www.last.fm/user/${userData.name}`,
    target: '_blank',
    className: 'lastfm_profile',
    style: {
      display: 'block',
    },
  }, [
    createElement('img', {
      src: userData.image,
      alt: userData.name,
      style: {
        float: 'left',
        marginTop: '0.25em',
        display: 'inline-block',
        width: '2em',
        height: '2em',
        borderRadius: '3px',
      },
    }),
    createElement('span', {
      style: {
        color: 'var(--header-item-link)',
        background: 'var(--header-background)',
        fontWeight: 'bold',
        paddingInline: '0.5em',
      },
    }, label),
  ]);

  const wrapper = createElement('div', {
    style: {
      float: 'right',
      marginLeft: '0.75em',
    },
  }, [
    lastfmProfileEl,
  ]);

  insertElement({
    target: profileLinkEl,
    element: wrapper,
    position: 'afterend',
  });
}

export default {
  render,
};
