import browser from 'webextension-polyfill';

interface SendMessageResponse<T = any> {
  success: boolean;
  result?: T;
  error?: string;
}

function sendMessage<T = any>(type: string, payload: { [key: string]: any } = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    browser.runtime.sendMessage({ type, payload })
      .then((response: SendMessageResponse<T>) => {
        if (response?.success) {
          resolve(response.result as T);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

interface GetByIdPayload {
  id: string;
}

interface GetByIdsPayload {
  ids: string[];
  asObject?: boolean;
}

interface GetByArtistPayload {
  artist: string;
}

interface GetByArtistsPayload {
  artists: string[];
}

interface GetByArtistAndTitlePayload {
  artist: string;
  title: string;
  titleFallback?: string;
  asObject?: boolean;
}

interface AddRecordPayload {
  record: IRYMRecordDB;
}

interface UpdateRecordPayload {
  id: string;
  updatedData: Partial<IRYMRecordDB>;
}

interface UpdateRatingPayload {
  id: string;
  rating: number;
}

interface DeleteRecordPayload {
  id: string;
}

interface SetBulkPayload {
  payload: IRYMRecordDB[];
}

type SendMessageResult<T = any> = Promise<T>;

function getByArtistAndTitle(
  artist: string,
  title: string,
  titleFallback?: string,
  asObject?: false
): SendMessageResult<IRYMRecordDBMatch[]>;

function getByArtistAndTitle(
  artist: string,
  title: string,
  titleFallback: string | undefined,
  asObject: true
): SendMessageResult<Record<string, IRYMRecordDBMatch>>;

function getByArtistAndTitle(
  artist: string,
  title: string,
  titleFallback?: string,
  asObject?: boolean
): SendMessageResult<IRYMRecordDBMatch[] | Record<string, IRYMRecordDBMatch>> {
  return sendMessage('GET_RECORD_BY_ARTIST_AND_TITLE', {
    artist,
    title,
    titleFallback,
    asObject,
  } as GetByArtistAndTitlePayload);
}

function getByIds(
  ids: string[],
  asObject?: false
): SendMessageResult<IRYMRecordDB[]>;

function getByIds(
  ids: string[],
  asObject: true
): SendMessageResult<Record<string, IRYMRecordDB>>;

function getByIds(
  ids: string[],
  asObject?: boolean
): SendMessageResult<IRYMRecordDB[] | Record<string, IRYMRecordDB>> {
  return sendMessage(
    'GET_RECORDS_BY_IDS',
    { ids, asObject } as GetByIdsPayload
  );
}

export const RecordsAPI = {
  getById: (id: string): SendMessageResult<IRYMRecordDB> =>
    sendMessage('GET_RECORD_BY_ID', { id } as GetByIdPayload),

  getByIds,

  getAll: (): SendMessageResult<IRYMRecordDB[]> =>
    sendMessage('GET_ALL_RECORDS'),

  getByArtist: (artist: string): SendMessageResult<IRYMRecordDB[]> =>
    sendMessage('GET_RECORDS_BY_ARTIST', { artist } as GetByArtistPayload),

  getByArtists: (artists: string[]): SendMessageResult<Record<string, IRYMRecordDB[]>> =>
    sendMessage('GET_RECORDS_BY_ARTISTS', { artists } as GetByArtistsPayload),

  getByArtistAndTitle,

  add: (record: IRYMRecordDB): SendMessageResult<boolean> =>
    sendMessage('ADD_RECORD', { record } as AddRecordPayload),

  update: (id: string, updatedData: Partial<IRYMRecordDB>): SendMessageResult<boolean> =>
    sendMessage('UPDATE_RECORD', { id, updatedData } as UpdateRecordPayload),

  updateRating: (id: string, rating: number): SendMessageResult<boolean> =>
    sendMessage('UPDATE_RECORD_RATING', { id, rating } as UpdateRatingPayload),

  delete: (id: string): SendMessageResult<boolean> =>
    sendMessage('DELETE_RECORD', { id } as DeleteRecordPayload),

  getQty: (): SendMessageResult<number> =>
    sendMessage('GET_RECORDS_QTY'),

  setBulk: (payload: IRYMRecordDB[]): SendMessageResult<void> =>
    sendMessage('SET_RECORDS', { payload } as SetBulkPayload),
};
