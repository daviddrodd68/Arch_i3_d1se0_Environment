import fs from 'fs-extra';
import path from 'path';
import { Logger } from './Logger.js';

export class FileUtils {
  static logger = new Logger('FileUtils');

  // Ensure directory exists
  static async ensureDirectory(dirPath) {
    try {
      await fs.ensureDir(dirPath);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create directory ${dirPath}:`, error);
      throw error;
    }
  }

  // Read file content
  static async readFile(filePath, encoding = 'utf8') {
    try {
      const content = await fs.readFile(filePath, encoding);
      this.logger.debug(`Read file: ${filePath}`);
      return content;
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  // Write file content
  static async writeFile(filePath, content, options = {}) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);

      // Write file
      await fs.writeFile(filePath, content, options);
      this.logger.debug(`Wrote file: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to write file ${filePath}:`, error);
      throw error;
    }
  }

  // Append to file
  static async appendFile(filePath, content, options = {}) {
    try {
      const dir = path.dirname(filePath);
      await this.ensureDirectory(dir);

      await fs.appendFile(filePath, content, options);
      this.logger.debug(`Appended to file: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to append to file ${filePath}:`, error);
      throw error;
    }
  }

  // Check if file exists
  static async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get file stats
  static async getStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for ${filePath}:`, error);
      throw error;
    }
  }

  // Copy file
  static async copyFile(src, dest, options = {}) {
    try {
      const destDir = path.dirname(dest);
      await this.ensureDirectory(destDir);

      await fs.copy(src, dest, options);
      this.logger.debug(`Copied file: ${src} -> ${dest}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to copy file ${src} to ${dest}:`, error);
      throw error;
    }
  }

  // Move file
  static async moveFile(src, dest) {
    try {
      const destDir = path.dirname(dest);
      await this.ensureDirectory(destDir);

      await fs.move(src, dest);
      this.logger.debug(`Moved file: ${src} -> ${dest}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to move file ${src} to ${dest}:`, error);
      throw error;
    }
  }

  // Delete file
  static async deleteFile(filePath) {
    try {
      await fs.remove(filePath);
      this.logger.debug(`Deleted file: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}:`, error);
      throw error;
    }
  }

  // List directory contents
  static async listDirectory(dirPath, options = {}) {
    try {
      const items = await fs.readdir(dirPath);
      
      if (options.withStats) {
        const itemsWithStats = await Promise.all(
          items.map(async (item) => {
            const itemPath = path.join(dirPath, item);
            const stats = await this.getStats(itemPath);
            return { name: item, path: itemPath, ...stats };
          })
        );
        return itemsWithStats;
      }

      return items.map(item => ({
        name: item,
        path: path.join(dirPath, item)
      }));
    } catch (error) {
      this.logger.error(`Failed to list directory ${dirPath}:`, error);
      throw error;
    }
  }

  // Find files matching pattern
  static async findFiles(dirPath, pattern, options = {}) {
    const { recursive = true, includeDirectories = false } = options;
    const results = [];

    try {
      const items = await this.listDirectory(dirPath, { withStats: true });

      for (const item of items) {
        if (item.isDirectory && recursive) {
          const subResults = await this.findFiles(item.path, pattern, options);
          results.push(...subResults);
        }

        if (item.isFile || (item.isDirectory && includeDirectories)) {
          if (this.matchesPattern(item.name, pattern)) {
            results.push(item);
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Failed to find files in ${dirPath}:`, error);
      throw error;
    }
  }

  // Check if filename matches pattern
  static matchesPattern(filename, pattern) {
    if (typeof pattern === 'string') {
      // Simple glob-like pattern matching
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      return new RegExp(`^${regexPattern}$`, 'i').test(filename);
    }

    if (pattern instanceof RegExp) {
      return pattern.test(filename);
    }

    return false;
  }

  // Read JSON file
  static async readJson(filePath) {
    try {
      const content = await this.readFile(filePath);
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Failed to read JSON file ${filePath}:`, error);
      throw error;
    }
  }

  // Write JSON file
  static async writeJson(filePath, data, options = {}) {
    try {
      const { indent = 2, ...writeOptions } = options;
      const content = JSON.stringify(data, null, indent);
      await this.writeFile(filePath, content, writeOptions);
      return true;
    } catch (error) {
      this.logger.error(`Failed to write JSON file ${filePath}:`, error);
      throw error;
    }
  }

  // Get file extension
  static getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
  }

  // Get filename without extension
  static getBasename(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }

  // Get relative path
  static getRelativePath(from, to) {
    return path.relative(from, to);
  }

  // Resolve path
  static resolvePath(...paths) {
    return path.resolve(...paths);
  }

  // Join paths
  static joinPath(...paths) {
    return path.join(...paths);
  }

  // Get directory name
  static getDirname(filePath) {
    return path.dirname(filePath);
  }

  // Create temporary file
  static async createTempFile(content, options = {}) {
    const { prefix = 'temp', suffix = '.tmp', dir } = options;
    const tempDir = dir || await fs.realpath(require('os').tmpdir());
    const tempPath = path.join(tempDir, `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${suffix}`);
    
    await this.writeFile(tempPath, content);
    return tempPath;
  }

  // Create temporary directory
  static async createTempDir(options = {}) {
    const { prefix = 'temp', dir } = options;
    const tempDir = dir || await fs.realpath(require('os').tmpdir());
    const tempPath = path.join(tempDir, `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    await this.ensureDirectory(tempPath);
    return tempPath;
  }

  // Clean up temporary files/directories
  static async cleanupTemp(tempPath) {
    try {
      await this.deleteFile(tempPath);
      this.logger.debug(`Cleaned up temp: ${tempPath}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp ${tempPath}:`, error);
    }
  }

  // Watch file for changes
  static watchFile(filePath, callback, options = {}) {
    try {
      const watcher = fs.watch(filePath, options, (eventType, filename) => {
        this.logger.debug(`File ${filePath} changed: ${eventType}`);
        callback(eventType, filename);
      });

      return watcher;
    } catch (error) {
      this.logger.error(`Failed to watch file ${filePath}:`, error);
      throw error;
    }
  }

  // Watch directory for changes
  static watchDirectory(dirPath, callback, options = {}) {
    try {
      const watcher = fs.watch(dirPath, { recursive: true, ...options }, (eventType, filename) => {
        const fullPath = path.join(dirPath, filename || '');
        this.logger.debug(`Directory ${dirPath} changed: ${eventType} - ${filename}`);
        callback(eventType, filename, fullPath);
      });

      return watcher;
    } catch (error) {
      this.logger.error(`Failed to watch directory ${dirPath}:`, error);
      throw error;
    }
  }

  // Calculate file hash
  static async calculateHash(filePath, algorithm = 'sha256') {
    try {
      const crypto = await import('crypto');
      const content = await fs.readFile(filePath);
      const hash = crypto.createHash(algorithm);
      hash.update(content);
      return hash.digest('hex');
    } catch (error) {
      this.logger.error(`Failed to calculate hash for ${filePath}:`, error);
      throw error;
    }
  }

  // Get file size in human readable format
  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // Backup file
  static async backupFile(filePath, backupDir) {
    try {
      const filename = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${this.getBasename(filename)}-${timestamp}${this.getExtension(filename)}`;
      const backupPath = path.join(backupDir, backupFilename);

      await this.copyFile(filePath, backupPath);
      this.logger.info(`Backed up file: ${filePath} -> ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.logger.error(`Failed to backup file ${filePath}:`, error);
      throw error;
    }
  }

  // Restore file from backup
  static async restoreFile(backupPath, originalPath) {
    try {
      await this.copyFile(backupPath, originalPath);
      this.logger.info(`Restored file: ${backupPath} -> ${originalPath}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to restore file from ${backupPath}:`, error);
      throw error;
    }
  }

  // Batch operations
  static async batchOperation(files, operation, options = {}) {
    const { concurrency = 5, continueOnError = false } = options;
    const results = [];
    const errors = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await operation(file);
          results.push({ file, result, success: true });
        } catch (error) {
          errors.push({ file, error });
          if (!continueOnError) {
            throw error;
          }
          results.push({ file, error, success: false });
        }
      });

      await Promise.all(batchPromises);
    }

    return { results, errors };
  }
}
