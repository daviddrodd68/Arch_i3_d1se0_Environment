import { BaseCodeGenerator } from './BaseCodeGenerator.js';
import Handlebars from 'handlebars';

export class SwiftUIGenerator extends BaseCodeGenerator {
  constructor(options = {}) {
    super({ ...options, platform: 'swiftui' });
  }

  registerPlatformHelpers() {
    // SwiftUI specific Handlebars helpers
    Handlebars.registerHelper('swiftType', (figmaType) => {
      const typeMap = {
        'BOOLEAN': 'Bool',
        'TEXT': 'String',
        'INSTANCE_SWAP': 'AnyView',
        'VARIANT': 'String'
      };
      return typeMap[figmaType] || 'Any';
    });

    Handlebars.registerHelper('swiftView', (figmaType) => {
      const viewMap = {
        'FRAME': 'VStack',
        'GROUP': 'VStack',
        'RECTANGLE': 'Rectangle',
        'TEXT': 'Text',
        'IMAGE': 'Image',
        'COMPONENT': 'VStack',
        'INSTANCE': 'VStack'
      };
      return viewMap[figmaType] || 'VStack';
    });

    Handlebars.registerHelper('swiftColor', (colorHex) => {
      if (!colorHex || !colorHex.startsWith('#')) return 'Color.clear';
      const hex = colorHex.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
    });
  }

  async generateComponents(processedData, options) {
    const componentFiles = [];

    // Generate individual views
    for (const component of processedData.components) {
      const viewFile = await this.generateView(component, processedData.designSystem);
      componentFiles.push(viewFile);
    }

    // Generate screens
    for (const screen of processedData.screens) {
      const screenFile = await this.generateScreen(screen, processedData.designSystem);
      componentFiles.push(screenFile);
    }

    return componentFiles;
  }

  async generateView(component, designSystem) {
    const template = await this.loadTemplate('view');
    
    const templateData = {
      viewName: component.name,
      imports: this.generateImports(component),
      properties: this.generateProperties(component.properties),
      body: this.generateViewBody(component),
      modifiers: this.generateViewModifiers(component, designSystem)
    };

    const content = template(templateData);

    return {
      path: `Sources/Views/${component.name}.swift`,
      content,
      type: 'component'
    };
  }

  async generateScreen(screen, designSystem) {
    const template = await this.loadTemplate('screen');
    
    const templateData = {
      screenName: this.formatComponentName(screen.name),
      imports: this.generateScreenImports(screen),
      body: this.generateScreenBody(screen),
      modifiers: this.generateScreenModifiers(screen, designSystem)
    };

    const content = template(templateData);

    return {
      path: `Sources/Screens/${this.formatComponentName(screen.name)}.swift`,
      content,
      type: 'component'
    };
  }

  generateViewBody(component) {
    return this.generateSwiftUIView(component, 0);
  }

  generateScreenBody(screen) {
    const children = screen.children || [];
    
    if (children.length === 0) {
      return 'Text("Empty Screen")';
    }

    if (children.length === 1) {
      return this.generateSwiftUIView(children[0], 0);
    }

    let body = 'VStack {\n';
    children.forEach(child => {
      body += `    ${this.generateSwiftUIView(child, 1)}\n`;
    });
    body += '}';

    return body;
  }

  generateSwiftUIView(element, depth = 0) {
    const indent = '    '.repeat(depth);
    const viewType = this.mapToSwiftUIView(element.type);
    const modifiers = this.generateElementModifiers(element);

    if (element.children && element.children.length > 0) {
      let view = `${viewType} {\n`;
      
      element.children.forEach(child => {
        view += `${indent}    ${this.generateSwiftUIView(child, depth + 1)}\n`;
      });
      
      view += `${indent}}`;
      
      if (modifiers) {
        view += `\n${indent}${modifiers}`;
      }
      
      return view;
    } else {
      // Leaf view
      if (element.type === 'TEXT') {
        let textView = `Text("${element.characters || 'Text'}")`;
        if (modifiers) {
          textView += `\n${indent}${modifiers}`;
        }
        return textView;
      }
      
      if (element.type === 'IMAGE') {
        let imageView = `Image(systemName: "photo")`;
        if (modifiers) {
          imageView += `\n${indent}${modifiers}`;
        }
        return imageView;
      }
      
      let view = viewType;
      if (modifiers) {
        view += `\n${indent}${modifiers}`;
      }
      
      return view;
    }
  }

  mapToSwiftUIView(figmaType) {
    const viewMap = {
      'FRAME': 'VStack',
      'GROUP': 'VStack',
      'RECTANGLE': 'Rectangle',
      'TEXT': 'Text',
      'IMAGE': 'Image',
      'COMPONENT': 'VStack',
      'INSTANCE': 'VStack'
    };

    return viewMap[figmaType] || 'VStack';
  }

  generateElementModifiers(element) {
    const modifiers = [];

    // Layout modifiers
    if (element.layout) {
      if (element.layout.width) {
        modifiers.push(`.frame(width: ${element.layout.width})`);
      }
      if (element.layout.height) {
        modifiers.push(`.frame(height: ${element.layout.height})`);
      }
      if (element.layout.padding) {
        const padding = this.generatePadding(element.layout.padding);
        modifiers.push(`.padding(${padding})`);
      }
    }

    // Style modifiers
    if (element.styles) {
      if (element.styles.backgroundColor) {
        const color = this.convertColorToSwiftUI(element.styles.backgroundColor);
        modifiers.push(`.background(${color})`);
      }
      
      if (element.styles.borderRadius) {
        modifiers.push(`.cornerRadius(${element.styles.borderRadius})`);
      }
      
      if (element.styles.borderColor && element.styles.borderWidth) {
        const color = this.convertColorToSwiftUI(element.styles.borderColor);
        modifiers.push(`.overlay(RoundedRectangle(cornerRadius: ${element.styles.borderRadius || 0}).stroke(${color}, lineWidth: ${element.styles.borderWidth}))`);
      }
    }

    return modifiers.join('\n    ');
  }

  generatePadding(padding) {
    if (typeof padding === 'number') {
      return padding.toString();
    }

    if (padding.left === padding.right && padding.top === padding.bottom) {
      return `EdgeInsets(top: ${padding.top}, leading: ${padding.left}, bottom: ${padding.bottom}, trailing: ${padding.right})`;
    }

    return `EdgeInsets(top: ${padding.top}, leading: ${padding.left}, bottom: ${padding.bottom}, trailing: ${padding.right})`;
  }

  convertColorToSwiftUI(colorValue) {
    if (colorValue.startsWith('{colors.')) {
      // Design token reference
      const tokenName = colorValue.replace('{colors.', '').replace('}', '');
      return `AppColors.${this.toCamelCase(tokenName)}`;
    }

    if (colorValue.startsWith('#')) {
      const hex = colorValue.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;
      return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
    }

    return 'Color.clear';
  }

  async generateStyles(designTokens, options) {
    const styleFiles = [];

    // Generate theme file
    const themeFile = await this.generateThemeFile(designTokens);
    styleFiles.push(themeFile);

    // Generate colors file
    const colorsFile = await this.generateColorsFile(designTokens);
    styleFiles.push(colorsFile);

    // Generate typography file
    const typographyFile = await this.generateTypographyFile(designTokens);
    styleFiles.push(typographyFile);

    return styleFiles;
  }

  async generateThemeFile(designTokens) {
    const template = await this.loadTemplate('theme');
    
    const content = template({
      colors: designTokens.colors || {},
      typography: designTokens.typography || {},
      spacing: designTokens.spacing || {}
    });

    return {
      path: 'Sources/Theme/AppTheme.swift',
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
      path: 'Sources/Theme/AppColors.swift',
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
      path: 'Sources/Theme/AppTypography.swift',
      content,
      type: 'style'
    };
  }

  async generateConfiguration(processedData, designTokens, options) {
    const configFiles = [];

    // Generate Package.swift
    const packageFile = await this.generatePackageFile(options);
    configFiles.push(packageFile);

    // Generate App.swift
    const appFile = await this.generateAppFile(options);
    configFiles.push(appFile);

    // Generate ContentView.swift
    const contentViewFile = await this.generateContentViewFile(options);
    configFiles.push(contentViewFile);

    return configFiles;
  }

  async generatePackageFile(options) {
    const template = await this.loadTemplate('package');
    
    const content = template({
      projectName: options.projectName || 'GeneratedApp',
      swiftVersion: process.env.SWIFT_VERSION || '5.9'
    });

    return {
      path: 'Package.swift',
      content,
      type: 'config'
    };
  }

  async generateAppFile(options) {
    const template = await this.loadTemplate('app');
    
    const content = template({
      appName: options.projectName || 'GeneratedApp'
    });

    return {
      path: `Sources/${options.projectName || 'GeneratedApp'}App.swift`,
      content,
      type: 'config'
    };
  }

  async generateContentViewFile(options) {
    const template = await this.loadTemplate('content_view');
    
    const content = template({
      appName: options.projectName || 'GeneratedApp'
    });

    return {
      path: 'Sources/Views/ContentView.swift',
      content,
      type: 'config'
    };
  }

  // Utility methods
  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  generateImports(component) {
    const imports = ['SwiftUI'];
    
    // Add custom view imports if needed
    return imports;
  }

  generateScreenImports(screen) {
    const imports = ['SwiftUI'];
    
    // Add custom view imports if needed
    return imports;
  }

  generateProperties(properties) {
    if (!properties || Object.keys(properties).length === 0) {
      return [];
    }

    return Object.entries(properties).map(([key, prop]) => ({
      name: key,
      type: this.mapPropType(prop.type),
      required: prop.required || false,
      defaultValue: prop.defaultValue
    }));
  }

  mapPropType(figmaType) {
    const typeMap = {
      'BOOLEAN': 'Bool',
      'TEXT': 'String',
      'INSTANCE_SWAP': 'AnyView',
      'VARIANT': 'String'
    };
    
    return typeMap[figmaType] || 'Any';
  }

  generateViewModifiers(component, designSystem) {
    return this.generateElementModifiers(component);
  }

  generateScreenModifiers(screen, designSystem) {
    return this.generateElementModifiers(screen);
  }
}
