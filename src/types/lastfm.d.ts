// Common Structures

export interface LastFmImage {
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
  '#text': string;
}

export interface LastFmAttr {
  [key: string]: string;
}

export interface LastFmTag {
  name: string;
  url: string;
}

export interface LastFmArtistBasic {
  name: string;
  mbid?: string;
  url: string;
}

export interface LastFmAlbumBasic {
  title: string;
  mbid?: string;
  url: string;
  image?: LastFmImage[];
}

export interface LastFmUser {
  id: string;
  name: string;
  realname?: string;
  url: string;
  country?: string;
  age?: string;
  gender?: string;
  subscriber?: string;
  playcount?: string;
  playlists?: string;
  bootstrap?: string;
  registered?: {
    unixtime: string;
    '#text': string;
  };
  image?: Array<{
    size: string;
    '#text': string;
  }>;
  type?: string;
  album_count?: string;
  artist_count?: string;
  track_count?: string;
}

export interface LastFmUserResponse {
  user: LastFmUser;
}

// user.getRecentTracks

export interface LastFmRecentTrack {
  artist: {
    mbid: string;
    '#text': string;
  };
  name: string;
  streamable: string;
  mbid: string;
  album: {
    mbid: string;
    '#text': string;
  };
  url: string;
  image: LastFmImage[];
  date?: {
    uts: string;
    '#text': string;
  };
  '@attr'?: {
    nowplaying?: string;
  };
}

export interface LastFmRecentTracksResponse {
  recenttracks: {
    track: LastFmRecentTrack[];
    '@attr': {
      user: string;
      totalPages: string;
      page: string;
      perPage: string;
      total: string;
    };
  };
}

// user.getTopAlbums

export interface LastFmTopAlbum {
  name: string;
  playcount: string;
  mbid?: string;
  url: string;
  artist: LastFmArtistBasic;
  image: LastFmImage[];
  '@attr'?: LastFmAttr;
}

export interface LastFmTopAlbumsResponse {
  topalbums: {
    album: LastFmTopAlbum[];
    '@attr'?: LastFmAttr;
  };
}

// user.getTopArtists

export interface LastFmTopArtist {
  name: string;
  playcount: string;
  listeners: string;
  mbid?: string;
  url: string;
  streamable: string;
  image: LastFmImage[];
  '@attr'?: LastFmAttr;
}

export interface LastFmTopArtistsResponse {
  topartists: {
    artist: LastFmTopArtist[];
    '@attr'?: LastFmAttr;
  };
}

// artist.getInfo

export interface LastFmArtistStats {
  listeners: string;
  playcount: string;
}

export interface LastFmArtistBio {
  published: string;
  summary: string;
  content: string;
  links?: {
    link: {
      href: string;
      rel: string;
      '#text': string;
    };
  };
}

export interface LastFmArtistFull {
  name: string;
  mbid?: string;
  url: string;
  image: LastFmImage[];
  streamable: string;
  ontour: string;
  stats: LastFmArtistStats;
  similar?: {
    artist: Array<{
      name: string;
      url: string;
      image: LastFmImage[];
    }>;
  };
  tags?: {
    tag: LastFmTag[];
  };
  bio?: LastFmArtistBio;
  userplaycount?: string;
}

export interface LastFmArtistResponse {
  artist: LastFmArtistFull;
}

// album.getInfo

export interface LastFmAlbumTrack {
  name: string;
  duration: string;
  url: string;
  artist: LastFmArtistBasic;
  '@attr'?: LastFmAttr;
}

export interface LastFmAlbumFull {
  name: string;
  artist: string;
  mbid?: string;
  url: string;
  image: LastFmImage[];
  listeners?: string;
  playcount?: string;
  tracks?: {
    track: LastFmAlbumTrack[] | LastFmAlbumTrack;
  };
  tags?: {
    tag: LastFmTag[];
  };
  wiki?: {
    published: string;
    summary: string;
    content: string;
  };
  userplaycount?: string;
}

export interface LastFmAlbumResponse {
  album: LastFmAlbumFull;
}

// track.getInfo

export interface LastFmTrackFull {
  name: string;
  mbid: string;
  url: string;
  duration: string;
  listeners: string;
  playcount: string;
  artist: LastFmArtistBasic;
  album?: LastFmAlbumBasic;
  toptags?: {
    tag: LastFmTag[];
  };
  wiki?: {
    published: string;
    summary: string;
    content: string;
  };
  userplaycount?: string;
}

export interface LastFmTrackResponse {
  track: LastFmTrackFull;
}

// album.search

export interface LastFmAlbumMatch {
  name: string;
  artist: string;
  url: string;
  image: LastFmImage[];
  mbid?: string;
}

export interface LastFmAlbumSearchResults {
  albummatches: {
    album: LastFmAlbumMatch[];
  };
}

export interface LastFmAlbumSearchResponse {
  results?: LastFmAlbumSearchResults;
  error?: number;
  message?: string;
}
