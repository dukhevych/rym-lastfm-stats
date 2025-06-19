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

  interface VibrantUiColorSet {
    bgColor: string;
    accentColor: string;
    accentColorHSL: [number, number, number];
    readonly bgColorContrast: string;
    readonly accentColorContrast: string;
  }

  interface VibrantUiColors {
    light: VibrantUiColorSet;
    dark: VibrantUiColorSet;
    palette: VibrantPalette;
  }
}

export {};
