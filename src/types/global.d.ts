declare global {
  interface ProfileOptions {
    recentTracks: boolean;
    recentTracksShowOnLoad: boolean;
    recentTracksReplace: boolean;
    recentTracksReplaceBackground: number;
    recentTracksLimit: number;
    topArtists: boolean;
    topArtistsLimit: number;
    topArtistsPeriod: string;
    topAlbums: boolean;
    topAlbumsPeriod: string;
    lastfmApiKey: string;
  }
}

export {};
