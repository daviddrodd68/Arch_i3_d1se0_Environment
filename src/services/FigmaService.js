import axios from 'axios';
import { Logger } from '../utils/Logger.js';
import { Cache } from '../utils/Cache.js';
import { RateLimiter } from '../utils/RateLimiter.js';

export class FigmaService {
  constructor(options = {}) {
    this.accessToken = options.accessToken;
    this.teamId = options.teamId;
    this.baseURL = 'https://api.figma.com/v1';
    this.logger = new Logger('FigmaService');
    this.cache = new Cache({ ttl: 300, maxSize: 1000 });
    this.rateLimiter = new RateLimiter({ requestsPerMinute: 60 });

    if (!this.accessToken || this.accessToken === 'dummy-token-for-testing') {
      this.logger.warn('Figma access token not configured - API calls will fail');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Figma-Token': this.accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.rateLimiter.waitForToken();
      this.logger.debug(`Making request to: ${config.url}`);
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
        return Promise.reject(error);
      }
    );
  }

  async getFile(fileKey, options = {}) {
    const cacheKey = `file:${fileKey}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for file: ${fileKey}`);
      return cached;
    }

    try {
      this.logger.info(`Fetching file: ${fileKey}`);
      
      const params = {
        geometry: 'paths',
        ...options
      };

      const response = await this.client.get(`/files/${fileKey}`, { params });
      const fileData = response.data;

      // Cache the result
      this.cache.set(cacheKey, fileData);

      this.logger.info(`Successfully fetched file: ${fileData.name}`);
      return fileData;
    } catch (error) {
      this.logger.error(`Failed to fetch file ${fileKey}:`, error.message);
      throw error;
    }
  }

  async getFileNodes(fileKey, nodeIds, options = {}) {
    const cacheKey = `nodes:${fileKey}:${nodeIds.join(',')}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      this.logger.info(`Fetching nodes from file: ${fileKey}`);
      
      const params = {
        ids: nodeIds.join(','),
        geometry: 'paths',
        ...options
      };

      const response = await this.client.get(`/files/${fileKey}/nodes`, { params });
      const nodesData = response.data;

      this.cache.set(cacheKey, nodesData);
      return nodesData;
    } catch (error) {
      this.logger.error(`Failed to fetch nodes from ${fileKey}:`, error.message);
      throw error;
    }
  }

  async getFileImages(fileKey, nodeIds, options = {}) {
    try {
      this.logger.info(`Exporting images from file: ${fileKey}`);
      
      const params = {
        ids: nodeIds.join(','),
        format: options.format || 'png',
        scale: options.scale || 1,
        ...options
      };

      const response = await this.client.get(`/images/${fileKey}`, { params });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to export images from ${fileKey}:`, error.message);
      throw error;
    }
  }

  async getLocalVariables(fileKey) {
    const cacheKey = `variables:${fileKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      this.logger.info(`Fetching variables from file: ${fileKey}`);
      
      const response = await this.client.get(`/files/${fileKey}/variables/local`);
      const variablesData = response.data;

      this.cache.set(cacheKey, variablesData);
      return variablesData;
    } catch (error) {
      this.logger.error(`Failed to fetch variables from ${fileKey}:`, error.message);
      throw error;
    }
  }

  async getProjectFiles(projectId) {
    const cacheKey = `project:${projectId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      this.logger.info(`Fetching files from project: ${projectId}`);
      
      const response = await this.client.get(`/projects/${projectId}/files`);
      const projectData = response.data;

      this.cache.set(cacheKey, projectData);
      return projectData;
    } catch (error) {
      this.logger.error(`Failed to fetch project ${projectId}:`, error.message);
      throw error;
    }
  }

  async getTeamProjects() {
    if (!this.teamId) {
      throw new Error('Team ID is required to fetch team projects');
    }

    const cacheKey = `team:${this.teamId}:projects`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      this.logger.info(`Fetching projects for team: ${this.teamId}`);
      
      const response = await this.client.get(`/teams/${this.teamId}/projects`);
      const teamData = response.data;

      this.cache.set(cacheKey, teamData);
      return teamData;
    } catch (error) {
      this.logger.error(`Failed to fetch team projects:`, error.message);
      throw error;
    }
  }

  async getComponentSets(fileKey) {
    const cacheKey = `component-sets:${fileKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      this.logger.info(`Fetching component sets from file: ${fileKey}`);
      
      const response = await this.client.get(`/files/${fileKey}/component_sets`);
      const componentSetsData = response.data;

      this.cache.set(cacheKey, componentSetsData);
      return componentSetsData;
    } catch (error) {
      this.logger.error(`Failed to fetch component sets from ${fileKey}:`, error.message);
      throw error;
    }
  }

  async getStyles(fileKey) {
    const cacheKey = `styles:${fileKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      this.logger.info(`Fetching styles from file: ${fileKey}`);
      
      const response = await this.client.get(`/files/${fileKey}/styles`);
      const stylesData = response.data;

      this.cache.set(cacheKey, stylesData);
      return stylesData;
    } catch (error) {
      this.logger.error(`Failed to fetch styles from ${fileKey}:`, error.message);
      throw error;
    }
  }

  // Utility methods
  extractFileKeyFromUrl(figmaUrl) {
    const match = figmaUrl.match(/\/file\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error('Invalid Figma URL format');
    }
    return match[1];
  }

  extractNodeIdFromUrl(figmaUrl) {
    const match = figmaUrl.match(/node-id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  clearCache() {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}
