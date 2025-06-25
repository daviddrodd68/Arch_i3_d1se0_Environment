import { Logger } from '../utils/Logger.js';
import { FileUtils } from '../utils/FileUtils.js';
import Handlebars from 'handlebars';
import path from 'path';

export class BaseCodeGenerator {
  constructor(options = {}) {
    this.platform = options.platform;
    this.templateDirectory = options.templateDirectory || './src/templates';
    this.outputDirectory = options.outputDirectory || './generated';
    this.logger = new Logger(`${this.platform}Generator`);
    
    this.setupHandlebars();
  }

  setupHandlebars() {
    // Register common helpers
    Handlebars.registerHelper('camelCase', (str) => {
      return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });

    Handlebars.registerHelper('pascalCase', (str) => {
      return str.replace(/(^|-)([a-z])/g, (g) => g.slice(-1).toUpperCase());
    });

    Handlebars.registerHelper('kebabCase', (str) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    });

    Handlebars.registerHelper('snakeCase', (str) => {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    });

    Handlebars.registerHelper('upperCase', (str) => str.toUpperCase());

    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('ne', (a, b) => a !== b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    Handlebars.registerHelper('lt', (a, b) => a < b);

    Handlebars.registerHelper('json', (obj) => JSON.stringify(obj, null, 2));

    // Platform-specific helpers will be added by subclasses
    this.registerPlatformHelpers();
  }

  registerPlatformHelpers() {
    // Override in subclasses to add platform-specific helpers
  }

  async generateCode(figmaData, designTokens, options = {}) {
    try {
      this.logger.info(`Generating ${this.platform} code...`);

      // Process the Figma data
      const processedData = await this.processFigmaData(figmaData, designTokens);

      // Generate component files
      const componentFiles = await this.generateComponents(processedData, options);

      // Generate style files
      const styleFiles = await this.generateStyles(designTokens, options);

      // Generate configuration files
      const configFiles = await this.generateConfiguration(processedData, designTokens, options);

      // Generate assets
      const assetFiles = await this.generateAssets(processedData, options);

      const allFiles = [
        ...componentFiles,
        ...styleFiles,
        ...configFiles,
        ...assetFiles
      ];

      // Write files to disk
      await this.writeFiles(allFiles, options);

      this.logger.info(`Successfully generated ${allFiles.length} files for ${this.platform}`);

      return {
        platform: this.platform,
        files: allFiles,
        outputPath: this.getOutputPath(options),
        summary: this.generateSummary(allFiles)
      };

    } catch (error) {
      this.logger.error(`Failed to generate ${this.platform} code:`, error);
      throw error;
    }
  }

  async processFigmaData(figmaData, designTokens) {
    // Extract components from Figma data
    const components = this.extractComponents(figmaData.document);
    
    // Process each component
    const processedComponents = components.map(component => {
      return {
        id: component.id,
        name: this.formatComponentName(component.name),
        type: component.type,
        properties: this.extractProperties(component),
        styles: this.extractStyles(component, designTokens),
        children: this.processChildren(component.children || [], designTokens),
        layout: this.extractLayout(component),
        constraints: this.extractConstraints(component)
      };
    });

    return {
      components: processedComponents,
      screens: this.extractScreens(figmaData.document),
      designSystem: this.buildDesignSystem(designTokens)
    };
  }

  extractComponents(node, components = []) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      components.push(node);
    }

    if (node.children) {
      node.children.forEach(child => {
        this.extractComponents(child, components);
      });
    }

    return components;
  }

  extractScreens(node, screens = []) {
    if (node.type === 'FRAME' && this.isScreen(node)) {
      screens.push(node);
    }

    if (node.children) {
      node.children.forEach(child => {
        this.extractScreens(child, screens);
      });
    }

    return screens;
  }

  isScreen(node) {
    // Heuristics to determine if a frame is a screen
    const name = node.name.toLowerCase();
    const isLargeFrame = node.absoluteBoundingBox?.width > 300 && node.absoluteBoundingBox?.height > 500;
    const hasScreenKeywords = /screen|page|view|modal/.test(name);
    
    return isLargeFrame || hasScreenKeywords;
  }

  formatComponentName(name) {
    // Remove special characters and convert to PascalCase
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  extractProperties(component) {
    // Extract component properties (variants, etc.)
    const properties = {};

    if (component.componentPropertyDefinitions) {
      Object.entries(component.componentPropertyDefinitions).forEach(([key, prop]) => {
        properties[key] = {
          type: prop.type,
          defaultValue: prop.defaultValue,
          variantOptions: prop.variantOptions
        };
      });
    }

    return properties;
  }

  extractStyles(component, designTokens) {
    // Extract and map styles to design tokens
    const styles = {};

    if (component.fills) {
      styles.backgroundColor = this.mapFillToToken(component.fills[0], designTokens);
    }

    if (component.strokes) {
      styles.borderColor = this.mapStrokeToToken(component.strokes[0], designTokens);
      styles.borderWidth = component.strokeWeight || 1;
    }

    if (component.cornerRadius !== undefined) {
      styles.borderRadius = this.mapRadiusToToken(component.cornerRadius, designTokens);
    }

    if (component.effects) {
      styles.shadow = this.mapEffectsToToken(component.effects, designTokens);
    }

    return styles;
  }

  processChildren(children, designTokens) {
    return children.map(child => ({
      id: child.id,
      name: child.name,
      type: child.type,
      styles: this.extractStyles(child, designTokens),
      layout: this.extractLayout(child),
      children: child.children ? this.processChildren(child.children, designTokens) : []
    }));
  }

  extractLayout(node) {
    const layout = {};

    if (node.absoluteBoundingBox) {
      layout.width = node.absoluteBoundingBox.width;
      layout.height = node.absoluteBoundingBox.height;
      layout.x = node.absoluteBoundingBox.x;
      layout.y = node.absoluteBoundingBox.y;
    }

    if (node.layoutMode) {
      layout.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    }

    if (node.primaryAxisAlignItems) {
      layout.justifyContent = this.mapAlignment(node.primaryAxisAlignItems);
    }

    if (node.counterAxisAlignItems) {
      layout.alignItems = this.mapAlignment(node.counterAxisAlignItems);
    }

    if (node.itemSpacing !== undefined) {
      layout.gap = node.itemSpacing;
    }

    if (node.paddingLeft !== undefined) {
      layout.padding = {
        left: node.paddingLeft,
        right: node.paddingRight || node.paddingLeft,
        top: node.paddingTop || node.paddingLeft,
        bottom: node.paddingBottom || node.paddingLeft
      };
    }

    return layout;
  }

  extractConstraints(node) {
    const constraints = {};

    if (node.constraints) {
      constraints.horizontal = node.constraints.horizontal;
      constraints.vertical = node.constraints.vertical;
    }

    return constraints;
  }

  mapAlignment(figmaAlignment) {
    const alignmentMap = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between'
    };

    return alignmentMap[figmaAlignment] || 'flex-start';
  }

  mapFillToToken(fill, designTokens) {
    if (fill.type === 'SOLID' && fill.color) {
      // Try to find matching color token
      const colorHex = this.rgbToHex(fill.color);
      const colorToken = this.findColorToken(colorHex, designTokens);
      return colorToken || colorHex;
    }
    return 'transparent';
  }

  mapStrokeToToken(stroke, designTokens) {
    if (stroke.type === 'SOLID' && stroke.color) {
      const colorHex = this.rgbToHex(stroke.color);
      const colorToken = this.findColorToken(colorHex, designTokens);
      return colorToken || colorHex;
    }
    return 'transparent';
  }

  mapRadiusToToken(radius, designTokens) {
    const radiusToken = this.findRadiusToken(radius, designTokens);
    return radiusToken || `${radius}px`;
  }

  mapEffectsToToken(effects, designTokens) {
    // Map shadow effects to design tokens
    const shadows = effects
      .filter(effect => effect.type === 'DROP_SHADOW')
      .map(effect => {
        const shadowToken = this.findShadowToken(effect, designTokens);
        return shadowToken || this.effectToCss(effect);
      });

    return shadows.length > 0 ? shadows.join(', ') : 'none';
  }

  findColorToken(colorHex, designTokens) {
    if (!designTokens.colors) return null;
    
    for (const [tokenName, tokenValue] of Object.entries(designTokens.colors)) {
      if (tokenValue === colorHex) {
        return `{colors.${tokenName}}`;
      }
    }
    return null;
  }

  findRadiusToken(radius, designTokens) {
    if (!designTokens.radii) return null;
    
    for (const [tokenName, tokenValue] of Object.entries(designTokens.radii)) {
      if (parseInt(tokenValue) === radius) {
        return `{radii.${tokenName}}`;
      }
    }
    return null;
  }

  findShadowToken(effect, designTokens) {
    // Implementation for finding matching shadow tokens
    return null;
  }

  rgbToHex(rgb) {
    const toHex = (c) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  effectToCss(effect) {
    const { offset, radius, color } = effect;
    const colorHex = this.rgbToHex(color);
    return `${offset?.x || 0}px ${offset?.y || 0}px ${radius || 0}px ${colorHex}`;
  }

  buildDesignSystem(designTokens) {
    return {
      tokens: designTokens,
      theme: this.generateTheme(designTokens),
      breakpoints: designTokens.breakpoints || {}
    };
  }

  generateTheme(designTokens) {
    // Generate platform-specific theme object
    return designTokens;
  }

  // Abstract methods to be implemented by subclasses
  async generateComponents(processedData, options) {
    throw new Error('generateComponents must be implemented by subclass');
  }

  async generateStyles(designTokens, options) {
    throw new Error('generateStyles must be implemented by subclass');
  }

  async generateConfiguration(processedData, designTokens, options) {
    throw new Error('generateConfiguration must be implemented by subclass');
  }

  async generateAssets(processedData, options) {
    return []; // Default implementation
  }

  async writeFiles(files, options) {
    const outputPath = this.getOutputPath(options);
    await FileUtils.ensureDirectory(outputPath);

    for (const file of files) {
      const filePath = path.join(outputPath, file.path);
      await FileUtils.writeFile(filePath, file.content);
      this.logger.debug(`Generated: ${file.path}`);
    }
  }

  getOutputPath(options) {
    return path.join(this.outputDirectory, this.platform, options.projectName || 'generated');
  }

  generateSummary(files) {
    const summary = {
      totalFiles: files.length,
      components: files.filter(f => f.type === 'component').length,
      styles: files.filter(f => f.type === 'style').length,
      assets: files.filter(f => f.type === 'asset').length,
      config: files.filter(f => f.type === 'config').length
    };

    return summary;
  }

  async loadTemplate(templateName) {
    const templatePath = path.join(this.templateDirectory, this.platform, `${templateName}.hbs`);
    const templateContent = await FileUtils.readFile(templatePath);
    return Handlebars.compile(templateContent);
  }
}
