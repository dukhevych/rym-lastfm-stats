const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

function sendMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage({ type, payload }, (response) => {
      if (browserAPI.runtime.lastError) {
        return reject(browserAPI.runtime.lastError);
      }
      if (response?.success) {
        resolve(response.result);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

export const RecordsAPI = {
  getById: (id) =>
    sendMessage('GET_RECORD_BY_ID', { id }),

  getByIds: (ids, asObject = false) =>
    sendMessage('GET_RECORDS_BY_IDS', { ids, asObject }),

  getAll: () =>
    sendMessage('GET_ALL_RECORDS'),

  getByArtist: (artist) =>
    sendMessage('GET_RECORDS_BY_ARTIST', { artist }),

  getByArtists: (artists) =>
    sendMessage('GET_RECORDS_BY_ARTISTS', { artists }),

  getByArtistAndTitle: (artist, title, titleFallback, asObject) =>
    sendMessage('GET_RECORD_BY_ARTIST_AND_TITLE', { artist, title, titleFallback, asObject }),

  add: (record) =>
    sendMessage('ADD_RECORD', { record }),

  update: (id, updatedData) =>
    sendMessage('UPDATE_RECORD', { id, updatedData }),

  updateRating: (id, rating) =>
    sendMessage('UPDATE_RECORD_RATING', { id, rating }),

  delete: (id) =>
    sendMessage('DELETE_RECORD', { id }),

  getQty: () =>
    sendMessage('GET_RECORDS_QTY'),

  setBulk: (payload) =>
    sendMessage('SET_RECORDS', { payload }),

  search: (artistName, title) =>
    sendMessage('SEARCH', { artistName, title }),
};
