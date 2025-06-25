import { Logger } from './Logger.js';
import { FileUtils } from './FileUtils.js';
import fetch from 'node-fetch';
import path from 'path';
import sharp from 'sharp';

export class AssetDownloader {
  constructor(figmaService) {
    this.figmaService = figmaService;
    this.logger = new Logger('AssetDownloader');
  }

  async downloadAssets(figmaData, fileKey, options = {}) {
    const {
      formats = ['png', 'svg'],
      scales = [1, 2, 3],
      outputDirectory = './assets',
      optimize = true
    } = options;

    try {
      this.logger.info('Starting asset download...');

      // Extract image nodes from Figma data
      const imageNodes = this.extractImageNodes(figmaData.document);
      
      if (imageNodes.length === 0) {
        this.logger.info('No image assets found');
        return [];
      }

      this.logger.info(`Found ${imageNodes.length} image assets`);

      const downloadedAssets = [];

      // Download assets for each format and scale
      for (const format of formats) {
        for (const scale of scales) {
          this.logger.info(`Downloading ${format} assets at ${scale}x scale...`);

          const assets = await this.downloadAssetsForFormat(
            fileKey,
            imageNodes,
            format,
            scale,
            outputDirectory
          );

          downloadedAssets.push(...assets);
        }
      }

      // Optimize images if requested
      if (optimize) {
        await this.optimizeAssets(downloadedAssets);
      }

      this.logger.success(`Downloaded ${downloadedAssets.length} assets`);
      return downloadedAssets;

    } catch (error) {
      this.logger.error('Asset download failed:', error);
      throw error;
    }
  }

  extractImageNodes(node, imageNodes = []) {
    // Check if node has image fills
    if (node.fills) {
      const imageFills = node.fills.filter(fill => fill.type === 'IMAGE');
      if (imageFills.length > 0) {
        imageNodes.push({
          id: node.id,
          name: node.name,
          fills: imageFills,
          absoluteBoundingBox: node.absoluteBoundingBox
        });
      }
    }

    // Check for image nodes
    if (node.type === 'IMAGE') {
      imageNodes.push({
        id: node.id,
        name: node.name,
        absoluteBoundingBox: node.absoluteBoundingBox
      });
    }

    // Recursively check children
    if (node.children) {
      node.children.forEach(child => {
        this.extractImageNodes(child, imageNodes);
      });
    }

    return imageNodes;
  }

  async downloadAssetsForFormat(fileKey, imageNodes, format, scale, outputDirectory) {
    try {
      // Get export URLs from Figma
      const nodeIds = imageNodes.map(node => node.id);
      const exportData = await this.figmaService.getFileImages(fileKey, nodeIds, {
        format,
        scale
      });

      if (!exportData.images) {
        this.logger.warn(`No export URLs received for ${format} at ${scale}x`);
        return [];
      }

      const assets = [];

      // Download each asset
      for (const [nodeId, imageUrl] of Object.entries(exportData.images)) {
        if (!imageUrl) {
          this.logger.warn(`No URL for node ${nodeId}`);
          continue;
        }

        const node = imageNodes.find(n => n.id === nodeId);
        if (!node) continue;

        try {
          const asset = await this.downloadSingleAsset(
            imageUrl,
            node,
            format,
            scale,
            outputDirectory
          );

          assets.push(asset);
        } catch (error) {
          this.logger.error(`Failed to download asset ${node.name}:`, error);
        }
      }

      return assets;

    } catch (error) {
      this.logger.error(`Failed to download ${format} assets at ${scale}x:`, error);
      return [];
    }
  }

  async downloadSingleAsset(imageUrl, node, format, scale, outputDirectory) {
    try {
      // Generate filename
      const filename = this.generateAssetFilename(node.name, format, scale);
      const filePath = path.join(outputDirectory, format, filename);

      // Ensure directory exists
      await FileUtils.ensureDirectory(path.dirname(filePath));

      // Download image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();

      // Save to file
      await FileUtils.writeFile(filePath, buffer);

      const asset = {
        nodeId: node.id,
        name: node.name,
        format,
        scale,
        filename,
        path: filePath,
        size: buffer.length,
        dimensions: node.absoluteBoundingBox ? {
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height
        } : null
      };

      this.logger.debug(`Downloaded: ${filename}`);
      return asset;

    } catch (error) {
      this.logger.error(`Failed to download ${node.name}:`, error);
      throw error;
    }
  }

  generateAssetFilename(nodeName, format, scale) {
    // Sanitize node name
    const sanitizedName = nodeName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Add scale suffix for non-1x scales
    const scaleSuffix = scale === 1 ? '' : `@${scale}x`;

    return `${sanitizedName}${scaleSuffix}.${format}`;
  }

  async optimizeAssets(assets) {
    this.logger.info('Optimizing assets...');

    let optimizedCount = 0;

    for (const asset of assets) {
      try {
        if (asset.format === 'png' || asset.format === 'jpg' || asset.format === 'jpeg') {
          await this.optimizeRasterImage(asset);
          optimizedCount++;
        } else if (asset.format === 'svg') {
          await this.optimizeSvg(asset);
          optimizedCount++;
        }
      } catch (error) {
        this.logger.warn(`Failed to optimize ${asset.filename}:`, error);
      }
    }

    this.logger.info(`Optimized ${optimizedCount} assets`);
  }

  async optimizeRasterImage(asset) {
    try {
      const originalBuffer = await FileUtils.readFile(asset.path);
      
      let sharpInstance = sharp(originalBuffer);

      // Apply optimizations based on format
      if (asset.format === 'png') {
        sharpInstance = sharpInstance.png({
          quality: 90,
          compressionLevel: 9,
          adaptiveFiltering: true
        });
      } else if (asset.format === 'jpg' || asset.format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true
        });
      }

      const optimizedBuffer = await sharpInstance.toBuffer();

      // Only save if optimization reduced file size
      if (optimizedBuffer.length < originalBuffer.length) {
        await FileUtils.writeFile(asset.path, optimizedBuffer);
        
        const savings = ((originalBuffer.length - optimizedBuffer.length) / originalBuffer.length) * 100;
        this.logger.debug(`Optimized ${asset.filename}: ${savings.toFixed(1)}% smaller`);
        
        // Update asset size
        asset.size = optimizedBuffer.length;
      }

    } catch (error) {
      this.logger.warn(`Failed to optimize raster image ${asset.filename}:`, error);
    }
  }

  async optimizeSvg(asset) {
    try {
      // Basic SVG optimization (remove unnecessary whitespace, comments)
      const svgContent = await FileUtils.readFile(asset.path, 'utf8');
      
      const optimizedSvg = svgContent
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .trim();

      if (optimizedSvg.length < svgContent.length) {
        await FileUtils.writeFile(asset.path, optimizedSvg);
        
        const savings = ((svgContent.length - optimizedSvg.length) / svgContent.length) * 100;
        this.logger.debug(`Optimized ${asset.filename}: ${savings.toFixed(1)}% smaller`);
        
        // Update asset size
        asset.size = Buffer.byteLength(optimizedSvg, 'utf8');
      }

    } catch (error) {
      this.logger.warn(`Failed to optimize SVG ${asset.filename}:`, error);
    }
  }

  // Generate asset manifest
  async generateAssetManifest(assets, outputDirectory) {
    try {
      const manifest = {
        generated: new Date().toISOString(),
        totalAssets: assets.length,
        totalSize: assets.reduce((sum, asset) => sum + asset.size, 0),
        formats: [...new Set(assets.map(asset => asset.format))],
        scales: [...new Set(assets.map(asset => asset.scale))],
        assets: assets.map(asset => ({
          name: asset.name,
          filename: asset.filename,
          format: asset.format,
          scale: asset.scale,
          size: asset.size,
          dimensions: asset.dimensions
        }))
      };

      const manifestPath = path.join(outputDirectory, 'asset-manifest.json');
      await FileUtils.writeJson(manifestPath, manifest, { indent: 2 });

      this.logger.info(`Asset manifest saved to: ${manifestPath}`);
      return manifest;

    } catch (error) {
      this.logger.error('Failed to generate asset manifest:', error);
      throw error;
    }
  }

  // Create platform-specific asset configurations
  async generatePlatformAssetConfigs(assets, outputDirectory) {
    const configs = {};

    // React Native asset configuration
    configs.reactNative = this.generateReactNativeAssetConfig(assets);

    // Flutter asset configuration
    configs.flutter = this.generateFlutterAssetConfig(assets);

    // iOS asset configuration
    configs.ios = this.generateiOSAssetConfig(assets);

    // Android asset configuration
    configs.android = this.generateAndroidAssetConfig(assets);

    // Save configurations
    for (const [platform, config] of Object.entries(configs)) {
      const configPath = path.join(outputDirectory, `${platform}-assets.json`);
      await FileUtils.writeJson(configPath, config, { indent: 2 });
    }

    return configs;
  }

  generateReactNativeAssetConfig(assets) {
    const assetsByName = {};

    assets.forEach(asset => {
      if (!assetsByName[asset.name]) {
        assetsByName[asset.name] = [];
      }
      assetsByName[asset.name].push(asset);
    });

    return {
      platform: 'react-native',
      assets: Object.entries(assetsByName).map(([name, assetVersions]) => ({
        name,
        files: assetVersions.map(asset => ({
          path: asset.path,
          scale: asset.scale,
          format: asset.format
        }))
      }))
    };
  }

  generateFlutterAssetConfig(assets) {
    return {
      platform: 'flutter',
      assets: assets.map(asset => ({
        name: asset.name,
        path: asset.path,
        scale: asset.scale
      }))
    };
  }

  generateiOSAssetConfig(assets) {
    return {
      platform: 'ios',
      assets: assets.map(asset => ({
        name: asset.name,
        filename: asset.filename,
        scale: asset.scale === 1 ? '' : `@${asset.scale}x`
      }))
    };
  }

  generateAndroidAssetConfig(assets) {
    const densityMap = {
      1: 'mdpi',
      1.5: 'hdpi',
      2: 'xhdpi',
      3: 'xxhdpi',
      4: 'xxxhdpi'
    };

    return {
      platform: 'android',
      assets: assets.map(asset => ({
        name: asset.name,
        filename: asset.filename,
        density: densityMap[asset.scale] || 'mdpi'
      }))
    };
  }
}
