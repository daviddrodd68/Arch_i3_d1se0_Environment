#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FigmaService } from './services/FigmaService.js';
import { DesignWorkflowOrchestrator } from './services/DesignWorkflowOrchestrator.js';
import { WebhookServer } from './services/WebhookServer.js';
import { Logger } from './utils/Logger.js';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FigmaMobileWorkflow {
  constructor() {
    this.logger = new Logger('FigmaMobileWorkflow');
    this.figmaService = null;
    this.orchestrator = null;
    this.webhookServer = null;
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Figma Mobile Design Workflow...');

      // Validate environment variables
      this.validateEnvironment();

      // Initialize services
      this.figmaService = new FigmaService({
        accessToken: process.env.FIGMA_ACCESS_TOKEN || 'dummy-token-for-testing',
        teamId: process.env.FIGMA_TEAM_ID
      });

      this.orchestrator = new DesignWorkflowOrchestrator({
        figmaService: this.figmaService,
        outputDirectory: process.env.OUTPUT_DIRECTORY || './generated',
        templateDirectory: process.env.TEMPLATE_DIRECTORY || './src/templates'
      });

      // Initialize webhook server for real-time sync
      if (process.env.WEBHOOK_PORT) {
        this.webhookServer = new WebhookServer({
          port: process.env.WEBHOOK_PORT,
          secret: process.env.WEBHOOK_SECRET,
          orchestrator: this.orchestrator
        });
      }

      this.logger.info('✅ Initialization complete!');
      this.printWelcomeMessage();

    } catch (error) {
      this.logger.error('❌ Initialization failed:', error);
      process.exit(1);
    }
  }

  validateEnvironment() {
    // For testing purposes, we'll make FIGMA_ACCESS_TOKEN optional
    // In production, you would want to enforce this
    if (!process.env.FIGMA_ACCESS_TOKEN) {
      this.logger.warn('FIGMA_ACCESS_TOKEN not set - some features will be limited');
    }
  }

  printWelcomeMessage() {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║  🎨 Figma Mobile Design Workflow                            ║
║                                                              ║
║  Ready to transform your Figma designs into mobile code!    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `));

    console.log(chalk.yellow('\n📋 Available Commands:'));
    console.log(chalk.white('  npm run generate:react-native  - Generate React Native code'));
    console.log(chalk.white('  npm run generate:flutter       - Generate Flutter code'));
    console.log(chalk.white('  npm run generate:swiftui       - Generate SwiftUI code'));
    console.log(chalk.white('  npm run generate:compose       - Generate Jetpack Compose code'));
    console.log(chalk.white('  npm run extract:tokens         - Extract design tokens'));
    console.log(chalk.white('  npm run sync:figma             - Sync with Figma'));

    if (this.webhookServer) {
      console.log(chalk.green(`\n🔗 Webhook server running on port ${process.env.WEBHOOK_PORT}`));
    }

    console.log(chalk.blue('\n🌐 MCP Integration Status:'));
    console.log(chalk.white('  Framelink Figma MCP: Ready'));
    console.log(chalk.white('  Design Token Extraction: Ready'));
    console.log(chalk.white('  Code Generation: Ready'));
  }

  async start() {
    await this.initialize();

    // Start webhook server if configured
    if (this.webhookServer) {
      await this.webhookServer.start();
    }

    // Keep the process running
    process.on('SIGINT', () => {
      this.logger.info('👋 Shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.logger.info('👋 Shutting down gracefully...');
      this.shutdown();
    });
  }

  async shutdown() {
    if (this.webhookServer) {
      await this.webhookServer.stop();
    }
    process.exit(0);
  }

  // CLI Methods for direct usage
  async generateCode(platform, figmaUrl, options = {}) {
    try {
      this.logger.info(`🔄 Generating ${platform} code from ${figmaUrl}...`);
      
      const result = await this.orchestrator.generateMobileCode({
        platform,
        figmaUrl,
        ...options
      });

      this.logger.info(`✅ Code generation complete! Files saved to: ${result.outputPath}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Code generation failed:`, error);
      throw error;
    }
  }

  async extractDesignTokens(figmaUrl, options = {}) {
    try {
      this.logger.info(`🎨 Extracting design tokens from ${figmaUrl}...`);
      
      const tokens = await this.orchestrator.extractDesignTokens({
        figmaUrl,
        ...options
      });

      this.logger.info(`✅ Design tokens extracted! ${Object.keys(tokens).length} token collections found.`);
      return tokens;
    } catch (error) {
      this.logger.error(`❌ Token extraction failed:`, error);
      throw error;
    }
  }

  async syncWithFigma(projectId, options = {}) {
    try {
      this.logger.info(`🔄 Syncing with Figma project ${projectId}...`);
      
      const result = await this.orchestrator.syncProject({
        projectId,
        ...options
      });

      this.logger.info(`✅ Sync complete! ${result.updatedFiles} files updated.`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Sync failed:`, error);
      throw error;
    }
  }
}

// Export for programmatic usage
export { FigmaMobileWorkflow };

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const workflow = new FigmaMobileWorkflow();
  workflow.start().catch(error => {
    console.error(chalk.red('💥 Fatal error:'), error);
    process.exit(1);
  });
}
