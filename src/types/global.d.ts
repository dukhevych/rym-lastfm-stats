declare global {
  interface UserData {
    name?: string;
    image?: string;
    url?: string;
    // add other properties if needed
  }

  interface AddonOptionsBase extends ModuleToggleConfig {
    recentTracksShowOnLoad: boolean;
    recentTracksBackground: number;
    recentTracksLimit: number;
    recentTracksAnimation: 'auto' | 'on' | 'off';
    topArtistsLimit: number;
    topArtistsPeriod: string;
    topAlbumsPeriod: string;
    rymPlayHistoryHide: boolean;
    recentTracksPollingEnabled: boolean;
    recentTracksHistory: boolean;
  }

  interface AddonOptions extends AddonOptionsBase {
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
