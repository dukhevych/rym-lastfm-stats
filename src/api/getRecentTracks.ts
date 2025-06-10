const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface RecentTrack {
  artist: { '#text': string; mbid: string };
  album: { '#text': string; mbid: string };
  name: string;
  streamable: string;
  mbid: string;
  url: string;
  image: Array<{ size: string; '#text': string }>;
  date?: { uts: string; '#text': string }; // Missing if now playing
  '@attr'?: { nowplaying: 'true' };
}

export interface RecentTracksResponse {
  recenttracks: {
    track: RecentTrack[];
    '@attr': {
      user: string;
      page: string;
      total: string;
      perPage: string;
      totalPages: string;
    };
  };
}

interface GetRecentTracksParams {
  username: string;
  limit?: number;
  page?: number;
  from?: number; // UNIX timestamp
  to?: number;   // UNIX timestamp
}

interface GetRecentTracksOptions {
  params: GetRecentTracksParams;
  signal?: AbortSignal;
  apiKey: string;
}

export async function getRecentTracks({
  apiKey,
  params,
  signal,
}: GetRecentTracksOptions): Promise<RecentTracksResponse> {
  const searchParams = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: params.username,
    api_key: apiKey,
    format: 'json',
  });

  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.from) searchParams.set('from', params.from.toString());
  if (params.to) searchParams.set('to', params.to.toString());

  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch recent tracks: ${res.statusText}`);
  }

  return res.json();
}
