# Getting Started with Figma Mobile Design Workflow

Welcome! This guide will help you set up and use the Figma Mobile Design Workflow to transform your Figma designs into mobile app code.

## 🚀 Quick Setup (5 minutes)

### 1. Prerequisites
- Node.js 18+ installed
- A Figma account with access to design files
- Basic knowledge of mobile development

### 2. Installation
```bash
# The project is already set up in your workspace
cd /mnt/persist/workspace

# Dependencies are already installed
# If you need to reinstall: npm install
```

### 3. Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your Figma token
nano .env
```

Add your Figma access token:
```env
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token_here
```

**Get your Figma token:** https://www.figma.com/developers/api#access-tokens

### 4. Test Your Setup
```bash
node test-setup.js
```

You should see: ✨ Setup test completed successfully!

## 🎯 Your First Code Generation

### Option 1: Use a Public Figma File
Try with Figma's own design system (public file):
```bash
# Generate React Native code
npm run generate:react-native -- --url "https://www.figma.com/file/hch8YlkgaUIZ0Vyeaohj2b" --name "MyFirstApp"

# Or use the CLI directly
npx figma-mobile-generator generate -p react-native -u "https://www.figma.com/file/hch8YlkgaUIZ0Vyeaohj2b" -n "MyFirstApp"
```

### Option 2: Use Your Own Figma File
```bash
# Replace with your Figma file URL
npx figma-mobile-generator generate -p react-native -u "https://www.figma.com/file/YOUR_FILE_ID" -n "MyApp"
```

### Option 3: Extract Design Tokens Only
```bash
# Extract design tokens as JSON
npx figma-mobile-generator tokens -u "https://www.figma.com/file/YOUR_FILE_ID" -f json -o design-tokens.json
```

## 📱 Supported Platforms

### React Native
```bash
npx figma-mobile-generator generate -p react-native -u "FIGMA_URL" -n "MyReactNativeApp"
```
**Output:** TypeScript components with StyleSheet, theme files, navigation setup

### Flutter
```bash
npx figma-mobile-generator generate -p flutter -u "FIGMA_URL" -n "MyFlutterApp"
```
**Output:** Dart widgets, Material/Cupertino design, pubspec.yaml

### iOS SwiftUI
```bash
npx figma-mobile-generator generate -p swiftui -u "FIGMA_URL" -n "MyiOSApp"
```
**Output:** SwiftUI views, native iOS components, Package.swift

### Android Jetpack Compose
```bash
npx figma-mobile-generator generate -p compose -u "FIGMA_URL" -n "MyAndroidApp"
```
**Output:** Kotlin composables, Material Design 3, build.gradle

## 🎨 Design Token Formats

Extract design tokens in multiple formats:

```bash
# JSON (default)
npx figma-mobile-generator tokens -u "FIGMA_URL" -f json -o tokens.json

# CSS Variables
npx figma-mobile-generator tokens -u "FIGMA_URL" -f css -o tokens.css

# SCSS Variables
npx figma-mobile-generator tokens -u "FIGMA_URL" -f scss -o tokens.scss

# TypeScript
npx figma-mobile-generator tokens -u "FIGMA_URL" -f ts -o tokens.ts

# YAML
npx figma-mobile-generator tokens -u "FIGMA_URL" -f yaml -o tokens.yaml
```

## 🔧 Advanced Usage

### Batch Processing
Process entire Figma projects:
```bash
npx figma-mobile-generator sync -p PROJECT_ID --platforms react-native,flutter
```

### Custom Output Directory
```bash
npx figma-mobile-generator generate -p react-native -u "FIGMA_URL" -n "MyApp" -o ./my-custom-output
```

### Skip Assets or Tokens
```bash
# Skip asset download
npx figma-mobile-generator generate -p react-native -u "FIGMA_URL" --no-assets

# Skip design token extraction
npx figma-mobile-generator generate -p react-native -u "FIGMA_URL" --no-tokens
```

## 📁 Understanding the Output

After generation, you'll find:

```
generated/
├── react-native/
│   ├── MyApp/
│   │   ├── components/          # Generated components
│   │   ├── screens/             # Generated screens
│   │   ├── theme/               # Design system files
│   │   ├── assets/              # Downloaded images
│   │   └── package.json         # Dependencies
├── flutter/
│   └── MyApp/
│       ├── lib/
│       │   ├── widgets/         # Flutter widgets
│       │   ├── screens/         # Screen widgets
│       │   └── theme/           # Theme files
│       └── pubspec.yaml         # Flutter dependencies
└── design-tokens/
    ├── tokens.json              # Extracted design tokens
    └── asset-manifest.json      # Asset information
```

## 🎯 Best Practices

### 1. Figma File Organization
- **Use Components:** Create reusable components in Figma
- **Consistent Naming:** Use clear, descriptive names
- **Auto Layout:** Use Figma's auto layout for better code generation
- **Design Tokens:** Use Figma variables for colors, spacing, typography

### 2. Generated Code
- **Review Output:** Always review generated code before using
- **Customize Templates:** Modify templates in `src/templates/` for your needs
- **Version Control:** Commit generated code to track changes
- **Testing:** Test generated components thoroughly

### 3. Workflow Integration
- **CI/CD:** Integrate generation into your build pipeline
- **Webhooks:** Set up Figma webhooks for automatic updates
- **Team Collaboration:** Share design tokens across teams

## 🔍 Troubleshooting

### Common Issues

**"Invalid Figma URL"**
- Ensure URL includes `/file/` and the file ID
- Check that the file is accessible with your token

**"No components found"**
- Make sure your Figma file has components or frames
- Check that components are properly named

**"Permission denied"**
- Verify your Figma access token has the right permissions
- Ensure you have access to the Figma file/project

**"Template not found"**
- Check that template files exist in `src/templates/`
- Verify the platform name is correct

### Getting Help

1. **Check Status:** `npx figma-mobile-generator status`
2. **Enable Debug:** Set `DEBUG=figma-workflow:*` in .env
3. **View Logs:** Check `./logs/workflow.log` if configured
4. **Test Setup:** Run `node test-setup.js` again

## 🚀 Next Steps

1. **Generate Your First App:** Try with a simple Figma file
2. **Customize Templates:** Modify templates to match your coding style
3. **Set Up Webhooks:** Enable real-time sync with Figma
4. **Integrate with CI/CD:** Automate code generation in your pipeline
5. **Share Design Tokens:** Use extracted tokens across projects

## 📚 Learn More

- **Full Documentation:** See README.md
- **API Reference:** Check the source code in `src/`
- **Templates:** Explore `src/templates/` for customization
- **Examples:** Look at generated output for patterns

Happy coding! 🎉
