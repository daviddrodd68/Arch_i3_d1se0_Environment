import { BaseCodeGenerator } from './BaseCodeGenerator.js';
import Handlebars from 'handlebars';

export class FlutterGenerator extends BaseCodeGenerator {
  constructor(options = {}) {
    super({ ...options, platform: 'flutter' });
  }

  registerPlatformHelpers() {
    // Flutter specific Handlebars helpers
    Handlebars.registerHelper('dartType', (figmaType) => {
      const typeMap = {
        'BOOLEAN': 'bool',
        'TEXT': 'String',
        'INSTANCE_SWAP': 'Widget',
        'VARIANT': 'String'
      };
      return typeMap[figmaType] || 'dynamic';
    });

    Handlebars.registerHelper('flutterWidget', (figmaType) => {
      const widgetMap = {
        'FRAME': 'Container',
        'GROUP': 'Container',
        'RECTANGLE': 'Container',
        'TEXT': 'Text',
        'IMAGE': 'Image',
        'COMPONENT': 'Container',
        'INSTANCE': 'Container'
      };
      return widgetMap[figmaType] || 'Container';
    });

    Handlebars.registerHelper('flutterColor', (colorHex) => {
      if (!colorHex || !colorHex.startsWith('#')) return 'Colors.transparent';
      const hex = colorHex.replace('#', '');
      return `Color(0xFF${hex})`;
    });
  }

  async generateComponents(processedData, options) {
    const componentFiles = [];

    // Generate individual widgets
    for (const component of processedData.components) {
      const widgetFile = await this.generateWidget(component, processedData.designSystem);
      componentFiles.push(widgetFile);
    }

    // Generate screens
    for (const screen of processedData.screens) {
      const screenFile = await this.generateScreen(screen, processedData.designSystem);
      componentFiles.push(screenFile);
    }

    // Generate barrel file
    const barrelFile = await this.generateBarrelFile(processedData.components);
    componentFiles.push(barrelFile);

    return componentFiles;
  }

  async generateWidget(component, designSystem) {
    const template = await this.loadTemplate('widget');
    
    const templateData = {
      widgetName: component.name,
      imports: this.generateImports(component),
      properties: this.generateProperties(component.properties),
      buildMethod: this.generateBuildMethod(component),
      styles: this.generateWidgetStyles(component, designSystem)
    };

    const content = template(templateData);

    return {
      path: `lib/widgets/${this.toSnakeCase(component.name)}.dart`,
      content,
      type: 'component'
    };
  }

  async generateScreen(screen, designSystem) {
    const template = await this.loadTemplate('screen');
    
    const templateData = {
      screenName: this.formatComponentName(screen.name),
      imports: this.generateScreenImports(screen),
      buildMethod: this.generateScreenBuildMethod(screen),
      styles: this.generateScreenStyles(screen, designSystem)
    };

    const content = template(templateData);

    return {
      path: `lib/screens/${this.toSnakeCase(screen.name)}_screen.dart`,
      content,
      type: 'component'
    };
  }

  generateBuildMethod(component) {
    return this.generateWidgetTree(component, 0);
  }

  generateScreenBuildMethod(screen) {
    const children = screen.children || [];
    let buildMethod = `
    return Scaffold(
      appBar: AppBar(
        title: Text('${this.formatComponentName(screen.name)}'),
      ),
      body: SafeArea(
        child: `;

    if (children.length === 1) {
      buildMethod += this.generateWidgetTree(children[0], 3);
    } else {
      buildMethod += `Column(
          children: [`;
      children.forEach(child => {
        buildMethod += `\n${this.generateWidgetTree(child, 4)},`;
      });
      buildMethod += `
          ],
        )`;
    }

    buildMethod += `
      ),
    );`;

    return buildMethod;
  }

  generateWidgetTree(element, depth = 0) {
    const indent = '  '.repeat(depth);
    const widgetType = this.mapToFlutterWidget(element.type);
    const props = this.generateWidgetProps(element);

    if (element.children && element.children.length > 0) {
      let widget = `${indent}${widgetType}(`;
      
      if (props) {
        widget += `\n${indent}  ${props},`;
      }

      if (element.children.length === 1) {
        widget += `\n${indent}  child: `;
        widget += this.generateWidgetTree(element.children[0], depth + 1);
      } else {
        widget += `\n${indent}  children: [`;
        element.children.forEach(child => {
          widget += `\n${this.generateWidgetTree(child, depth + 2)},`;
        });
        widget += `\n${indent}  ]`;
      }

      widget += `\n${indent})`;
      return widget;
    } else {
      // Leaf widget
      if (element.type === 'TEXT') {
        return `${indent}Text('${element.characters || 'Text'}')`;
      }
      
      return `${indent}${widgetType}(${props || ''})`;
    }
  }

  mapToFlutterWidget(figmaType) {
    const widgetMap = {
      'FRAME': 'Container',
      'GROUP': 'Container',
      'RECTANGLE': 'Container',
      'TEXT': 'Text',
      'IMAGE': 'Image',
      'COMPONENT': 'Container',
      'INSTANCE': 'Container'
    };

    return widgetMap[figmaType] || 'Container';
  }

  generateWidgetProps(element) {
    const props = [];

    // Add styling props
    if (element.styles && Object.keys(element.styles).length > 0) {
      const decoration = this.generateBoxDecoration(element.styles);
      if (decoration) {
        props.push(`decoration: ${decoration}`);
      }
    }

    // Add layout props
    if (element.layout) {
      if (element.layout.width) {
        props.push(`width: ${element.layout.width}`);
      }
      if (element.layout.height) {
        props.push(`height: ${element.layout.height}`);
      }
      if (element.layout.padding) {
        const padding = this.generatePadding(element.layout.padding);
        props.push(`padding: ${padding}`);
      }
    }

    return props.join(', ');
  }

  generateBoxDecoration(styles) {
    const decorationProps = [];

    if (styles.backgroundColor) {
      decorationProps.push(`color: ${this.convertColorToFlutter(styles.backgroundColor)}`);
    }

    if (styles.borderRadius) {
      decorationProps.push(`borderRadius: BorderRadius.circular(${styles.borderRadius})`);
    }

    if (styles.borderColor && styles.borderWidth) {
      decorationProps.push(`border: Border.all(color: ${this.convertColorToFlutter(styles.borderColor)}, width: ${styles.borderWidth})`);
    }

    if (decorationProps.length === 0) return null;

    return `BoxDecoration(${decorationProps.join(', ')})`;
  }

  generatePadding(padding) {
    if (typeof padding === 'number') {
      return `EdgeInsets.all(${padding})`;
    }

    if (padding.left === padding.right && padding.top === padding.bottom) {
      return `EdgeInsets.symmetric(horizontal: ${padding.left}, vertical: ${padding.top})`;
    }

    return `EdgeInsets.only(left: ${padding.left}, right: ${padding.right}, top: ${padding.top}, bottom: ${padding.bottom})`;
  }

  convertColorToFlutter(colorValue) {
    if (colorValue.startsWith('{colors.')) {
      // Design token reference
      const tokenName = colorValue.replace('{colors.', '').replace('}', '');
      return `AppColors.${this.toCamelCase(tokenName)}`;
    }

    if (colorValue.startsWith('#')) {
      const hex = colorValue.replace('#', '');
      return `Color(0xFF${hex})`;
    }

    return 'Colors.transparent';
  }

  async generateStyles(designTokens, options) {
    const styleFiles = [];

    // Generate theme file
    const themeFile = await this.generateThemeFile(designTokens);
    styleFiles.push(themeFile);

    // Generate colors file
    const colorsFile = await this.generateColorsFile(designTokens);
    styleFiles.push(colorsFile);

    // Generate text styles file
    const textStylesFile = await this.generateTextStylesFile(designTokens);
    styleFiles.push(textStylesFile);

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
      path: 'lib/theme/app_theme.dart',
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
      path: 'lib/theme/app_colors.dart',
      content,
      type: 'style'
    };
  }

  async generateTextStylesFile(designTokens) {
    const template = await this.loadTemplate('text_styles');
    
    const content = template({
      typography: designTokens.typography || {}
    });

    return {
      path: 'lib/theme/app_text_styles.dart',
      content,
      type: 'style'
    };
  }

  async generateConfiguration(processedData, designTokens, options) {
    const configFiles = [];

    // Generate pubspec.yaml
    const pubspecFile = await this.generatePubspecFile(options);
    configFiles.push(pubspecFile);

    // Generate main.dart
    const mainFile = await this.generateMainFile(options);
    configFiles.push(mainFile);

    return configFiles;
  }

  async generatePubspecFile(options) {
    const template = await this.loadTemplate('pubspec');
    
    const content = template({
      projectName: this.toSnakeCase(options.projectName || 'generated_app'),
      flutterVersion: process.env.FLUTTER_VERSION || '3.16.0'
    });

    return {
      path: 'pubspec.yaml',
      content,
      type: 'config'
    };
  }

  async generateMainFile(options) {
    const template = await this.loadTemplate('main');
    
    const content = template({
      appName: options.projectName || 'Generated App'
    });

    return {
      path: 'lib/main.dart',
      content,
      type: 'config'
    };
  }

  async generateBarrelFile(components) {
    const template = await this.loadTemplate('barrel');
    
    const content = template({
      components: components.map(comp => ({
        name: comp.name,
        fileName: this.toSnakeCase(comp.name)
      }))
    });

    return {
      path: 'lib/widgets/widgets.dart',
      content,
      type: 'config'
    };
  }

  // Utility methods
  toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  generateImports(component) {
    const imports = ['package:flutter/material.dart'];
    
    // Add custom widget imports
    const customWidgets = this.extractCustomWidgets(component);
    customWidgets.forEach(widget => {
      imports.push(`'../widgets/${this.toSnakeCase(widget)}.dart'`);
    });

    return imports;
  }

  generateScreenImports(screen) {
    const imports = ['package:flutter/material.dart'];
    
    // Add widget imports
    const customWidgets = this.extractCustomWidgets(screen);
    customWidgets.forEach(widget => {
      imports.push(`'../widgets/${this.toSnakeCase(widget)}.dart'`);
    });

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
      'BOOLEAN': 'bool',
      'TEXT': 'String',
      'INSTANCE_SWAP': 'Widget',
      'VARIANT': 'String'
    };
    
    return typeMap[figmaType] || 'dynamic';
  }

  extractCustomWidgets(component) {
    const customWidgets = [];
    
    if (component.children) {
      component.children.forEach(child => {
        if (child.type === 'COMPONENT' || child.type === 'INSTANCE') {
          customWidgets.push(this.formatComponentName(child.name));
        }
        customWidgets.push(...this.extractCustomWidgets(child));
      });
    }

    return [...new Set(customWidgets)];
  }

  generateWidgetStyles(component, designSystem) {
    // Flutter doesn't use separate style objects like React Native
    // Styles are applied directly to widgets
    return {};
  }

  generateScreenStyles(screen, designSystem) {
    // Flutter doesn't use separate style objects like React Native
    // Styles are applied directly to widgets
    return {};
  }
}
