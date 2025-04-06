const render = async (_config) => {
  const releaseId = document.querySelectorAll('.album_shortcut')[0].value.replace('[Album', '').replace(']', '');

  const element = document.getElementById('my_catalog_rating_l_' + releaseId);

  console.log(
    element.nextElementSibling.innerText
      .trim()
      .replace('rymQ(function() {window.rating_l_' + releaseId, '')
      .replace(' = new RYMrating(\'l\', ' + releaseId + ', ', '')
      .replace(' );});', '')
  );

  const ratingElement = document.querySelector('.my_catalog_rating');

  const config = {
    characterData: true,
    childList: true,
    subtree: true,
  };

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // console.log('New nodes added:', mutation.addedNodes);
      }
      if (mutation.type === 'characterData') {
        // console.log('Text changed:', mutation.target.textContent);
      }
    }
  });

  observer.observe(ratingElement, config);
}

export default {
  render,
  targetSelectors: ['.my_catalog_catalog'],
}
