# Figma Mobile Design Workflow

🎨 **Transform your Figma designs into mobile app code automatically!**

A comprehensive workflow tool that integrates with Figma's API through Model Context Protocol (MCP) to generate mobile app code for React Native, Flutter, SwiftUI, and Jetpack Compose.

## ✨ Features

### 🔗 **MCP Integration**
- **Framelink Figma MCP Server** - Primary integration for design data access
- **Tim Holden's MCP Server** - Backup integration option
- Real-time design data synchronization
- Automated design token extraction

### 📱 **Multi-Platform Code Generation**
- **React Native** - TypeScript components with StyleSheet
- **Flutter** - Dart widgets with Material/Cupertino design
- **SwiftUI** - Native iOS components
- **Jetpack Compose** - Native Android components

### 🎨 **Design System Support**
- **Design Token Extraction** - Colors, typography, spacing, shadows
- **Component Mapping** - Figma components to mobile components
- **Theme Generation** - Platform-specific theme files
- **Asset Management** - Automatic asset download and optimization

### 🔄 **Automated Workflows**
- **Real-time Sync** - Webhook integration for live updates
- **Batch Processing** - Process entire Figma projects
- **Version Control** - Git integration for change tracking
- **CI/CD Ready** - Automated deployment pipelines

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/figma-mobile-design-workflow.git
cd figma-mobile-design-workflow

# Install dependencies
npm install

# Setup environment
npm run setup
```

### 2. Configuration

Create a `.env` file with your Figma access token:

```env
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token_here
OUTPUT_DIRECTORY=./generated
TEMPLATE_DIRECTORY=./src/templates
```

Get your Figma access token from: https://www.figma.com/developers/api#access-tokens

### 3. Generate Your First App

```bash
# Generate React Native app from Figma design
npm run generate:react-native -- --url "https://figma.com/file/YOUR_FILE_ID" --name "MyApp"

# Or use the CLI directly
npx figma-mobile-generator generate -p react-native -u "https://figma.com/file/YOUR_FILE_ID" -n "MyApp"
```

## 📖 Usage Examples

### Generate Mobile Apps

```bash
# React Native with TypeScript
figma-mobile-generator generate -p react-native -u "https://figma.com/file/abc123" -n MyReactNativeApp

# Flutter with Dart
figma-mobile-generator generate -p flutter -u "https://figma.com/file/abc123" -n MyFlutterApp

# iOS SwiftUI
figma-mobile-generator generate -p swiftui -u "https://figma.com/file/abc123" -n MyiOSApp

# Android Jetpack Compose
figma-mobile-generator generate -p compose -u "https://figma.com/file/abc123" -n MyAndroidApp
```

### Extract Design Tokens

```bash
# Extract as JSON
figma-mobile-generator tokens -u "https://figma.com/file/abc123" -f json -o design-tokens.json

# Extract as CSS variables
figma-mobile-generator tokens -u "https://figma.com/file/abc123" -f css -o design-tokens.css

# Extract as SCSS variables
figma-mobile-generator tokens -u "https://figma.com/file/abc123" -f scss -o design-tokens.scss

# Extract as TypeScript
figma-mobile-generator tokens -u "https://figma.com/file/abc123" -f ts -o design-tokens.ts
```

### Sync Entire Projects

```bash
# Sync all files in a Figma project
figma-mobile-generator sync -p PROJECT_ID --platforms react-native,flutter

# Auto-commit changes to git
figma-mobile-generator sync -p PROJECT_ID --platforms react-native --auto-commit
```

## 🏗️ Architecture

```
src/
├── index.js                    # Main entry point
├── cli/                        # Command line interface
│   └── generate.js            # CLI commands
├── services/                   # Core services
│   ├── FigmaService.js        # Figma API integration
│   ├── DesignTokenExtractor.js # Token extraction logic
│   ├── DesignWorkflowOrchestrator.js # Main orchestrator
│   └── WebhookServer.js       # Real-time sync server
├── generators/                 # Code generators
│   ├── BaseCodeGenerator.js   # Base generator class
│   ├── ReactNativeGenerator.js # React Native generator
│   ├── FlutterGenerator.js    # Flutter generator
│   ├── SwiftUIGenerator.js    # SwiftUI generator
│   └── JetpackComposeGenerator.js # Compose generator
├── templates/                  # Code templates
│   ├── react-native/          # React Native templates
│   ├── flutter/               # Flutter templates
│   ├── swiftui/               # SwiftUI templates
│   └── compose/               # Compose templates
└── utils/                      # Utility classes
    ├── Logger.js              # Logging utility
    ├── Cache.js               # Caching system
    ├── RateLimiter.js         # API rate limiting
    ├── ColorUtils.js          # Color manipulation
    ├── FileUtils.js           # File operations
    └── AssetDownloader.js     # Asset management
```

## 🎯 Supported Figma Features

### ✅ Currently Supported
- **Components & Component Sets** - Converted to platform components
- **Frames & Groups** - Mapped to container components
- **Text Layers** - Typography and text content
- **Shapes & Vectors** - Basic shape components
- **Images** - Asset download and integration
- **Colors** - Fill and stroke colors
- **Typography** - Font families, sizes, weights
- **Spacing** - Padding, margins, gaps
- **Shadows & Effects** - Drop shadows and inner shadows
- **Border Radius** - Corner radius values
- **Layout Properties** - Auto layout, constraints

### 🔄 In Development
- **Variants** - Component variant mapping
- **Interactions** - Button actions and navigation
- **Animations** - Transition animations
- **Prototyping** - Flow and navigation logic
- **Advanced Effects** - Blurs, gradients, masks

## 🔧 Configuration

### Environment Variables

```env
# Required
FIGMA_ACCESS_TOKEN=your_token_here

# Optional
FIGMA_TEAM_ID=your_team_id
OUTPUT_DIRECTORY=./generated
TEMPLATE_DIRECTORY=./src/templates
ASSETS_DIRECTORY=./assets

# MCP Configuration
MCP_SERVER_PORT=3000
MCP_SERVER_HOST=localhost

# Platform Versions
REACT_NATIVE_VERSION=0.72.0
FLUTTER_VERSION=3.16.0
SWIFT_VERSION=5.9
KOTLIN_VERSION=1.9.0

# Webhook (for real-time sync)
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_PORT=3001

# Logging
DEBUG=figma-workflow:*
LOG_LEVEL=info
LOG_FILE=./logs/workflow.log
```

### MCP Server Configuration

The tool uses Model Context Protocol servers for Figma integration. Configuration is in `config/figma-mcp.json`:

```json
{
  "mcpServers": {
    "framelink-figma": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--figma-api-key=${FIGMA_ACCESS_TOKEN}", "--stdio"],
      "priority": 1,
      "enabled": true
    }
  }
}
```

## 🚀 Advanced Usage

### Custom Templates

Create custom templates in `src/templates/{platform}/`:

```handlebars
{{!-- src/templates/react-native/component.hbs --}}
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const {{componentName}} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{{componentName}}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    {{#each styles}}
    {{@key}}: {{this}},
    {{/each}}
  },
});
```

### Webhook Integration

Set up real-time sync with Figma webhooks:

```javascript
import { WebhookServer } from './src/services/WebhookServer.js';

const webhookServer = new WebhookServer({
  port: 3001,
  secret: process.env.WEBHOOK_SECRET,
  onUpdate: async (fileKey) => {
    // Regenerate code when Figma file updates
    await workflow.generateMobileCode({
      platform: 'react-native',
      figmaUrl: `https://figma.com/file/${fileKey}`,
      projectName: 'AutoUpdatedApp'
    });
  }
});
```

### Laravel Integration

Integrate with your Laravel backend:

```php
// app/Http/Controllers/FigmaController.php
class FigmaController extends Controller
{
    public function generateCode(Request $request)
    {
        $result = shell_exec("figma-mobile-generator generate -p {$request->platform} -u {$request->figmaUrl}");
        return response()->json(['result' => $result]);
    }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --testNamePattern="FigmaService"

# Generate coverage report
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/figma-mobile-design-workflow.git

# Install dependencies
npm install

# Set up development environment
cp .env.example .env
# Edit .env with your Figma token

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Framelink** - For the excellent Figma MCP server
- **Tim Holden** - For the alternative MCP server implementation
- **Figma** - For the comprehensive design API
- **Anthropic** - For the Model Context Protocol standard

## 📞 Support

- 📧 Email: support@yourproject.com
- 💬 Discord: [Join our community](https://discord.gg/yourserver)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/figma-mobile-design-workflow/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/figma-mobile-design-workflow/wiki)

---

**Made with ❤️ for the design-to-code community**
