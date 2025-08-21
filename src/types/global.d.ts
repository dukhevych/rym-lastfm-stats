import type { RenderSettings } from '@/helpers/renderContent';

declare global {
  interface UserData {
    name?: string;
    image?: string;
    url?: string;
    playcount?: number | null;
    registered?: number | null;
    albums?: number | null;
    artists?: number | null;
    tracks?: number | null;
  }

  interface AddonOptions extends ModuleToggleConfig {
    profileRecentTracksShowOnLoad: boolean;
    profileRecentTracksBackground: number;
    profileRecentTracksLimit: number;
    profileRecentTracksAnimation: 'auto' | 'on' | 'off';
    profileTopArtistsLimit: number;
    profileTopArtistsPeriod: LastFmPeriod;
    profileTopAlbumsPeriod: LastFmPeriod;
    profileRecentTracksRymHistoryHide: boolean;
    profileRecentTracksPolling: boolean;
  }

  // interface AddonOptions extends AddonOptionsBase {
  //   lastfmApiKey: string;
  //   userName?: string;
  // }

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

  type LastFmPeriod = 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';

  type Range<
    N extends number,
    Result extends unknown[] = []
  > = Result['length'] extends N
    ? Result[number] | N
    : Range<N, [...Result, Result['length']]>;

    RenderSettings
}

export {};
