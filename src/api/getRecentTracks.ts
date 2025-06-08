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
  apiKey: string;
  limit?: number;
  page?: number;
  from?: number; // UNIX timestamp
  to?: number;   // UNIX timestamp
}

export async function getRecentTracks(
  {
    username,
    apiKey,
    limit,
    page,
    from,
    to,
  }: GetRecentTracksParams,
  signal?: AbortSignal,
): Promise<RecentTracksResponse> {
  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: username,
    api_key: apiKey,
    format: 'json',
  });

  if (limit) params.set('limit', limit.toString());
  if (page) params.set('page', page.toString());
  if (from) params.set('from', from.toString());
  if (to) params.set('to', to.toString());

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch recent tracks: ${res.statusText}`);
  }

  return res.json();
}
