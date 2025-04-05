const render = async (_config) => {
  const releaseId = document.querySelectorAll('.album_shortcut')[0].value.replace('[Album', '').replace(']', '');

  // const propName = 'rating_l_' + releaseId;

  // document.addEventListener('DOMContentLoaded', () => {
    const element = document.getElementById('my_catalog_rating_l_' + releaseId);
    console.log(element.nextElementSibling.innerText.trim().replace('rymQ(function() {window.rating_l_' + releaseId, '')
    .replace(' = new RYMrating(\'l\', ' + releaseId + ', ', '')
    .replace(' );});', ''));
    // const rating = element.querySelector('.rating_num').innerText;

    // console.log('Rating:', rating);
  // });

  // Object.defineProperty(window, propName, {
  //   get() {
  //     return this._myVar;
  //   },
  //   set(value) {
  //     console.log('Setting value:', value);
  //     this._myVar = value;
  //   },
  //   configurable: true,
  // });
  // const ratingElement = document.getElementById('rating_num_l_' + releaseId);

  // const rating = ratingElement.textContent === '---' ? null : ratingElement.textContent;

  // const config = {
  //   characterData: true,
  //   subtree: true // Needed if the text is inside child nodes like <span>, etc.
  // };

  // const observer = new MutationObserver((mutationsList) => {
  //   for (const mutation of mutationsList) {
  //     if (mutation.type === 'characterData') {
  //       console.log('Text changed:', mutation.target.textContent);
  //     }
  //   }
  // });

  // console.log('Rating:', rating);

  // observer.observe(ratingElement, config);
}

export default {
  render,
  targetSelectors: ['.my_catalog_catalog'],
}
