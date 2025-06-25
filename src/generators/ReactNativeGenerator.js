import { BaseCodeGenerator } from './BaseCodeGenerator.js';
import Handlebars from 'handlebars';

export class ReactNativeGenerator extends BaseCodeGenerator {
  constructor(options = {}) {
    super({ ...options, platform: 'react-native' });
  }

  registerPlatformHelpers() {
    // React Native specific Handlebars helpers
    Handlebars.registerHelper('rnStyleProp', (styles) => {
      if (!styles || Object.keys(styles).length === 0) return '';
      
      const styleEntries = Object.entries(styles)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');
      
      return `style={{${styleEntries}}}`;
    });

    Handlebars.registerHelper('rnImport', (componentName) => {
      const coreComponents = ['View', 'Text', 'Image', 'ScrollView', 'TouchableOpacity', 'TextInput'];
      return coreComponents.includes(componentName) ? 'react-native' : `./components/${componentName}`;
    });

    Handlebars.registerHelper('rnFlexDirection', (direction) => {
      return direction === 'HORIZONTAL' ? 'row' : 'column';
    });

    Handlebars.registerHelper('rnTextAlign', (align) => {
      const alignMap = {
        'LEFT': 'left',
        'CENTER': 'center',
        'RIGHT': 'right',
        'JUSTIFIED': 'justify'
      };
      return alignMap[align] || 'left';
    });
  }

  async generateComponents(processedData, options) {
    const componentFiles = [];

    // Generate individual components
    for (const component of processedData.components) {
      const componentFile = await this.generateComponent(component, processedData.designSystem);
      componentFiles.push(componentFile);
    }

    // Generate screens
    for (const screen of processedData.screens) {
      const screenFile = await this.generateScreen(screen, processedData.designSystem);
      componentFiles.push(screenFile);
    }

    // Generate index file for components
    const indexFile = await this.generateComponentIndex(processedData.components);
    componentFiles.push(indexFile);

    return componentFiles;
  }

  async generateComponent(component, designSystem) {
    const template = await this.loadTemplate('component');
    
    const templateData = {
      componentName: component.name,
      imports: this.generateImports(component),
      props: this.generateProps(component.properties),
      styles: this.generateComponentStyles(component, designSystem),
      jsx: this.generateJSX(component),
      exports: component.name
    };

    const content = template(templateData);

    return {
      path: `components/${component.name}.tsx`,
      content,
      type: 'component'
    };
  }

  async generateScreen(screen, designSystem) {
    const template = await this.loadTemplate('screen');
    
    const templateData = {
      screenName: this.formatComponentName(screen.name),
      imports: this.generateScreenImports(screen),
      styles: this.generateScreenStyles(screen, designSystem),
      jsx: this.generateScreenJSX(screen),
      navigation: this.generateNavigationProps(screen)
    };

    const content = template(templateData);

    return {
      path: `screens/${this.formatComponentName(screen.name)}.tsx`,
      content,
      type: 'component'
    };
  }

  generateImports(component) {
    const imports = new Set(['React']);
    
    // Add React Native core components based on component structure
    if (this.hasTextContent(component)) imports.add('Text');
    if (this.hasImageContent(component)) imports.add('Image');
    if (this.hasScrollableContent(component)) imports.add('ScrollView');
    if (this.hasInteractiveContent(component)) imports.add('TouchableOpacity');
    if (this.hasInputContent(component)) imports.add('TextInput');
    
    // Always include View as base component
    imports.add('View');

    // Add custom component imports
    const customComponents = this.extractCustomComponents(component);
    customComponents.forEach(comp => imports.add(comp));

    return Array.from(imports);
  }

  generateScreenImports(screen) {
    const imports = this.generateImports(screen);
    imports.push('SafeAreaView', 'StatusBar');
    
    // Add navigation imports if needed
    if (this.hasNavigation(screen)) {
      imports.push('useNavigation');
    }

    return imports;
  }

  generateProps(properties) {
    if (!properties || Object.keys(properties).length === 0) {
      return [];
    }

    return Object.entries(properties).map(([key, prop]) => ({
      name: key,
      type: this.mapPropType(prop.type),
      optional: !prop.required,
      defaultValue: prop.defaultValue
    }));
  }

  mapPropType(figmaType) {
    const typeMap = {
      'BOOLEAN': 'boolean',
      'TEXT': 'string',
      'INSTANCE_SWAP': 'React.ComponentType',
      'VARIANT': 'string'
    };
    
    return typeMap[figmaType] || 'any';
  }

  generateJSX(component) {
    return this.generateElementJSX(component, 0);
  }

  generateElementJSX(element, depth = 0) {
    const indent = '  '.repeat(depth + 1);
    const componentType = this.mapToReactNativeComponent(element.type);
    const props = this.generateElementProps(element);
    const children = element.children || [];

    if (children.length === 0) {
      // Self-closing tag
      return `${indent}<${componentType}${props} />`;
    }

    // Component with children
    let jsx = `${indent}<${componentType}${props}>`;
    
    if (element.type === 'TEXT') {
      jsx += `\n${indent}  {${this.generateTextContent(element)}}`;
    } else {
      children.forEach(child => {
        jsx += `\n${this.generateElementJSX(child, depth + 1)}`;
      });
    }
    
    jsx += `\n${indent}</${componentType}>`;
    return jsx;
  }

  generateScreenJSX(screen) {
    const children = screen.children || [];
    let jsx = `
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />`;

    children.forEach(child => {
      jsx += `\n${this.generateElementJSX(child, 1)}`;
    });

    jsx += `
    </SafeAreaView>`;

    return jsx;
  }

  mapToReactNativeComponent(figmaType) {
    const componentMap = {
      'FRAME': 'View',
      'GROUP': 'View',
      'RECTANGLE': 'View',
      'TEXT': 'Text',
      'IMAGE': 'Image',
      'COMPONENT': 'View',
      'INSTANCE': 'View'
    };

    return componentMap[figmaType] || 'View';
  }

  generateElementProps(element) {
    const props = [];

    // Add style prop
    if (element.styles && Object.keys(element.styles).length > 0) {
      props.push(`style={styles.${this.generateStyleName(element)}}`);
    }

    // Add specific props based on component type
    if (element.type === 'TEXT' && element.characters) {
      // Text content will be handled as children
    }

    if (element.type === 'IMAGE' && element.fills) {
      const imageFill = element.fills.find(fill => fill.type === 'IMAGE');
      if (imageFill) {
        props.push(`source={{uri: '${imageFill.imageRef}'}}`);
      }
    }

    // Add interaction props
    if (this.isInteractive(element)) {
      props.push('onPress={() => {}}');
    }

    return props.length > 0 ? ` ${props.join(' ')}` : '';
  }

  generateTextContent(element) {
    if (element.characters) {
      return `"${element.characters.replace(/"/g, '\\"')}"`;
    }
    return '"Text"';
  }

  generateStyleName(element) {
    return element.name ? 
      element.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 
      `element${element.id?.replace(/[^a-z0-9]/gi, '') || Math.random().toString(36).substr(2, 9)}`;
  }

  async generateStyles(designTokens, options) {
    const styleFiles = [];

    // Generate theme file
    const themeFile = await this.generateThemeFile(designTokens);
    styleFiles.push(themeFile);

    // Generate typography styles
    const typographyFile = await this.generateTypographyFile(designTokens);
    styleFiles.push(typographyFile);

    // Generate color palette
    const colorsFile = await this.generateColorsFile(designTokens);
    styleFiles.push(colorsFile);

    // Generate spacing constants
    const spacingFile = await this.generateSpacingFile(designTokens);
    styleFiles.push(spacingFile);

    return styleFiles;
  }

  async generateThemeFile(designTokens) {
    const template = await this.loadTemplate('theme');
    
    const content = template({
      colors: designTokens.colors || {},
      typography: designTokens.typography || {},
      spacing: designTokens.spacing || {},
      shadows: designTokens.shadows || {},
      radii: designTokens.radii || {}
    });

    return {
      path: 'theme/index.ts',
      content,
      type: 'style'
    };
  }

  async generateTypographyFile(designTokens) {
    const template = await this.loadTemplate('typography');
    
    const content = template({
      typography: designTokens.typography || {}
    });

    return {
      path: 'theme/typography.ts',
      content,
      type: 'style'
    };
  }

  async generateColorsFile(designTokens) {
    const template = await this.loadTemplate('colors');
    
    const content = template({
      colors: designTokens.colors || {}
    });

    return {
      path: 'theme/colors.ts',
      content,
      type: 'style'
    };
  }

  async generateSpacingFile(designTokens) {
    const template = await this.loadTemplate('spacing');
    
    const content = template({
      spacing: designTokens.spacing || {}
    });

    return {
      path: 'theme/spacing.ts',
      content,
      type: 'style'
    };
  }

  generateComponentStyles(component, designSystem) {
    const styles = {};
    
    // Base container style
    styles[this.generateStyleName(component)] = this.convertToReactNativeStyle(component.styles, component.layout);

    // Generate styles for children
    if (component.children) {
      component.children.forEach(child => {
        const childStyleName = this.generateStyleName(child);
        styles[childStyleName] = this.convertToReactNativeStyle(child.styles, child.layout);
      });
    }

    return styles;
  }

  generateScreenStyles(screen, designSystem) {
    const styles = {
      container: {
        flex: 1,
        backgroundColor: designSystem.tokens?.colors?.background || '#FFFFFF'
      }
    };

    // Add styles for screen children
    if (screen.children) {
      screen.children.forEach(child => {
        const childStyleName = this.generateStyleName(child);
        styles[childStyleName] = this.convertToReactNativeStyle(child.styles, child.layout);
      });
    }

    return styles;
  }

  convertToReactNativeStyle(figmaStyles, layout) {
    const rnStyle = {};

    // Layout properties
    if (layout) {
      if (layout.width) rnStyle.width = layout.width;
      if (layout.height) rnStyle.height = layout.height;
      if (layout.flexDirection) rnStyle.flexDirection = layout.flexDirection;
      if (layout.justifyContent) rnStyle.justifyContent = layout.justifyContent;
      if (layout.alignItems) rnStyle.alignItems = layout.alignItems;
      if (layout.gap) rnStyle.gap = layout.gap;
      
      if (layout.padding) {
        rnStyle.paddingLeft = layout.padding.left;
        rnStyle.paddingRight = layout.padding.right;
        rnStyle.paddingTop = layout.padding.top;
        rnStyle.paddingBottom = layout.padding.bottom;
      }
    }

    // Style properties
    if (figmaStyles) {
      if (figmaStyles.backgroundColor) rnStyle.backgroundColor = figmaStyles.backgroundColor;
      if (figmaStyles.borderColor) rnStyle.borderColor = figmaStyles.borderColor;
      if (figmaStyles.borderWidth) rnStyle.borderWidth = figmaStyles.borderWidth;
      if (figmaStyles.borderRadius) rnStyle.borderRadius = figmaStyles.borderRadius;
      if (figmaStyles.shadow && figmaStyles.shadow !== 'none') {
        // Convert CSS shadow to React Native shadow properties
        this.applyShadowStyle(rnStyle, figmaStyles.shadow);
      }
    }

    return rnStyle;
  }

  applyShadowStyle(rnStyle, shadowCss) {
    // Parse CSS shadow and convert to React Native shadow properties
    // This is a simplified implementation
    rnStyle.shadowColor = '#000';
    rnStyle.shadowOffset = { width: 0, height: 2 };
    rnStyle.shadowOpacity = 0.25;
    rnStyle.shadowRadius = 3.84;
    rnStyle.elevation = 5; // Android
  }

  async generateConfiguration(processedData, designTokens, options) {
    const configFiles = [];

    // Generate package.json dependencies
    const packageFile = await this.generatePackageConfig(options);
    configFiles.push(packageFile);

    // Generate TypeScript configuration
    const tsConfigFile = await this.generateTSConfig();
    configFiles.push(tsConfigFile);

    // Generate Metro configuration
    const metroConfigFile = await this.generateMetroConfig();
    configFiles.push(metroConfigFile);

    return configFiles;
  }

  async generatePackageConfig(options) {
    const template = await this.loadTemplate('package');
    
    const content = template({
      projectName: options.projectName || 'FigmaGeneratedApp',
      reactNativeVersion: process.env.REACT_NATIVE_VERSION || '0.72.0'
    });

    return {
      path: 'package.json',
      content,
      type: 'config'
    };
  }

  async generateTSConfig() {
    const template = await this.loadTemplate('tsconfig');
    const content = template({});

    return {
      path: 'tsconfig.json',
      content,
      type: 'config'
    };
  }

  async generateMetroConfig() {
    const template = await this.loadTemplate('metro.config');
    const content = template({});

    return {
      path: 'metro.config.js',
      content,
      type: 'config'
    };
  }

  async generateComponentIndex(components) {
    const template = await this.loadTemplate('component-index');
    
    const content = template({
      components: components.map(comp => ({
        name: comp.name,
        path: `./${comp.name}`
      }))
    });

    return {
      path: 'components/index.ts',
      content,
      type: 'config'
    };
  }

  generateNavigationProps(screen) {
    // Generate navigation-related props and types
    return {
      hasNavigation: this.hasNavigation(screen),
      navigationParams: this.extractNavigationParams(screen)
    };
  }

  // Helper methods
  hasTextContent(component) {
    return this.hasNodeType(component, 'TEXT');
  }

  hasImageContent(component) {
    return this.hasNodeType(component, 'IMAGE') || this.hasImageFills(component);
  }

  hasScrollableContent(component) {
    // Heuristic: large content or overflow
    return component.layout?.height > 800 || this.hasOverflow(component);
  }

  hasInteractiveContent(component) {
    return component.name?.toLowerCase().includes('button') || 
           component.name?.toLowerCase().includes('touchable') ||
           this.hasClickableProperties(component);
  }

  hasInputContent(component) {
    return component.name?.toLowerCase().includes('input') ||
           component.name?.toLowerCase().includes('textfield');
  }

  hasNavigation(screen) {
    return screen.name?.toLowerCase().includes('screen') ||
           screen.name?.toLowerCase().includes('page');
  }

  hasNodeType(node, type) {
    if (node.type === type) return true;
    if (node.children) {
      return node.children.some(child => this.hasNodeType(child, type));
    }
    return false;
  }

  hasImageFills(node) {
    return node.fills?.some(fill => fill.type === 'IMAGE') ||
           (node.children && node.children.some(child => this.hasImageFills(child)));
  }

  hasOverflow(component) {
    // Check if content might overflow
    return false; // Simplified implementation
  }

  hasClickableProperties(component) {
    // Check for interaction properties
    return component.properties?.onClick !== undefined;
  }

  extractCustomComponents(component) {
    // Extract references to custom components
    const customComponents = [];
    
    if (component.children) {
      component.children.forEach(child => {
        if (child.type === 'COMPONENT' || child.type === 'INSTANCE') {
          customComponents.push(this.formatComponentName(child.name));
        }
        customComponents.push(...this.extractCustomComponents(child));
      });
    }

    return [...new Set(customComponents)];
  }

  extractNavigationParams(screen) {
    // Extract potential navigation parameters
    return {};
  }
}
