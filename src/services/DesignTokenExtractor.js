import { Logger } from '../utils/Logger.js';
import { ColorUtils } from '../utils/ColorUtils.js';

export class DesignTokenExtractor {
  constructor(figmaService) {
    this.figmaService = figmaService;
    this.logger = new Logger('DesignTokenExtractor');
  }

  async extractTokens(fileKey, options = {}) {
    try {
      this.logger.info(`Extracting design tokens from file: ${fileKey}`);

      const [fileData, variables, styles] = await Promise.all([
        this.figmaService.getFile(fileKey),
        this.figmaService.getLocalVariables(fileKey).catch(() => ({ meta: { variables: {}, variableCollections: {} } })),
        this.figmaService.getStyles(fileKey).catch(() => ({ meta: { styles: {} } }))
      ]);

      const tokens = {
        colors: {},
        typography: {},
        spacing: {},
        shadows: {},
        borders: {},
        radii: {},
        opacity: {},
        sizing: {},
        breakpoints: {},
        zIndex: {}
      };

      // Extract from Figma variables (preferred method)
      if (variables.meta?.variables) {
        this.extractFromVariables(variables, tokens);
      }

      // Extract from styles
      if (styles.meta?.styles) {
        this.extractFromStyles(styles, tokens);
      }

      // Extract from document nodes
      this.extractFromNodes(fileData.document, tokens);

      // Apply transformations and formatting
      this.processTokens(tokens, options);

      this.logger.info(`Successfully extracted ${this.countTokens(tokens)} design tokens`);
      return tokens;

    } catch (error) {
      this.logger.error('Failed to extract design tokens:', error);
      throw error;
    }
  }

  extractFromVariables(variables, tokens) {
    const { variables: vars, variableCollections } = variables.meta;

    Object.values(vars).forEach(variable => {
      const collection = variableCollections[variable.variableCollectionId];
      const category = this.categorizeVariable(variable, collection);
      
      if (category && tokens[category]) {
        const tokenName = this.formatTokenName(variable.name);
        tokens[category][tokenName] = this.processVariableValue(variable, vars);
      }
    });
  }

  extractFromStyles(styles, tokens) {
    Object.values(styles.meta.styles).forEach(style => {
      const category = this.categorizeStyle(style);
      
      if (category && tokens[category]) {
        const tokenName = this.formatTokenName(style.name);
        tokens[category][tokenName] = this.processStyleValue(style);
      }
    });
  }

  extractFromNodes(node, tokens, depth = 0) {
    if (depth > 10) return; // Prevent infinite recursion

    // Extract colors from fills and strokes
    if (node.fills) {
      node.fills.forEach(fill => {
        if (fill.type === 'SOLID' && fill.color) {
          const colorName = this.generateColorName(fill.color);
          tokens.colors[colorName] = ColorUtils.rgbToHex(fill.color);
        }
      });
    }

    if (node.strokes) {
      node.strokes.forEach(stroke => {
        if (stroke.type === 'SOLID' && stroke.color) {
          const colorName = this.generateColorName(stroke.color);
          tokens.colors[colorName] = ColorUtils.rgbToHex(stroke.color);
        }
      });
    }

    // Extract typography
    if (node.style) {
      const typographyName = this.formatTokenName(node.name || 'text');
      tokens.typography[typographyName] = this.extractTypographyStyle(node.style);
    }

    // Extract spacing and sizing
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;
      if (this.isStandardSize(width)) {
        tokens.sizing[`width-${width}`] = `${width}px`;
      }
      if (this.isStandardSize(height)) {
        tokens.sizing[`height-${height}`] = `${height}px`;
      }
    }

    // Extract border radius
    if (node.cornerRadius !== undefined) {
      const radiusName = `radius-${node.cornerRadius}`;
      tokens.radii[radiusName] = `${node.cornerRadius}px`;
    }

    // Extract effects (shadows, blurs)
    if (node.effects) {
      node.effects.forEach((effect, index) => {
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
          const shadowName = `shadow-${index}`;
          tokens.shadows[shadowName] = this.extractShadowStyle(effect);
        }
      });
    }

    // Recursively process children
    if (node.children) {
      node.children.forEach(child => {
        this.extractFromNodes(child, tokens, depth + 1);
      });
    }
  }

  categorizeVariable(variable, collection) {
    const name = variable.name.toLowerCase();
    const collectionName = collection?.name?.toLowerCase() || '';

    if (name.includes('color') || collectionName.includes('color')) return 'colors';
    if (name.includes('space') || name.includes('spacing') || name.includes('gap')) return 'spacing';
    if (name.includes('font') || name.includes('text') || name.includes('typography')) return 'typography';
    if (name.includes('shadow') || name.includes('elevation')) return 'shadows';
    if (name.includes('border') || name.includes('stroke')) return 'borders';
    if (name.includes('radius') || name.includes('corner')) return 'radii';
    if (name.includes('opacity') || name.includes('alpha')) return 'opacity';
    if (name.includes('size') || name.includes('width') || name.includes('height')) return 'sizing';
    if (name.includes('breakpoint') || name.includes('screen')) return 'breakpoints';
    if (name.includes('z') || name.includes('layer') || name.includes('depth')) return 'zIndex';

    return null;
  }

  categorizeStyle(style) {
    const styleType = style.styleType;
    
    switch (styleType) {
      case 'FILL': return 'colors';
      case 'TEXT': return 'typography';
      case 'EFFECT': return 'shadows';
      case 'GRID': return 'spacing';
      default: return null;
    }
  }

  processVariableValue(variable, allVariables) {
    const value = variable.valuesByMode[Object.keys(variable.valuesByMode)[0]];
    
    if (typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
      // Handle variable references
      const referencedVar = allVariables[value.id];
      if (referencedVar) {
        return `{${this.formatTokenName(referencedVar.name)}}`;
      }
    }

    switch (variable.resolvedType) {
      case 'COLOR':
        return ColorUtils.rgbaToHex(value);
      case 'FLOAT':
        return `${value}px`;
      case 'STRING':
        return value;
      default:
        return value;
    }
  }

  processStyleValue(style) {
    // This would be implemented based on the specific style type
    // For now, return a placeholder
    return {
      name: style.name,
      description: style.description || '',
      type: style.styleType
    };
  }

  extractTypographyStyle(style) {
    return {
      fontFamily: style.fontFamily || 'inherit',
      fontSize: style.fontSize ? `${style.fontSize}px` : 'inherit',
      fontWeight: style.fontWeight || 'normal',
      lineHeight: style.lineHeightPx ? `${style.lineHeightPx}px` : 'normal',
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : 'normal',
      textAlign: style.textAlignHorizontal?.toLowerCase() || 'left'
    };
  }

  extractShadowStyle(effect) {
    const { offset, radius, color, spread } = effect;
    const colorHex = ColorUtils.rgbaToHex(color);
    
    return {
      offsetX: `${offset?.x || 0}px`,
      offsetY: `${offset?.y || 0}px`,
      blurRadius: `${radius || 0}px`,
      spreadRadius: `${spread || 0}px`,
      color: colorHex,
      css: `${offset?.x || 0}px ${offset?.y || 0}px ${radius || 0}px ${spread || 0}px ${colorHex}`
    };
  }

  formatTokenName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  generateColorName(color) {
    const hex = ColorUtils.rgbToHex(color);
    const name = ColorUtils.getColorName(hex);
    return this.formatTokenName(name || hex);
  }

  isStandardSize(size) {
    // Check if size is a standard design system value
    const standardSizes = [4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96];
    return standardSizes.includes(size) || size % 8 === 0;
  }

  processTokens(tokens, options) {
    // Remove empty categories
    Object.keys(tokens).forEach(category => {
      if (Object.keys(tokens[category]).length === 0) {
        delete tokens[category];
      }
    });

    // Apply naming conventions
    if (options.namingConvention) {
      this.applyNamingConvention(tokens, options.namingConvention);
    }

    // Sort tokens
    Object.keys(tokens).forEach(category => {
      const sorted = {};
      Object.keys(tokens[category]).sort().forEach(key => {
        sorted[key] = tokens[category][key];
      });
      tokens[category] = sorted;
    });
  }

  applyNamingConvention(tokens, convention) {
    // Apply different naming conventions (camelCase, kebab-case, snake_case)
    // Implementation would depend on the specific convention
  }

  countTokens(tokens) {
    return Object.values(tokens).reduce((total, category) => {
      return total + Object.keys(category).length;
    }, 0);
  }
}
