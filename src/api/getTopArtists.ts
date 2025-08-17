const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface TopArtist {
  name: string;
  playcount: number;
  listeners: number;
  mbid: string;
  url: string;
  streamable: string;
  image: Array<{ size: string; '#text': string }>;
}

export interface UserTopArtistsResponse {
  topartists: {
    artist: TopArtist[];
    '@attr': {
      user: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

export interface ChartTopArtistsResponse {
  artists: {
    artist: TopArtist[];
    '@attr': {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

interface GetTopArtistsBase {
  apiKey: string;
  signal?: AbortSignal;
}

interface GetTopArtistsUserParams {
  params: {
    username: string;
    period: LastFmPeriod;
    limit?: number;
    page?: number;
  };
}

interface GetTopArtistsChartParams {
  params?: {
    username?: undefined; // ensures TS knows it's the chart branch
    limit?: number;
    page?: number;
  };
}

// overloads
export async function getTopArtists(
  options: GetTopArtistsUserParams & GetTopArtistsBase
): Promise<UserTopArtistsResponse>;

export async function getTopArtists(
  options: GetTopArtistsChartParams & GetTopArtistsBase
): Promise<ChartTopArtistsResponse>;

// implementation
export async function getTopArtists({
  params = {},
  apiKey,
  signal,
}: (GetTopArtistsUserParams | GetTopArtistsChartParams) & GetTopArtistsBase) {
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    format: 'json',
  });

  if (params.username) {
    searchParams.set('method', 'user.gettopartists');
    searchParams.set('user', params.username);
    searchParams.set('limit', String(params.limit || 8));
    if ('period' in params && params.period) {
      searchParams.set('period', params.period);
    }
  } else {
    searchParams.set('method', 'chart.getTopArtists');
    if (params.limit) searchParams.set('limit', String(params.limit));
  }

  if (params.page) searchParams.set('page', String(params.page));

  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url, { signal });
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json.message || `Failed to fetch top artists: ${res.statusText}`);
  }

  return json;
}
