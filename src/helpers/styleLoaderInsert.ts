function appendToHead(element: Element) {
  if (document.body && document.head) {
    document.head.appendChild(element);
    return;
  }

  function tryInsert() {
    if (document.body && document.head) {
      document.head.appendChild(element);
    } else {
      requestAnimationFrame(tryInsert);
    }
  }

  requestAnimationFrame(tryInsert);
}

module.exports = appendToHead;
