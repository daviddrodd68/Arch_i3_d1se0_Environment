import { Logger } from '../utils/Logger.js';
import { DesignTokenExtractor } from './DesignTokenExtractor.js';
import { ReactNativeGenerator } from '../generators/ReactNativeGenerator.js';
import { FlutterGenerator } from '../generators/FlutterGenerator.js';
import { SwiftUIGenerator } from '../generators/SwiftUIGenerator.js';
import { JetpackComposeGenerator } from '../generators/JetpackComposeGenerator.js';
import { AssetDownloader } from '../utils/AssetDownloader.js';
import { FileUtils } from '../utils/FileUtils.js';
import path from 'path';

export class DesignWorkflowOrchestrator {
  constructor(options = {}) {
    this.figmaService = options.figmaService;
    this.outputDirectory = options.outputDirectory || './generated';
    this.templateDirectory = options.templateDirectory || './src/templates';
    this.logger = new Logger('DesignWorkflowOrchestrator');

    // Initialize services
    this.tokenExtractor = new DesignTokenExtractor(this.figmaService);
    this.assetDownloader = new AssetDownloader(this.figmaService);

    // Initialize generators
    this.generators = {
      'react-native': new ReactNativeGenerator({
        outputDirectory: this.outputDirectory,
        templateDirectory: this.templateDirectory
      }),
      'flutter': new FlutterGenerator({
        outputDirectory: this.outputDirectory,
        templateDirectory: this.templateDirectory
      }),
      'swiftui': new SwiftUIGenerator({
        outputDirectory: this.outputDirectory,
        templateDirectory: this.templateDirectory
      }),
      'compose': new JetpackComposeGenerator({
        outputDirectory: this.outputDirectory,
        templateDirectory: this.templateDirectory
      })
    };

    this.logger.info('Design Workflow Orchestrator initialized');
  }

  async generateMobileCode(options = {}) {
    const {
      platform,
      figmaUrl,
      projectName = 'GeneratedApp',
      includeAssets = true,
      extractTokens = true,
      outputPath
    } = options;

    try {
      this.logger.info(`Starting mobile code generation for ${platform}`);
      this.logger.time('codeGeneration');

      // Validate inputs
      this.validateGenerationOptions(options);

      // Extract file key from Figma URL
      const fileKey = this.figmaService.extractFileKeyFromUrl(figmaUrl);
      const nodeId = this.figmaService.extractNodeIdFromUrl(figmaUrl);

      // Step 1: Fetch Figma data
      this.logger.info('Fetching Figma design data...');
      const figmaData = await this.fetchFigmaData(fileKey, nodeId);

      // Step 2: Extract design tokens
      let designTokens = {};
      if (extractTokens) {
        this.logger.info('Extracting design tokens...');
        designTokens = await this.tokenExtractor.extractTokens(fileKey);
      }

      // Step 3: Download assets
      let assets = [];
      if (includeAssets) {
        this.logger.info('Downloading assets...');
        assets = await this.downloadAssets(figmaData, fileKey);
      }

      // Step 4: Generate code
      this.logger.info(`Generating ${platform} code...`);
      const generator = this.getGenerator(platform);
      const generationResult = await generator.generateCode(figmaData, designTokens, {
        projectName,
        outputPath: outputPath || path.join(this.outputDirectory, platform, projectName),
        assets
      });

      // Step 5: Post-processing
      await this.postProcessGeneration(generationResult, options);

      const duration = this.logger.timeEnd('codeGeneration');

      const result = {
        success: true,
        platform,
        projectName,
        outputPath: generationResult.outputPath,
        files: generationResult.files,
        assets,
        designTokens,
        summary: generationResult.summary,
        duration,
        figmaUrl,
        fileKey
      };

      this.logger.success(`Code generation completed successfully in ${duration}ms`);
      return result;

    } catch (error) {
      this.logger.error('Code generation failed:', error);
      throw error;
    }
  }

  async extractDesignTokens(options = {}) {
    const { figmaUrl, format = 'json', outputPath } = options;

    try {
      this.logger.info('Starting design token extraction');
      this.logger.time('tokenExtraction');

      const fileKey = this.figmaService.extractFileKeyFromUrl(figmaUrl);
      const tokens = await this.tokenExtractor.extractTokens(fileKey, options);

      // Save tokens to file if outputPath is provided
      if (outputPath) {
        await this.saveDesignTokens(tokens, outputPath, format);
      }

      const duration = this.logger.timeEnd('tokenExtraction');

      this.logger.success(`Design token extraction completed in ${duration}ms`);
      return {
        tokens,
        format,
        outputPath,
        duration,
        figmaUrl,
        fileKey
      };

    } catch (error) {
      this.logger.error('Design token extraction failed:', error);
      throw error;
    }
  }

  async syncProject(options = {}) {
    const { projectId, platforms = ['react-native'], autoCommit = false } = options;

    try {
      this.logger.info(`Starting project sync for project: ${projectId}`);
      this.logger.time('projectSync');

      // Get project files
      const projectData = await this.figmaService.getProjectFiles(projectId);
      const results = [];

      // Process each file in the project
      for (const file of projectData.files) {
        this.logger.info(`Processing file: ${file.name}`);

        for (const platform of platforms) {
          try {
            const result = await this.generateMobileCode({
              platform,
              figmaUrl: `https://www.figma.com/file/${file.key}`,
              projectName: this.sanitizeProjectName(file.name),
              includeAssets: true,
              extractTokens: true
            });

            results.push(result);
          } catch (error) {
            this.logger.error(`Failed to generate ${platform} code for ${file.name}:`, error);
            results.push({
              success: false,
              platform,
              fileName: file.name,
              error: error.message
            });
          }
        }
      }

      // Auto-commit if enabled
      if (autoCommit) {
        await this.commitChanges(results);
      }

      const duration = this.logger.timeEnd('projectSync');
      const successCount = results.filter(r => r.success).length;

      this.logger.success(`Project sync completed: ${successCount}/${results.length} successful in ${duration}ms`);

      return {
        projectId,
        results,
        updatedFiles: successCount,
        duration,
        autoCommit
      };

    } catch (error) {
      this.logger.error('Project sync failed:', error);
      throw error;
    }
  }

  async fetchFigmaData(fileKey, nodeId = null) {
    try {
      let figmaData;

      if (nodeId) {
        // Fetch specific node
        const nodesData = await this.figmaService.getFileNodes(fileKey, [nodeId]);
        figmaData = {
          document: nodesData.nodes[nodeId]?.document || nodesData.nodes[nodeId],
          name: `Node ${nodeId}`,
          ...nodesData
        };
      } else {
        // Fetch entire file
        figmaData = await this.figmaService.getFile(fileKey);
      }

      // Enrich with additional data
      const [componentSets, styles] = await Promise.allSettled([
        this.figmaService.getComponentSets(fileKey),
        this.figmaService.getStyles(fileKey)
      ]);

      if (componentSets.status === 'fulfilled') {
        figmaData.componentSets = componentSets.value;
      }

      if (styles.status === 'fulfilled') {
        figmaData.styles = styles.value;
      }

      return figmaData;

    } catch (error) {
      this.logger.error(`Failed to fetch Figma data for file ${fileKey}:`, error);
      throw error;
    }
  }

  async downloadAssets(figmaData, fileKey) {
    try {
      const assets = await this.assetDownloader.downloadAssets(figmaData, fileKey, {
        formats: ['png', 'svg'],
        scales: [1, 2, 3],
        outputDirectory: path.join(this.outputDirectory, 'assets')
      });

      this.logger.info(`Downloaded ${assets.length} assets`);
      return assets;

    } catch (error) {
      this.logger.error('Failed to download assets:', error);
      return [];
    }
  }

  async saveDesignTokens(tokens, outputPath, format) {
    try {
      await FileUtils.ensureDirectory(path.dirname(outputPath));

      switch (format.toLowerCase()) {
        case 'json':
          await FileUtils.writeJson(outputPath, tokens, { indent: 2 });
          break;
        case 'yaml':
          const yaml = await import('yaml');
          await FileUtils.writeFile(outputPath, yaml.stringify(tokens));
          break;
        case 'css':
          const cssContent = this.generateCSSTokens(tokens);
          await FileUtils.writeFile(outputPath, cssContent);
          break;
        case 'scss':
          const scssContent = this.generateSCSSTokens(tokens);
          await FileUtils.writeFile(outputPath, scssContent);
          break;
        case 'js':
          const jsContent = `export const designTokens = ${JSON.stringify(tokens, null, 2)};`;
          await FileUtils.writeFile(outputPath, jsContent);
          break;
        case 'ts':
          const tsContent = `export const designTokens = ${JSON.stringify(tokens, null, 2)} as const;`;
          await FileUtils.writeFile(outputPath, tsContent);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      this.logger.info(`Design tokens saved to: ${outputPath}`);

    } catch (error) {
      this.logger.error(`Failed to save design tokens to ${outputPath}:`, error);
      throw error;
    }
  }

  generateCSSTokens(tokens) {
    let css = ':root {\n';
    
    Object.entries(tokens).forEach(([category, categoryTokens]) => {
      css += `  /* ${category} */\n`;
      Object.entries(categoryTokens).forEach(([name, value]) => {
        css += `  --${category}-${name}: ${value};\n`;
      });
      css += '\n';
    });
    
    css += '}';
    return css;
  }

  generateSCSSTokens(tokens) {
    let scss = '';
    
    Object.entries(tokens).forEach(([category, categoryTokens]) => {
      scss += `// ${category}\n`;
      Object.entries(categoryTokens).forEach(([name, value]) => {
        scss += `$${category}-${name}: ${value};\n`;
      });
      scss += '\n';
    });
    
    return scss;
  }

  async postProcessGeneration(result, options) {
    // Format generated code
    if (options.formatCode !== false) {
      await this.formatGeneratedCode(result);
    }

    // Run linting
    if (options.lint) {
      await this.lintGeneratedCode(result);
    }

    // Generate documentation
    if (options.generateDocs) {
      await this.generateDocumentation(result);
    }
  }

  async formatGeneratedCode(result) {
    // Implementation for code formatting
    this.logger.debug('Formatting generated code...');
  }

  async lintGeneratedCode(result) {
    // Implementation for code linting
    this.logger.debug('Linting generated code...');
  }

  async generateDocumentation(result) {
    // Implementation for documentation generation
    this.logger.debug('Generating documentation...');
  }

  async commitChanges(results) {
    // Implementation for Git commits
    this.logger.debug('Committing changes...');
  }

  validateGenerationOptions(options) {
    const { platform, figmaUrl } = options;

    if (!platform) {
      throw new Error('Platform is required');
    }

    if (!this.generators[platform]) {
      throw new Error(`Unsupported platform: ${platform}. Supported platforms: ${Object.keys(this.generators).join(', ')}`);
    }

    if (!figmaUrl) {
      throw new Error('Figma URL is required');
    }

    if (!figmaUrl.includes('figma.com')) {
      throw new Error('Invalid Figma URL');
    }
  }

  getGenerator(platform) {
    const generator = this.generators[platform];
    if (!generator) {
      throw new Error(`Generator not found for platform: ${platform}`);
    }
    return generator;
  }

  sanitizeProjectName(name) {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  // Get available platforms
  getAvailablePlatforms() {
    return Object.keys(this.generators);
  }

  // Get orchestrator status
  getStatus() {
    return {
      figmaService: !!this.figmaService,
      generators: Object.keys(this.generators),
      outputDirectory: this.outputDirectory,
      templateDirectory: this.templateDirectory
    };
  }
}
