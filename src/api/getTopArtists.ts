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

export interface TopArtistsResponse {
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

interface GetTopArtistsParams {
  username: string;
  period: LastFmPeriod;
  limit?: number;
  page?: number;
}

interface GetTopArtistsOptions {
  params: GetTopArtistsParams;
  apiKey: string;
  signal?: AbortSignal;
}

export async function getTopArtists({
  params,
  apiKey,
  signal,
}: GetTopArtistsOptions): Promise<TopArtistsResponse> {
  const searchParams = new URLSearchParams({
    method: 'user.gettopartists',
    user: params.username,
    api_key: apiKey,
    format: 'json',
  });

  searchParams.set('limit', String(params.limit || 8));
  searchParams.set('period', params.period);
  if (params.page) searchParams.set('page', String(params.page));

  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch top artists: ${res.statusText}`);
  }

  return res.json();
}
