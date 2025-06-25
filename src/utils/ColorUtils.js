export class ColorUtils {
  // Convert RGB object to hex string
  static rgbToHex(rgb) {
    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  // Convert RGBA object to hex string with alpha
  static rgbaToHex(rgba) {
    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    const hex = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
    
    if (rgba.a !== undefined && rgba.a < 1) {
      return hex + toHex(rgba.a);
    }
    
    return hex;
  }

  // Convert hex string to RGB object
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }

  // Convert RGB to HSL
  static rgbToHsl(rgb) {
    const { r, g, b } = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  // Convert HSL to RGB
  static hslToRgb(hsl) {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;

    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
  }

  // Get color brightness (0-1)
  static getBrightness(rgb) {
    return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114);
  }

  // Check if color is light
  static isLight(rgb) {
    return this.getBrightness(rgb) > 0.5;
  }

  // Check if color is dark
  static isDark(rgb) {
    return this.getBrightness(rgb) <= 0.5;
  }

  // Get contrasting color (black or white)
  static getContrastColor(rgb) {
    return this.isLight(rgb) ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
  }

  // Calculate color contrast ratio
  static getContrastRatio(rgb1, rgb2) {
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  // Get relative luminance
  static getLuminance(rgb) {
    const { r, g, b } = rgb;
    
    const sRGBtoLin = (colorChannel) => {
      if (colorChannel <= 0.03928) {
        return colorChannel / 12.92;
      } else {
        return Math.pow((colorChannel + 0.055) / 1.055, 2.4);
      }
    };
    
    return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
  }

  // Check if contrast meets WCAG guidelines
  static meetsWCAGContrast(rgb1, rgb2, level = 'AA') {
    const ratio = this.getContrastRatio(rgb1, rgb2);
    
    switch (level) {
      case 'AA': return ratio >= 4.5;
      case 'AAA': return ratio >= 7;
      case 'AA-large': return ratio >= 3;
      case 'AAA-large': return ratio >= 4.5;
      default: return ratio >= 4.5;
    }
  }

  // Generate color palette
  static generatePalette(baseColor, count = 5) {
    const hsl = this.rgbToHsl(baseColor);
    const palette = [];
    
    for (let i = 0; i < count; i++) {
      const lightness = 20 + (i * (80 / (count - 1)));
      const newHsl = { ...hsl, l: lightness };
      const rgb = this.hslToRgb(newHsl);
      palette.push(rgb);
    }
    
    return palette;
  }

  // Generate complementary color
  static getComplementary(rgb) {
    const hsl = this.rgbToHsl(rgb);
    const complementaryHsl = {
      h: (hsl.h + 180) % 360,
      s: hsl.s,
      l: hsl.l
    };
    
    return this.hslToRgb(complementaryHsl);
  }

  // Generate triadic colors
  static getTriadic(rgb) {
    const hsl = this.rgbToHsl(rgb);
    
    const triadic1 = this.hslToRgb({
      h: (hsl.h + 120) % 360,
      s: hsl.s,
      l: hsl.l
    });
    
    const triadic2 = this.hslToRgb({
      h: (hsl.h + 240) % 360,
      s: hsl.s,
      l: hsl.l
    });
    
    return [triadic1, triadic2];
  }

  // Generate analogous colors
  static getAnalogous(rgb, angle = 30) {
    const hsl = this.rgbToHsl(rgb);
    
    const analogous1 = this.hslToRgb({
      h: (hsl.h + angle) % 360,
      s: hsl.s,
      l: hsl.l
    });
    
    const analogous2 = this.hslToRgb({
      h: (hsl.h - angle + 360) % 360,
      s: hsl.s,
      l: hsl.l
    });
    
    return [analogous1, analogous2];
  }

  // Mix two colors
  static mix(rgb1, rgb2, ratio = 0.5) {
    return {
      r: rgb1.r * (1 - ratio) + rgb2.r * ratio,
      g: rgb1.g * (1 - ratio) + rgb2.g * ratio,
      b: rgb1.b * (1 - ratio) + rgb2.b * ratio
    };
  }

  // Lighten color
  static lighten(rgb, amount = 0.1) {
    const hsl = this.rgbToHsl(rgb);
    hsl.l = Math.min(100, hsl.l + amount * 100);
    return this.hslToRgb(hsl);
  }

  // Darken color
  static darken(rgb, amount = 0.1) {
    const hsl = this.rgbToHsl(rgb);
    hsl.l = Math.max(0, hsl.l - amount * 100);
    return this.hslToRgb(hsl);
  }

  // Saturate color
  static saturate(rgb, amount = 0.1) {
    const hsl = this.rgbToHsl(rgb);
    hsl.s = Math.min(100, hsl.s + amount * 100);
    return this.hslToRgb(hsl);
  }

  // Desaturate color
  static desaturate(rgb, amount = 0.1) {
    const hsl = this.rgbToHsl(rgb);
    hsl.s = Math.max(0, hsl.s - amount * 100);
    return this.hslToRgb(hsl);
  }

  // Get color name (basic implementation)
  static getColorName(hex) {
    const colorNames = {
      '#FF0000': 'red',
      '#00FF00': 'green',
      '#0000FF': 'blue',
      '#FFFF00': 'yellow',
      '#FF00FF': 'magenta',
      '#00FFFF': 'cyan',
      '#000000': 'black',
      '#FFFFFF': 'white',
      '#808080': 'gray',
      '#FFA500': 'orange',
      '#800080': 'purple',
      '#FFC0CB': 'pink',
      '#A52A2A': 'brown',
      '#008000': 'darkgreen',
      '#000080': 'navy'
    };

    // Find closest color
    const rgb = this.hexToRgb(hex);
    if (!rgb) return null;

    let closestColor = null;
    let minDistance = Infinity;

    for (const [colorHex, colorName] of Object.entries(colorNames)) {
      const colorRgb = this.hexToRgb(colorHex);
      const distance = this.getColorDistance(rgb, colorRgb);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = colorName;
      }
    }

    return closestColor;
  }

  // Calculate color distance
  static getColorDistance(rgb1, rgb2) {
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;
    
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // Convert color to CSS string
  static toCss(rgb, alpha) {
    if (alpha !== undefined && alpha < 1) {
      return `rgba(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}, ${alpha})`;
    }
    
    return this.rgbToHex(rgb);
  }

  // Parse CSS color string
  static fromCss(cssColor) {
    // Handle hex colors
    if (cssColor.startsWith('#')) {
      return this.hexToRgb(cssColor);
    }
    
    // Handle rgb/rgba colors
    const rgbMatch = cssColor.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(',').map(v => parseFloat(v.trim()));
      return {
        r: values[0] / 255,
        g: values[1] / 255,
        b: values[2] / 255,
        a: values[3] !== undefined ? values[3] : 1
      };
    }
    
    // Handle named colors (basic implementation)
    const namedColors = {
      'red': { r: 1, g: 0, b: 0 },
      'green': { r: 0, g: 1, b: 0 },
      'blue': { r: 0, g: 0, b: 1 },
      'white': { r: 1, g: 1, b: 1 },
      'black': { r: 0, g: 0, b: 0 }
    };
    
    return namedColors[cssColor.toLowerCase()] || null;
  }

  // Validate color format
  static isValidHex(hex) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  static isValidRgb(rgb) {
    return rgb && 
           typeof rgb.r === 'number' && rgb.r >= 0 && rgb.r <= 1 &&
           typeof rgb.g === 'number' && rgb.g >= 0 && rgb.g <= 1 &&
           typeof rgb.b === 'number' && rgb.b >= 0 && rgb.b <= 1;
  }
}
