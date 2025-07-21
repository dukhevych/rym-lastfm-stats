const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export interface ArtistGetInfoParams {
  artist: string;
  mbid?: string;
  autocorrect?: 0 | 1;
  username?: string | null;
  lang?: string;
}

interface GetArtistInfoOptions {
  params: ArtistGetInfoParams;
  apiKey: string;
}

export async function getArtistInfo({
  params,
  apiKey,
}: GetArtistInfoOptions): Promise<any> {
  const searchParams = new URLSearchParams({
    method: 'artist.getInfo',
    api_key: apiKey,
    format: 'json',
  });

  if (params.mbid) {
    searchParams.set('mbid', params.mbid);
  } else {
    searchParams.set('artist', params.artist);
  }

  if (params.autocorrect !== undefined) {
    searchParams.set('autocorrect', params.autocorrect.toString());
  }

  if (params.username) {
    searchParams.set('username', params.username);
  }

  if (params.lang) {
    searchParams.set('lang', params.lang);
  }

  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch artist info: ${res.statusText}`);
  }

  return res.json();
}
