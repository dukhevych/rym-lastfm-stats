declare global {
  interface UserData {
    name?: string;
    // add other properties if needed
  }

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
