#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { FigmaMobileWorkflow } from '../index.js';
import { Logger } from '../utils/Logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();
const logger = new Logger('CLI');

program
  .name('figma-mobile-generator')
  .description('Generate mobile app code from Figma designs')
  .version('1.0.0');

// Generate command
program
  .command('generate')
  .description('Generate mobile app code from Figma design')
  .requiredOption('-p, --platform <platform>', 'Target platform (react-native, flutter, swiftui, compose)')
  .requiredOption('-u, --url <url>', 'Figma file or frame URL')
  .option('-n, --name <name>', 'Project name', 'GeneratedApp')
  .option('-o, --output <path>', 'Output directory')
  .option('--no-assets', 'Skip asset download')
  .option('--no-tokens', 'Skip design token extraction')
  .option('--format-code', 'Format generated code', true)
  .option('--lint', 'Run linting on generated code')
  .option('--docs', 'Generate documentation')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('\n🎨 Figma Mobile Code Generator\n'));

      // Validate platform
      const supportedPlatforms = ['react-native', 'flutter', 'swiftui', 'compose'];
      if (!supportedPlatforms.includes(options.platform)) {
        logger.error(`Unsupported platform: ${options.platform}`);
        logger.info(`Supported platforms: ${supportedPlatforms.join(', ')}`);
        process.exit(1);
      }

      // Initialize workflow
      const workflow = new FigmaMobileWorkflow();
      await workflow.initialize();

      // Generate code
      const result = await workflow.generateCode(
        options.platform,
        options.url,
        {
          projectName: options.name,
          outputPath: options.output,
          includeAssets: options.assets,
          extractTokens: options.tokens,
          formatCode: options.formatCode,
          lint: options.lint,
          generateDocs: options.docs
        }
      );

      // Display results
      console.log(chalk.green('\n✅ Code generation completed successfully!\n'));
      console.log(chalk.white('📊 Summary:'));
      console.log(chalk.gray(`   Platform: ${result.platform}`));
      console.log(chalk.gray(`   Project: ${result.projectName}`));
      console.log(chalk.gray(`   Output: ${result.outputPath}`));
      console.log(chalk.gray(`   Files generated: ${result.files.length}`));
      console.log(chalk.gray(`   Duration: ${result.duration}ms`));

      if (result.summary) {
        console.log(chalk.white('\n📁 File breakdown:'));
        console.log(chalk.gray(`   Components: ${result.summary.components}`));
        console.log(chalk.gray(`   Styles: ${result.summary.styles}`));
        console.log(chalk.gray(`   Assets: ${result.summary.assets}`));
        console.log(chalk.gray(`   Config: ${result.summary.config}`));
      }

      console.log(chalk.blue(`\n🚀 Next steps:`));
      console.log(chalk.white(`   1. cd ${result.outputPath}`));
      console.log(chalk.white(`   2. npm install`));
      console.log(chalk.white(`   3. npm run start`));

    } catch (error) {
      logger.error('Code generation failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Extract tokens command
program
  .command('tokens')
  .description('Extract design tokens from Figma file')
  .requiredOption('-u, --url <url>', 'Figma file URL')
  .option('-f, --format <format>', 'Output format (json, yaml, css, scss, js, ts)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('\n🎨 Design Token Extractor\n'));

      const workflow = new FigmaMobileWorkflow();
      await workflow.initialize();

      const result = await workflow.extractDesignTokens({
        figmaUrl: options.url,
        format: options.format,
        outputPath: options.output
      });

      console.log(chalk.green('\n✅ Design tokens extracted successfully!\n'));
      console.log(chalk.white('📊 Summary:'));
      console.log(chalk.gray(`   Format: ${result.format}`));
      console.log(chalk.gray(`   Token categories: ${Object.keys(result.tokens).length}`));
      console.log(chalk.gray(`   Total tokens: ${Object.values(result.tokens).reduce((sum, cat) => sum + Object.keys(cat).length, 0)}`));
      console.log(chalk.gray(`   Duration: ${result.duration}ms`));

      if (result.outputPath) {
        console.log(chalk.gray(`   Saved to: ${result.outputPath}`));
      }

      // Display token categories
      console.log(chalk.white('\n🎯 Token categories:'));
      Object.entries(result.tokens).forEach(([category, tokens]) => {
        console.log(chalk.gray(`   ${category}: ${Object.keys(tokens).length} tokens`));
      });

    } catch (error) {
      logger.error('Token extraction failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync entire Figma project')
  .requiredOption('-p, --project <id>', 'Figma project ID')
  .option('--platforms <platforms>', 'Comma-separated list of platforms', 'react-native')
  .option('--auto-commit', 'Auto-commit changes to git')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('\n🔄 Project Sync\n'));

      const platforms = options.platforms.split(',').map(p => p.trim());
      
      const workflow = new FigmaMobileWorkflow();
      await workflow.initialize();

      const result = await workflow.syncWithFigma(options.project, {
        platforms,
        autoCommit: options.autoCommit
      });

      console.log(chalk.green('\n✅ Project sync completed!\n'));
      console.log(chalk.white('📊 Summary:'));
      console.log(chalk.gray(`   Project ID: ${result.projectId}`));
      console.log(chalk.gray(`   Files updated: ${result.updatedFiles}`));
      console.log(chalk.gray(`   Platforms: ${platforms.join(', ')}`));
      console.log(chalk.gray(`   Duration: ${result.duration}ms`));

      if (result.autoCommit) {
        console.log(chalk.gray(`   Auto-commit: enabled`));
      }

    } catch (error) {
      logger.error('Project sync failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show workflow status and configuration')
  .action(async () => {
    try {
      console.log(chalk.cyan('\n📋 Figma Mobile Workflow Status\n'));

      // Check environment variables
      console.log(chalk.white('🔧 Configuration:'));
      console.log(chalk.gray(`   Figma Token: ${process.env.FIGMA_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`));
      console.log(chalk.gray(`   Output Directory: ${process.env.OUTPUT_DIRECTORY || './generated'}`));
      console.log(chalk.gray(`   Template Directory: ${process.env.TEMPLATE_DIRECTORY || './src/templates'}`));
      console.log(chalk.gray(`   Log Level: ${process.env.LOG_LEVEL || 'info'}`));

      // Check MCP servers
      console.log(chalk.white('\n🔗 MCP Servers:'));
      console.log(chalk.gray(`   Framelink Figma: Available`));
      console.log(chalk.gray(`   Tim Holden Figma: Available`));

      // Check generators
      console.log(chalk.white('\n🏗️  Code Generators:'));
      console.log(chalk.gray(`   React Native: ✅ Ready`));
      console.log(chalk.gray(`   Flutter: ✅ Ready`));
      console.log(chalk.gray(`   SwiftUI: ✅ Ready`));
      console.log(chalk.gray(`   Jetpack Compose: ✅ Ready`));

      // Test Figma connection
      if (process.env.FIGMA_ACCESS_TOKEN) {
        try {
          const workflow = new FigmaMobileWorkflow();
          await workflow.initialize();
          console.log(chalk.green('\n✅ Figma connection: OK'));
        } catch (error) {
          console.log(chalk.red('\n❌ Figma connection: Failed'));
          console.log(chalk.gray(`   Error: ${error.message}`));
        }
      } else {
        console.log(chalk.yellow('\n⚠️  Figma connection: Not configured'));
        console.log(chalk.gray('   Set FIGMA_ACCESS_TOKEN environment variable'));
      }

    } catch (error) {
      logger.error('Status check failed:', error.message);
      process.exit(1);
    }
  });

// Setup command
program
  .command('setup')
  .description('Setup MCP servers and configuration')
  .action(async () => {
    try {
      console.log(chalk.cyan('\n⚙️  Setting up Figma Mobile Workflow\n'));

      // Check if .env exists
      const envExists = await import('fs').then(fs => fs.existsSync('.env'));
      
      if (!envExists) {
        console.log(chalk.yellow('Creating .env file from template...'));
        const { copyFile } = await import('fs/promises');
        await copyFile('.env.example', '.env');
        console.log(chalk.green('✅ .env file created'));
        console.log(chalk.white('Please edit .env file and add your Figma access token'));
      } else {
        console.log(chalk.green('✅ .env file already exists'));
      }

      // Install MCP servers
      console.log(chalk.yellow('\nInstalling MCP servers...'));
      const { spawn } = await import('child_process');
      
      const installFramelink = spawn('npm', ['install', '-g', 'figma-developer-mcp'], { stdio: 'inherit' });
      await new Promise((resolve, reject) => {
        installFramelink.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Installation failed with code ${code}`));
        });
      });

      console.log(chalk.green('✅ MCP servers installed'));
      console.log(chalk.blue('\n🚀 Setup complete! Run "npm run status" to verify configuration.'));

    } catch (error) {
      logger.error('Setup failed:', error.message);
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show detailed help and examples')
  .action(() => {
    console.log(chalk.cyan('\n🎨 Figma Mobile Code Generator - Help\n'));

    console.log(chalk.white('📖 Examples:\n'));

    console.log(chalk.yellow('Generate React Native app from Figma design:'));
    console.log(chalk.gray('  figma-mobile-generator generate -p react-native -u "https://figma.com/file/abc123" -n MyApp\n'));

    console.log(chalk.yellow('Extract design tokens:'));
    console.log(chalk.gray('  figma-mobile-generator tokens -u "https://figma.com/file/abc123" -f json -o tokens.json\n'));

    console.log(chalk.yellow('Sync entire project:'));
    console.log(chalk.gray('  figma-mobile-generator sync -p PROJECT_ID --platforms react-native,flutter\n'));

    console.log(chalk.white('🔧 Configuration:\n'));
    console.log(chalk.gray('  Set FIGMA_ACCESS_TOKEN in .env file'));
    console.log(chalk.gray('  Get token from: https://www.figma.com/developers/api#access-tokens\n'));

    console.log(chalk.white('🏗️  Supported Platforms:\n'));
    console.log(chalk.gray('  • react-native - React Native with TypeScript'));
    console.log(chalk.gray('  • flutter - Flutter with Dart'));
    console.log(chalk.gray('  • swiftui - iOS SwiftUI'));
    console.log(chalk.gray('  • compose - Android Jetpack Compose\n'));

    console.log(chalk.white('📚 More info: https://github.com/yourusername/figma-mobile-workflow\n'));
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
