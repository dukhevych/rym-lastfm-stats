import { RYMReleaseType } from '@/helpers/enums';

interface ReleaseGetInfoParams {
  artist: string;
  title: string;
  mbid?: string;
  autocorrect?: 0 | 1;
  lang?: string;
  username?: string | null;
}

export const ReleaseInfoMethodMap: Record<RYMReleaseType, string> = {
  [RYMReleaseType.Album]: 'album.getInfo',
  [RYMReleaseType.Single]: 'track.getInfo',
  [RYMReleaseType.MusicVideo]: 'track.getInfo',
  [RYMReleaseType.EP]: 'album.getInfo',
}
interface getReleaseInfoOptions {
  apiKey: string;
  params: ReleaseGetInfoParams;
  releaseType: RYMReleaseType;
}

interface ReleaseInfoResponse {
  error?: number;
  artist: string;
  album: string;
  track: string;
  mbid: string;
}

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export async function getReleaseInfo({
  apiKey,
  params,
  releaseType,
}: getReleaseInfoOptions): Promise<any> {
  const method = ReleaseInfoMethodMap[releaseType] ?? ReleaseInfoMethodMap[RYMReleaseType.Album];
  const url = new URL(BASE_URL);

  url.searchParams.set('method', method);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'json');

  if ('mbid' in params && params.mbid) {
    url.searchParams.set('mbid', params.mbid);
  } else {
    url.searchParams.set('artist', params.artist);
    url.searchParams.set(method.split('.')[0], params.title);
  }

  if ('autocorrect' in params) {
    url.searchParams.set('autocorrect', String(params.autocorrect));
  }

  if ('username' in params && params.username) {
    url.searchParams.set('username', params.username);
  }

  if ('lang' in params && params.lang) {
    url.searchParams.set('lang', params.lang);
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch ${method}`);
  return await res.json();
}
