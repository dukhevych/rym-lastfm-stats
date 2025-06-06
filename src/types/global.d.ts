declare global {
  interface ProfileOptions {
    recentTracks: boolean;
    recentTracksShowOnLoad: boolean;
    recentTracksBackground: number;
    recentTracksLimit: number;
    topArtists: boolean;
    topArtistsLimit: number;
    topArtistsPeriod: string;
    topAlbums: boolean;
    topAlbumsPeriod: string;
    rymPlayHistoryHide: boolean;
    lastfmApiKey: string;
  }
}

export {};
