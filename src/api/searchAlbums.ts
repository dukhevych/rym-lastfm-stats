const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

interface AlbumSearchParams {
  query: string;
  apiKey: string;
  limit?: number;
  page?: number;
}

export interface AlbumSearchResult {
  name: string;
  artist: string;
  url: string;
  image: Array<{ size: string; '#text': string }>;
  mbid: string;
}

export interface AlbumSearchResponse {
  results: {
    'opensearch:Query': {
      '#text': string;
      role: string;
      searchTerms: string;
      startPage: string;
    };
    'opensearch:totalResults': string;
    'opensearch:startIndex': string;
    'opensearch:itemsPerPage': string;
    albummatches: {
      album: AlbumSearchResult[];
    };
  };
}

export async function searchAlbums({
  apiKey,
  query,
  limit = 5,
  page,
}: AlbumSearchParams): Promise<AlbumSearchResponse> {
  const params = new URLSearchParams({
    method: 'album.search',
    album: query,
    limit: String(limit),
    api_key: apiKey,
    format: 'json',
  });

  if (page) params.set('page', page.toString());

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch recent tracks: ${res.statusText}`);
  }

  return res.json();
}
