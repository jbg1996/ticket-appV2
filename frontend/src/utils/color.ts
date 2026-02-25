const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HslColor = {
  h: number;
  s: number;
  l: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeHex(hex: string) {
  const trimmed = hex.trim();
  if (!hexColorPattern.test(trimmed)) {
    return null;
  }
  const raw = trimmed.slice(1);
  return raw.length === 3 ? raw.split('').map((char) => `${char}${char}`).join('') : raw;
}

function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }

  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: Math.round(((hue * 60 + 360) % 360)),
    s: saturation * 100,
    l: lightness * 100
  };
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;

  let redPrime = 0;
  let greenPrime = 0;
  let bluePrime = 0;

  if (hue < 60) {
    redPrime = chroma;
    greenPrime = x;
  } else if (hue < 120) {
    redPrime = x;
    greenPrime = chroma;
  } else if (hue < 180) {
    greenPrime = chroma;
    bluePrime = x;
  } else if (hue < 240) {
    greenPrime = x;
    bluePrime = chroma;
  } else if (hue < 300) {
    redPrime = x;
    bluePrime = chroma;
  } else {
    redPrime = chroma;
    bluePrime = x;
  }

  return {
    r: (redPrime + m) * 255,
    g: (greenPrime + m) * 255,
    b: (bluePrime + m) * 255
  };
}

function toLinearChannel(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: RgbColor) {
  const r = toLinearChannel(color.r);
  const g = toLinearChannel(color.g);
  const b = toLinearChannel(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(colorA: string, colorB: string) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) {
    return 1;
  }

  const luminanceA = getRelativeLuminance(rgbA);
  const luminanceB = getRelativeLuminance(rgbB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function getReadableTextColor(backgroundColor: string) {
  const lightText = '#f8fafc';
  const darkText = '#0f172a';
  const lightContrast = getContrastRatio(backgroundColor, lightText);
  const darkContrast = getContrastRatio(backgroundColor, darkText);

  if (lightContrast >= 4.5 || darkContrast >= 4.5) {
    return lightContrast >= darkContrast ? lightText : darkText;
  }

  return lightContrast >= darkContrast ? lightText : darkText;
}

export function lightenColor(hex: string, amount = 16, maxLightness = 95) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  const hsl = rgbToHsl(rgb);
  const lightness = clamp(hsl.l + amount, 0, maxLightness);
  return rgbToHex(hslToRgb({ ...hsl, l: lightness }));
}

export function getSidebarTheme(sidebarColor: string) {
  const activeBgColor = lightenColor(sidebarColor, 16, 95);
  const sidebarTextColor = getReadableTextColor(sidebarColor);
  const activeTextColor = getReadableTextColor(activeBgColor);

  return {
    sidebarBgColor: sidebarColor,
    sidebarTextColor,
    activeBgColor,
    activeTextColor
  };
}

export function isValidHexColor(color: string) {
  return hexColorPattern.test(color.trim());
}
