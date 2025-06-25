# Examples and Use Cases

This document provides practical examples of using the Figma Mobile Design Workflow for different scenarios.

## 🎯 Basic Examples

### 1. Simple Component Generation

**Scenario:** Convert a Figma button component to React Native

```bash
# Generate React Native code for a specific component
npx figma-mobile-generator generate \
  -p react-native \
  -u "https://www.figma.com/file/abc123?node-id=1%3A2" \
  -n "ButtonComponent"
```

**Expected Output:**
```typescript
// components/ButtonComponent.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export const ButtonComponent = ({ title, onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 2. Design Token Extraction

**Scenario:** Extract design tokens from a design system file

```bash
# Extract all design tokens as JSON
npx figma-mobile-generator tokens \
  -u "https://www.figma.com/file/design-system-123" \
  -f json \
  -o design-system-tokens.json
```

**Expected Output:**
```json
{
  "colors": {
    "primary-blue": "#007AFF",
    "secondary-gray": "#8E8E93",
    "background-light": "#F2F2F7",
    "text-primary": "#000000"
  },
  "typography": {
    "heading-large": {
      "fontFamily": "SF Pro Display",
      "fontSize": "32px",
      "fontWeight": "700",
      "lineHeight": "38px"
    },
    "body-regular": {
      "fontFamily": "SF Pro Text",
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "22px"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  }
}
```

## 🏗️ Real-World Use Cases

### 1. E-commerce App Screen

**Scenario:** Generate a product listing screen for an e-commerce app

```bash
# Generate Flutter code for product listing
npx figma-mobile-generator generate \
  -p flutter \
  -u "https://www.figma.com/file/ecommerce-app/product-listing" \
  -n "EcommerceApp" \
  --format-code \
  --docs
```

**Figma Structure:**
```
Product Listing Screen
├── Header
│   ├── Search Bar
│   └── Filter Button
├── Product Grid
│   ├── Product Card (Component)
│   │   ├── Product Image
│   │   ├── Product Title
│   │   ├── Price
│   │   └── Add to Cart Button
│   └── [Repeated Product Cards]
└── Bottom Navigation
```

**Generated Flutter Code:**
```dart
// lib/screens/product_listing_screen.dart
import 'package:flutter/material.dart';
import '../widgets/product_card.dart';
import '../widgets/search_bar.dart';

class ProductListingScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: SearchBar(),
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list),
            onPressed: () {},
          ),
        ],
      ),
      body: GridView.builder(
        padding: EdgeInsets.all(16),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemBuilder: (context, index) => ProductCard(),
      ),
    );
  }
}
```

### 2. Design System Migration

**Scenario:** Migrate from an old design system to a new one

```bash
# Extract tokens from old design system
npx figma-mobile-generator tokens \
  -u "https://www.figma.com/file/old-design-system" \
  -f scss \
  -o old-tokens.scss

# Extract tokens from new design system
npx figma-mobile-generator tokens \
  -u "https://www.figma.com/file/new-design-system" \
  -f scss \
  -o new-tokens.scss

# Generate components with new design system
npx figma-mobile-generator generate \
  -p react-native \
  -u "https://www.figma.com/file/new-design-system" \
  -n "UpdatedComponents"
```

### 3. Multi-Platform App Development

**Scenario:** Create the same app for iOS, Android, and Web

```bash
# Generate iOS SwiftUI version
npx figma-mobile-generator generate \
  -p swiftui \
  -u "https://www.figma.com/file/multi-platform-app" \
  -n "MyApp" \
  -o ./ios-app

# Generate Android Compose version
npx figma-mobile-generator generate \
  -p compose \
  -u "https://www.figma.com/file/multi-platform-app" \
  -n "MyApp" \
  -o ./android-app

# Generate React Native for cross-platform
npx figma-mobile-generator generate \
  -p react-native \
  -u "https://www.figma.com/file/multi-platform-app" \
  -n "MyApp" \
  -o ./react-native-app
```

## 🔄 Workflow Integration Examples

### 1. CI/CD Pipeline Integration

**GitHub Actions Example:**
```yaml
# .github/workflows/figma-sync.yml
name: Sync Figma Designs

on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM
  workflow_dispatch:

jobs:
  sync-figma:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Generate mobile code
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
        run: |
          npx figma-mobile-generator generate \
            -p react-native \
            -u "${{ vars.FIGMA_FILE_URL }}" \
            -n "AutoGeneratedApp"
            
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'Update mobile components from Figma'
          body: 'Automated update from Figma design changes'
          branch: figma-sync
```

### 2. Webhook Integration

**Express.js Webhook Handler:**
```javascript
// webhook-handler.js
import express from 'express';
import { FigmaMobileWorkflow } from './src/index.js';

const app = express();
const workflow = new FigmaMobileWorkflow();

app.post('/figma-webhook', async (req, res) => {
  const { file_key, event_type } = req.body;
  
  if (event_type === 'FILE_UPDATE') {
    try {
      await workflow.generateMobileCode({
        platform: 'react-native',
        figmaUrl: `https://www.figma.com/file/${file_key}`,
        projectName: 'AutoUpdated'
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.listen(3001);
```

### 3. Laravel Integration

**Laravel Controller:**
```php
<?php
// app/Http/Controllers/FigmaController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;

class FigmaController extends Controller
{
    public function generateCode(Request $request)
    {
        $request->validate([
            'platform' => 'required|in:react-native,flutter,swiftui,compose',
            'figma_url' => 'required|url',
            'project_name' => 'required|string'
        ]);

        $command = sprintf(
            'cd %s && npx figma-mobile-generator generate -p %s -u "%s" -n "%s"',
            base_path('figma-workflow'),
            $request->platform,
            $request->figma_url,
            $request->project_name
        );

        $result = Process::run($command);

        if ($result->successful()) {
            return response()->json([
                'success' => true,
                'output' => $result->output()
            ]);
        }

        return response()->json([
            'success' => false,
            'error' => $result->errorOutput()
        ], 500);
    }
}
```

## 🎨 Advanced Customization Examples

### 1. Custom Template Modification

**Scenario:** Customize React Native component template

```handlebars
{{!-- src/templates/react-native/component.hbs --}}
import React from 'react';
import { {{#each imports}}{{this}}{{#unless @last}}, {{/unless}}{{/each}} } from 'react-native';
import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme'; // Custom hook

interface {{componentName}}Props {
{{#each props}}
  {{name}}{{#if optional}}?{{/if}}: {{type}};
{{/each}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = (props) => {
  const theme = useTheme(); // Use custom theme hook
  
  return (
{{{jsx}}}
  );
};

const createStyles = (theme: any) => StyleSheet.create({
{{#each styles}}
  {{@key}}: {
{{#each this}}
    {{@key}}: {{#if (eq @key 'color')}}theme.colors.{{this}}{{else}}{{this}}{{/if}},
{{/each}}
  },
{{/each}}
});

export default {{componentName}};
```

### 2. Custom Design Token Processing

**Scenario:** Add custom token transformations

```javascript
// src/services/CustomTokenExtractor.js
import { DesignTokenExtractor } from './DesignTokenExtractor.js';

export class CustomTokenExtractor extends DesignTokenExtractor {
  processTokens(tokens, options) {
    super.processTokens(tokens, options);
    
    // Add custom semantic tokens
    tokens.semantic = this.generateSemanticTokens(tokens);
    
    // Add platform-specific tokens
    tokens.ios = this.generateiOSTokens(tokens);
    tokens.android = this.generateAndroidTokens(tokens);
    
    return tokens;
  }
  
  generateSemanticTokens(tokens) {
    return {
      success: tokens.colors['green-500'],
      warning: tokens.colors['yellow-500'],
      error: tokens.colors['red-500'],
      info: tokens.colors['blue-500']
    };
  }
}
```

## 📊 Performance Optimization Examples

### 1. Batch Processing Large Projects

```bash
# Process multiple files efficiently
for file_id in file1 file2 file3; do
  npx figma-mobile-generator generate \
    -p react-native \
    -u "https://www.figma.com/file/$file_id" \
    -n "Project_$file_id" \
    --no-assets & # Run in background
done

wait # Wait for all processes to complete
```

### 2. Incremental Updates

```bash
# Only update changed components
npx figma-mobile-generator sync \
  -p PROJECT_ID \
  --platforms react-native \
  --incremental \
  --since "2024-01-01"
```

## 🧪 Testing Examples

### 1. Component Testing

```javascript
// tests/components/Button.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../generated/components/Button';

describe('Generated Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });
  
  it('handles press events', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Test Button" onPress={onPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### 2. Design Token Validation

```javascript
// tests/design-tokens.test.js
import designTokens from '../generated/design-tokens.json';

describe('Design Tokens', () => {
  it('has required color tokens', () => {
    expect(designTokens.colors).toHaveProperty('primary');
    expect(designTokens.colors).toHaveProperty('secondary');
    expect(designTokens.colors).toHaveProperty('background');
  });
  
  it('has valid color values', () => {
    Object.values(designTokens.colors).forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
```

These examples should give you a comprehensive understanding of how to use the Figma Mobile Design Workflow in various scenarios. Start with the basic examples and gradually move to more advanced use cases as you become comfortable with the tool.
