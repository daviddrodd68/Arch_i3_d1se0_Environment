import { BaseCodeGenerator } from './BaseCodeGenerator.js';
import Handlebars from 'handlebars';

export class JetpackComposeGenerator extends BaseCodeGenerator {
  constructor(options = {}) {
    super({ ...options, platform: 'compose' });
  }

  registerPlatformHelpers() {
    // Jetpack Compose specific Handlebars helpers
    Handlebars.registerHelper('kotlinType', (figmaType) => {
      const typeMap = {
        'BOOLEAN': 'Boolean',
        'TEXT': 'String',
        'INSTANCE_SWAP': '@Composable () -> Unit',
        'VARIANT': 'String'
      };
      return typeMap[figmaType] || 'Any';
    });

    Handlebars.registerHelper('composeComponent', (figmaType) => {
      const componentMap = {
        'FRAME': 'Column',
        'GROUP': 'Column',
        'RECTANGLE': 'Box',
        'TEXT': 'Text',
        'IMAGE': 'Image',
        'COMPONENT': 'Column',
        'INSTANCE': 'Column'
      };
      return componentMap[figmaType] || 'Column';
    });

    Handlebars.registerHelper('composeColor', (colorHex) => {
      if (!colorHex || !colorHex.startsWith('#')) return 'Color.Transparent';
      const hex = colorHex.replace('#', '');
      return `Color(0xFF${hex})`;
    });
  }

  async generateComponents(processedData, options) {
    const componentFiles = [];

    // Generate individual composables
    for (const component of processedData.components) {
      const composableFile = await this.generateComposable(component, processedData.designSystem);
      componentFiles.push(composableFile);
    }

    // Generate screens
    for (const screen of processedData.screens) {
      const screenFile = await this.generateScreen(screen, processedData.designSystem);
      componentFiles.push(screenFile);
    }

    return componentFiles;
  }

  async generateComposable(component, designSystem) {
    const template = await this.loadTemplate('composable');
    
    const templateData = {
      composableName: component.name,
      imports: this.generateImports(component),
      parameters: this.generateParameters(component.properties),
      body: this.generateComposableBody(component),
      modifiers: this.generateComposableModifiers(component, designSystem)
    };

    const content = template(templateData);

    return {
      path: `app/src/main/java/com/generated/components/${component.name}.kt`,
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
      path: `app/src/main/java/com/generated/screens/${this.formatComponentName(screen.name)}Screen.kt`,
      content,
      type: 'component'
    };
  }

  generateComposableBody(component) {
    return this.generateComposeUI(component, 0);
  }

  generateScreenBody(screen) {
    const children = screen.children || [];
    
    if (children.length === 0) {
      return 'Text("Empty Screen")';
    }

    if (children.length === 1) {
      return this.generateComposeUI(children[0], 0);
    }

    let body = 'Column {\n';
    children.forEach(child => {
      body += `    ${this.generateComposeUI(child, 1)}\n`;
    });
    body += '}';

    return body;
  }

  generateComposeUI(element, depth = 0) {
    const indent = '    '.repeat(depth);
    const componentType = this.mapToComposeComponent(element.type);
    const modifiers = this.generateElementModifiers(element);

    if (element.children && element.children.length > 0) {
      let ui = `${componentType}(\n`;
      
      if (modifiers) {
        ui += `${indent}    modifier = ${modifiers}\n`;
        ui += `${indent}) {\n`;
      } else {
        ui += `${indent}) {\n`;
      }
      
      element.children.forEach(child => {
        ui += `${indent}    ${this.generateComposeUI(child, depth + 1)}\n`;
      });
      
      ui += `${indent}}`;
      
      return ui;
    } else {
      // Leaf component
      if (element.type === 'TEXT') {
        let textComponent = `Text(\n${indent}    text = "${element.characters || 'Text'}"`;
        if (modifiers) {
          textComponent += `,\n${indent}    modifier = ${modifiers}`;
        }
        textComponent += `\n${indent})`;
        return textComponent;
      }
      
      if (element.type === 'IMAGE') {
        let imageComponent = `Image(\n${indent}    painter = painterResource(id = R.drawable.placeholder)`;
        if (modifiers) {
          imageComponent += `,\n${indent}    modifier = ${modifiers}`;
        }
        imageComponent += `,\n${indent}    contentDescription = null\n${indent})`;
        return imageComponent;
      }
      
      let component = `${componentType}(`;
      if (modifiers) {
        component += `\n${indent}    modifier = ${modifiers}\n${indent}`;
      }
      component += ')';
      
      return component;
    }
  }

  mapToComposeComponent(figmaType) {
    const componentMap = {
      'FRAME': 'Column',
      'GROUP': 'Column',
      'RECTANGLE': 'Box',
      'TEXT': 'Text',
      'IMAGE': 'Image',
      'COMPONENT': 'Column',
      'INSTANCE': 'Column'
    };

    return componentMap[figmaType] || 'Column';
  }

  generateElementModifiers(element) {
    const modifiers = [];

    // Layout modifiers
    if (element.layout) {
      if (element.layout.width) {
        modifiers.push(`width(${element.layout.width}.dp)`);
      }
      if (element.layout.height) {
        modifiers.push(`height(${element.layout.height}.dp)`);
      }
      if (element.layout.padding) {
        const padding = this.generatePadding(element.layout.padding);
        modifiers.push(`padding(${padding})`);
      }
    }

    // Style modifiers
    if (element.styles) {
      if (element.styles.backgroundColor) {
        const color = this.convertColorToCompose(element.styles.backgroundColor);
        modifiers.push(`background(${color})`);
      }
      
      if (element.styles.borderRadius) {
        modifiers.push(`clip(RoundedCornerShape(${element.styles.borderRadius}.dp))`);
      }
      
      if (element.styles.borderColor && element.styles.borderWidth) {
        const color = this.convertColorToCompose(element.styles.borderColor);
        modifiers.push(`border(${element.styles.borderWidth}.dp, ${color}, RoundedCornerShape(${element.styles.borderRadius || 0}.dp))`);
      }
    }

    if (modifiers.length === 0) return null;

    return `Modifier.${modifiers.join('.')}`;
  }

  generatePadding(padding) {
    if (typeof padding === 'number') {
      return `${padding}.dp`;
    }

    if (padding.left === padding.right && padding.top === padding.bottom) {
      return `horizontal = ${padding.left}.dp, vertical = ${padding.top}.dp`;
    }

    return `start = ${padding.left}.dp, end = ${padding.right}.dp, top = ${padding.top}.dp, bottom = ${padding.bottom}.dp`;
  }

  convertColorToCompose(colorValue) {
    if (colorValue.startsWith('{colors.')) {
      // Design token reference
      const tokenName = colorValue.replace('{colors.', '').replace('}', '');
      return `AppColors.${this.toCamelCase(tokenName)}`;
    }

    if (colorValue.startsWith('#')) {
      const hex = colorValue.replace('#', '');
      return `Color(0xFF${hex})`;
    }

    return 'Color.Transparent';
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
      path: 'app/src/main/java/com/generated/theme/AppTheme.kt',
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
      path: 'app/src/main/java/com/generated/theme/AppColors.kt',
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
      path: 'app/src/main/java/com/generated/theme/AppTypography.kt',
      content,
      type: 'style'
    };
  }

  async generateConfiguration(processedData, designTokens, options) {
    const configFiles = [];

    // Generate build.gradle
    const buildGradleFile = await this.generateBuildGradleFile(options);
    configFiles.push(buildGradleFile);

    // Generate MainActivity.kt
    const mainActivityFile = await this.generateMainActivityFile(options);
    configFiles.push(mainActivityFile);

    // Generate AndroidManifest.xml
    const manifestFile = await this.generateManifestFile(options);
    configFiles.push(manifestFile);

    return configFiles;
  }

  async generateBuildGradleFile(options) {
    const template = await this.loadTemplate('build_gradle');
    
    const content = template({
      projectName: options.projectName || 'GeneratedApp',
      kotlinVersion: process.env.KOTLIN_VERSION || '1.9.0'
    });

    return {
      path: 'app/build.gradle',
      content,
      type: 'config'
    };
  }

  async generateMainActivityFile(options) {
    const template = await this.loadTemplate('main_activity');
    
    const content = template({
      appName: options.projectName || 'GeneratedApp'
    });

    return {
      path: 'app/src/main/java/com/generated/MainActivity.kt',
      content,
      type: 'config'
    };
  }

  async generateManifestFile(options) {
    const template = await this.loadTemplate('manifest');
    
    const content = template({
      appName: options.projectName || 'GeneratedApp'
    });

    return {
      path: 'app/src/main/AndroidManifest.xml',
      content,
      type: 'config'
    };
  }

  // Utility methods
  toCamelCase(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }

  generateImports(component) {
    const imports = [
      'androidx.compose.foundation.layout.*',
      'androidx.compose.material3.*',
      'androidx.compose.runtime.*',
      'androidx.compose.ui.Modifier',
      'androidx.compose.ui.graphics.Color',
      'androidx.compose.ui.unit.dp'
    ];
    
    // Add custom component imports if needed
    return imports;
  }

  generateScreenImports(screen) {
    const imports = [
      'androidx.compose.foundation.layout.*',
      'androidx.compose.material3.*',
      'androidx.compose.runtime.*',
      'androidx.compose.ui.Modifier',
      'androidx.compose.ui.graphics.Color',
      'androidx.compose.ui.unit.dp'
    ];
    
    // Add custom component imports if needed
    return imports;
  }

  generateParameters(properties) {
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
      'BOOLEAN': 'Boolean',
      'TEXT': 'String',
      'INSTANCE_SWAP': '@Composable () -> Unit',
      'VARIANT': 'String'
    };
    
    return typeMap[figmaType] || 'Any';
  }

  generateComposableModifiers(component, designSystem) {
    return this.generateElementModifiers(component);
  }

  generateScreenModifiers(screen, designSystem) {
    return this.generateElementModifiers(screen);
  }
}
