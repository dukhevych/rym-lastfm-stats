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

  interface VibrantSwatch {
    hex: string;
    hsl: [number, number, number];
    rgb: [number, number, number];
    population: number;
    bodyTextColor?: string;
    titleTextColor?: string;
  }

  interface VibrantPalette {
    Vibrant?: VibrantSwatch;
    Muted?: VibrantSwatch;
    DarkVibrant?: VibrantSwatch;
    DarkMuted?: VibrantSwatch;
    LightVibrant?: VibrantSwatch;
    LightMuted?: VibrantSwatch;
    [key: string]: VibrantSwatch | undefined;
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
