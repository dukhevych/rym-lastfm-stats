const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export type SearchType = 'album' | 'artist' | 'track';

interface SearchParams {
  query: string;
  limit?: number;
  page?: number;
  artist?: string;
}

export interface SearchResult {
  name: string;
  artist: string;
  url: string;
  image: Array<{ size: string; '#text': string }>;
  mbid: string;
}

export interface SearchResponse {
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
      album: SearchResult[];
    };
  };
}

interface SearchOptions {
  params: SearchParams;
  apiKey: string;
  searchType: SearchType;
}

export async function search({
  apiKey,
  params,
  searchType,
}: SearchOptions): Promise<SearchResponse> {
  const searchParams = new URLSearchParams({
    method: `${searchType}.search`,
    limit: String(params.limit ?? 5),
    api_key: apiKey,
    format: 'json',
  });

  if (params.page) searchParams.set('page', params.page.toString());

  searchParams.set(searchType, params.query);

  if (searchType === 'track' && params.artist) {
    searchParams.set('artist', params.artist);
  }

  const url = `${BASE_URL}?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `Failed to fetch recent tracks: ${res.statusText}`);
  }

  return res.json();
}
