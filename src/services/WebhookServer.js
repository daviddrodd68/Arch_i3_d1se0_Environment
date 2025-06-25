import express from 'express';
import crypto from 'crypto';
import { Logger } from '../utils/Logger.js';

export class WebhookServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.secret = options.secret;
    this.orchestrator = options.orchestrator;
    this.logger = new Logger('WebhookServer');
    
    this.app = express();
    this.server = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Raw body parser for webhook signature verification
    this.app.use('/webhook', express.raw({ type: 'application/json' }));
    
    // JSON parser for other routes
    this.app.use(express.json());
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Figma webhook endpoint
    this.app.post('/webhook/figma', async (req, res) => {
      try {
        // Verify webhook signature if secret is provided
        if (this.secret && !this.verifySignature(req)) {
          this.logger.warn('Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }

        const payload = JSON.parse(req.body.toString());
        this.logger.info('Received Figma webhook:', payload);

        // Process the webhook
        await this.processFigmaWebhook(payload);

        res.json({ success: true, message: 'Webhook processed' });

      } catch (error) {
        this.logger.error('Webhook processing failed:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    });

    // Manual trigger endpoint
    this.app.post('/trigger/generate', async (req, res) => {
      try {
        const { platform, figmaUrl, projectName, options = {} } = req.body;

        if (!platform || !figmaUrl) {
          return res.status(400).json({ 
            error: 'Missing required fields: platform, figmaUrl' 
          });
        }

        this.logger.info(`Manual trigger: ${platform} from ${figmaUrl}`);

        const result = await this.orchestrator.generateMobileCode({
          platform,
          figmaUrl,
          projectName: projectName || 'ManualGeneration',
          ...options
        });

        res.json({
          success: true,
          result
        });

      } catch (error) {
        this.logger.error('Manual generation failed:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        server: 'running',
        port: this.port,
        webhookSecret: !!this.secret,
        orchestrator: !!this.orchestrator,
        timestamp: new Date().toISOString()
      });
    });
  }

  verifySignature(req) {
    const signature = req.headers['x-figma-signature'];
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(req.body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  async processFigmaWebhook(payload) {
    const { event_type, file_key, triggered_by } = payload;

    this.logger.info(`Processing ${event_type} for file ${file_key} by ${triggered_by?.handle || 'unknown'}`);

    switch (event_type) {
      case 'FILE_UPDATE':
        await this.handleFileUpdate(file_key, payload);
        break;
      
      case 'FILE_VERSION_UPDATE':
        await this.handleFileVersionUpdate(file_key, payload);
        break;
      
      case 'FILE_DELETE':
        await this.handleFileDelete(file_key, payload);
        break;
      
      case 'LIBRARY_PUBLISH':
        await this.handleLibraryPublish(file_key, payload);
        break;
      
      default:
        this.logger.warn(`Unhandled event type: ${event_type}`);
    }
  }

  async handleFileUpdate(fileKey, payload) {
    try {
      if (!this.orchestrator) {
        this.logger.warn('No orchestrator configured, skipping file update');
        return;
      }

      // Get configured platforms for auto-generation
      const platforms = process.env.AUTO_GENERATE_PLATFORMS?.split(',') || ['react-native'];
      
      for (const platform of platforms) {
        try {
          this.logger.info(`Auto-generating ${platform} code for updated file ${fileKey}`);
          
          const result = await this.orchestrator.generateMobileCode({
            platform: platform.trim(),
            figmaUrl: `https://www.figma.com/file/${fileKey}`,
            projectName: `AutoGenerated_${Date.now()}`,
            includeAssets: true,
            extractTokens: true
          });

          this.logger.success(`Auto-generation completed for ${platform}: ${result.outputPath}`);

        } catch (error) {
          this.logger.error(`Auto-generation failed for ${platform}:`, error);
        }
      }

    } catch (error) {
      this.logger.error('File update handling failed:', error);
    }
  }

  async handleFileVersionUpdate(fileKey, payload) {
    this.logger.info(`File version updated: ${fileKey}`);
    // Handle version updates (could trigger different logic than regular updates)
    await this.handleFileUpdate(fileKey, payload);
  }

  async handleFileDelete(fileKey, payload) {
    this.logger.info(`File deleted: ${fileKey}`);
    // Handle file deletion (cleanup generated code, etc.)
  }

  async handleLibraryPublish(fileKey, payload) {
    this.logger.info(`Library published: ${fileKey}`);
    // Handle library publishing (update design system, etc.)
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error) => {
        if (error) {
          this.logger.error(`Failed to start webhook server:`, error);
          reject(error);
        } else {
          this.logger.info(`Webhook server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Webhook server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getStatus() {
    return {
      running: !!this.server,
      port: this.port,
      hasSecret: !!this.secret,
      hasOrchestrator: !!this.orchestrator
    };
  }
}
