import browser from 'webextension-polyfill';
import { Vibrant } from "node-vibrant/browser";

interface FetchImageResponse {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export async function getImageColors(imageUrl: string): Promise<ReturnType<typeof getVibrantUiColors>> {
  const dataUrl: string = await new Promise<string>((resolve, reject) => {
    browser.runtime.sendMessage({ type: 'FETCH_IMAGE', url: imageUrl })
      .then((response: FetchImageResponse) => {
        if (!response?.success) {
          return reject(new Error(response?.error || 'Failed to fetch image'));
        }
        resolve(response.dataUrl as string);
      })
      .catch((err: any) => {
        reject(err);
      });
  });

  const v = new Vibrant(dataUrl);

  const rawPalette = await v.getPalette();

  // Convert null swatches to undefined to match VibrantPalette type
  const palette: VibrantPalette = Object.fromEntries(
    Object.entries(rawPalette).map(([key, value]) => [key, value === null ? undefined : value])
  );

  return getVibrantUiColors(palette);
}

function getContrastingColor(
  hexColor: string,
  darkColor: string = '#000',
  lightColor: string = '#fff'
): string {
  if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hexColor)) {
    throw new Error('Invalid hex color format');
  }

  const hex: string = hexColor.slice(1);
  const parseHex = (hex: string): number => parseInt(hex.length === 1 ? hex + hex : hex, 16);

  const r: number = parseHex(hex.length === 3 ? hex[0] : hex.substring(0, 2));
  const g: number = parseHex(hex.length === 3 ? hex[1] : hex.substring(2, 4));
  const b: number = parseHex(hex.length === 3 ? hex[2] : hex.substring(4, 6));

  const relativeLuminance = (r: number, g: number, b: number): number => {
    const [R, G, B]: number[] = [r, g, b].map((c: number) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  return relativeLuminance(r, g, b) > 0.179 ? darkColor : lightColor;
}

async function getVibrantUiColors(palette: VibrantPalette): Promise<VibrantUiColors> {
  const lightColors = {
    bgColor: (palette.LightMuted || palette.Muted || palette.LightVibrant)?.hex || '#222',
    accentColor: (palette.Vibrant || palette.DarkVibrant)?.hex || '#ff4081',
    accentColorHSL: (palette.Vibrant || palette.DarkVibrant)?.hsl || [0.9444444, 1, 0.63],
  };

  const darkColors = {
    bgColor: (palette.DarkMuted || palette.Muted || palette.DarkVibrant)?.hex || '#222',
    accentColor: (palette.Vibrant || palette.LightVibrant)?.hex || '#ff4081',
    accentColorHSL: (palette.Vibrant || palette.LightVibrant)?.hsl || [0.9444444, 1, 0.63],
  };

  return {
    light: {
      ...lightColors,
      get bgColorContrast() {
        return getContrastingColor(this.bgColor);
      },
      get accentColorContrast() {
        return getContrastingColor(this.accentColor);
      },
    },
    dark: {
      ...darkColors,
      get bgColorContrast() {
        return getContrastingColor(this.bgColor);
      },
      get accentColorContrast() {
        return getContrastingColor(this.accentColor);
      },
    },
    palette,
  };
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.trunc(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type CSSVarName = `--${string}`;

export function getColorsMap(colors: VibrantUiColors) {
  const result: Record<CSSVarName, string> = {
    '--clr-light-bg': colors.light.bgColor,
    '--clr-light-bg-contrast': colors.light.bgColorContrast,
    '--clr-light-accent': colors.light.accentColor,
    '--clr-light-accent-contrast': colors.light.accentColorContrast,
    '--clr-dark-bg': colors.dark.bgColor,
    '--clr-dark-bg-contrast': colors.dark.bgColorContrast,
    '--clr-dark-accent': colors.dark.accentColor,
    '--clr-dark-accent-contrast': colors.dark.accentColorContrast,
    '--clr-light-accent-hue': String(Math.trunc(colors.light.accentColorHSL[0] * 360)),
    '--clr-light-accent-saturation': (colors.light.accentColorHSL[1] * 100).toFixed(2),
    '--clr-light-accent-lightness': (colors.light.accentColorHSL[2] * 100).toFixed(2),
    '--clr-dark-accent-hue': String(Math.trunc(colors.dark.accentColorHSL[0] * 360)),
    '--clr-dark-accent-saturation': (colors.dark.accentColorHSL[1] * 100).toFixed(2),
    '--clr-dark-accent-lightness': (colors.dark.accentColorHSL[2] * 100).toFixed(2),
  };

  Object.keys(colors.palette).forEach((key) => {
    if (colors.palette[key]?.rgb) {
      result[`--clr-palette-${key.toLowerCase()}`] = rgbToHex(colors.palette[key].rgb);
    }
  });

  return result;
}