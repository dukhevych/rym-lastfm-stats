const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface TopAlbum {
  name: string;
  playcount: number;
  mbid: string;
  url: string;
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
  image: Array<{ size: string; '#text': string }>;
}

export interface TopAlbumsResponse {
  topalbums: {
    album: TopAlbum[];
    '@attr': {
      user: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

export type TopAlbumsPeriod = LastFmPeriod;

interface GetTopAlbumsParams {
  username: string;
  period: TopAlbumsPeriod;
  limit?: number;
  page?: number;
}

interface GetTopAlbumsOptions {
  params: GetTopAlbumsParams;
  apiKey: string;
  signal?: AbortSignal;
}

export async function getTopAlbums({
  params,
  apiKey,
  signal,
}: GetTopAlbumsOptions): Promise<TopAlbumsResponse> {
  const searchParams = new URLSearchParams({
    method: 'user.gettopalbums',
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
    throw new Error(error.message || `Failed to fetch top albums: ${res.statusText}`);
  }

  return res.json();
}
