export function formatNumber(num) {
  if (num >= 1000000) {
    return parseFloat((num / 1000000).toFixed(1)) + 'M';
  } else if (num >= 1000) {
    return parseFloat((num / 1000).toFixed(1)) + 'k';
  } else {
    return num.toString();
  }
}

export const createSpan = (title, text) => {
  const span = document.createElement('span');
  span.title = title;
  span.textContent = text;
  return span;
};

export const createStrong = (title, text) => {
  const strong = document.createElement('strong');
  strong.title = title;
  strong.textContent = text;
  return strong;
};

export const createLink = (href, text) => {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.textContent = text;
  return link;
};
