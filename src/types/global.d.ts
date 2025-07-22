declare global {
  interface UserData {
    name?: string;
    // add other properties if needed
  }

  interface ProfileOptionsBase {
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
    recentTracksPollingEnabled: boolean;
    recentTracksHistory: boolean;
    list_userRating: boolean;
    charts_userRating: boolean;
  }

  interface ProfileOptions extends ProfileOptionsBase {
    lastfmApiKey: string;
    userName?: string;
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
