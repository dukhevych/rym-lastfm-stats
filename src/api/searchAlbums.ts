const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

interface AlbumSearchParams {
  query: string;
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

interface SearchAlbumsOptions {
  params: AlbumSearchParams;
  apiKey: string;
}

export async function searchAlbums({
  apiKey,
  params,
}: SearchAlbumsOptions): Promise<AlbumSearchResponse> {
  const searchParams = new URLSearchParams({
    method: 'album.search',
    album: params.query,
    limit: String(params.limit ?? 5),
    api_key: apiKey,
    format: 'json',
  });

  if (params.page) searchParams.set('page', params.page.toString());

  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch recent tracks: ${res.statusText}`);
  }

  return res.json();
}
