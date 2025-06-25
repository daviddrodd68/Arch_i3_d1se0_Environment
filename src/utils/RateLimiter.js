export class RateLimiter {
  constructor(options = {}) {
    this.requestsPerMinute = options.requestsPerMinute || 60;
    this.burstLimit = options.burstLimit || 10;
    this.windowSizeMs = 60000; // 1 minute
    
    // Token bucket for burst handling
    this.tokens = this.burstLimit;
    this.lastRefill = Date.now();
    
    // Sliding window for rate limiting
    this.requests = [];
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      rejectedRequests: 0,
      averageWaitTime: 0
    };
  }

  async waitForToken() {
    const now = Date.now();
    
    // Refill tokens based on time passed
    this.refillTokens(now);
    
    // Clean old requests from sliding window
    this.cleanOldRequests(now);
    
    // Check if we can make the request
    if (this.canMakeRequest(now)) {
      this.consumeToken();
      this.requests.push(now);
      this.stats.totalRequests++;
      return Promise.resolve();
    }
    
    // Calculate wait time
    const waitTime = this.calculateWaitTime(now);
    this.stats.rejectedRequests++;
    this.updateAverageWaitTime(waitTime);
    
    // Wait and try again
    return new Promise(resolve => {
      setTimeout(() => {
        this.waitForToken().then(resolve);
      }, waitTime);
    });
  }

  refillTokens(now) {
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.windowSizeMs) * this.burstLimit);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.burstLimit, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  cleanOldRequests(now) {
    const cutoff = now - this.windowSizeMs;
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
  }

  canMakeRequest(now) {
    // Check token bucket (burst limit)
    if (this.tokens <= 0) {
      return false;
    }
    
    // Check sliding window (rate limit)
    if (this.requests.length >= this.requestsPerMinute) {
      return false;
    }
    
    return true;
  }

  consumeToken() {
    this.tokens = Math.max(0, this.tokens - 1);
  }

  calculateWaitTime(now) {
    // Calculate wait time based on both token bucket and sliding window
    
    // Time until next token is available
    const timeUntilNextToken = this.tokens <= 0 ? 
      (this.windowSizeMs / this.burstLimit) : 0;
    
    // Time until oldest request in window expires
    const timeUntilWindowSlot = this.requests.length >= this.requestsPerMinute ?
      (this.requests[0] + this.windowSizeMs - now) : 0;
    
    // Return the maximum of both wait times
    return Math.max(timeUntilNextToken, timeUntilWindowSlot, 100); // Minimum 100ms
  }

  updateAverageWaitTime(waitTime) {
    const totalWaits = this.stats.rejectedRequests;
    this.stats.averageWaitTime = 
      ((this.stats.averageWaitTime * (totalWaits - 1)) + waitTime) / totalWaits;
  }

  // Check if a request can be made immediately
  canMakeRequestNow() {
    const now = Date.now();
    this.refillTokens(now);
    this.cleanOldRequests(now);
    return this.canMakeRequest(now);
  }

  // Get current rate limit status
  getStatus() {
    const now = Date.now();
    this.refillTokens(now);
    this.cleanOldRequests(now);
    
    return {
      tokensAvailable: this.tokens,
      maxTokens: this.burstLimit,
      requestsInWindow: this.requests.length,
      maxRequestsPerWindow: this.requestsPerMinute,
      windowSizeMs: this.windowSizeMs,
      canMakeRequest: this.canMakeRequest(now),
      estimatedWaitTime: this.canMakeRequest(now) ? 0 : this.calculateWaitTime(now)
    };
  }

  // Get statistics
  getStats() {
    const status = this.getStatus();
    
    return {
      ...this.stats,
      currentStatus: status,
      successRate: this.stats.totalRequests > 0 ? 
        ((this.stats.totalRequests - this.stats.rejectedRequests) / this.stats.totalRequests) * 100 : 100
    };
  }

  // Reset the rate limiter
  reset() {
    this.tokens = this.burstLimit;
    this.lastRefill = Date.now();
    this.requests = [];
    this.stats = {
      totalRequests: 0,
      rejectedRequests: 0,
      averageWaitTime: 0
    };
  }

  // Update rate limit settings
  updateLimits(options = {}) {
    if (options.requestsPerMinute !== undefined) {
      this.requestsPerMinute = options.requestsPerMinute;
    }
    
    if (options.burstLimit !== undefined) {
      this.burstLimit = options.burstLimit;
      this.tokens = Math.min(this.tokens, this.burstLimit);
    }
  }

  // Create a rate-limited version of a function
  static wrap(fn, options = {}) {
    const rateLimiter = new RateLimiter(options);
    
    return async function(...args) {
      await rateLimiter.waitForToken();
      return fn.apply(this, args);
    };
  }

  // Create multiple rate limiters for different endpoints
  static createMultiple(configs) {
    const limiters = {};
    
    for (const [name, config] of Object.entries(configs)) {
      limiters[name] = new RateLimiter(config);
    }
    
    return limiters;
  }
}

// Specialized rate limiter for API endpoints
export class APIRateLimiter extends RateLimiter {
  constructor(options = {}) {
    super(options);
    this.endpoint = options.endpoint || 'unknown';
    this.retryAfterHeader = options.retryAfterHeader || 'Retry-After';
  }

  // Handle rate limit response from API
  handleRateLimitResponse(response) {
    if (response.status === 429) {
      const retryAfter = response.headers[this.retryAfterHeader];
      
      if (retryAfter) {
        const waitTime = parseInt(retryAfter) * 1000; // Convert to milliseconds
        this.stats.rejectedRequests++;
        this.updateAverageWaitTime(waitTime);
        
        return new Promise(resolve => {
          setTimeout(resolve, waitTime);
        });
      }
    }
    
    return Promise.resolve();
  }

  // Make a rate-limited API request
  async makeRequest(requestFn) {
    await this.waitForToken();
    
    try {
      const response = await requestFn();
      
      // Handle rate limit response
      if (response.status === 429) {
        await this.handleRateLimitResponse(response);
        // Retry the request
        return this.makeRequest(requestFn);
      }
      
      return response;
    } catch (error) {
      // If it's a rate limit error, handle it
      if (error.response && error.response.status === 429) {
        await this.handleRateLimitResponse(error.response);
        return this.makeRequest(requestFn);
      }
      
      throw error;
    }
  }
}

// Global rate limiter for shared resources
export class GlobalRateLimiter {
  constructor() {
    this.limiters = new Map();
  }

  getLimiter(key, options = {}) {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiter(options));
    }
    
    return this.limiters.get(key);
  }

  async waitForToken(key, options = {}) {
    const limiter = this.getLimiter(key, options);
    return limiter.waitForToken();
  }

  getStatus(key) {
    const limiter = this.limiters.get(key);
    return limiter ? limiter.getStatus() : null;
  }

  getStats(key) {
    const limiter = this.limiters.get(key);
    return limiter ? limiter.getStats() : null;
  }

  getAllStats() {
    const stats = {};
    
    for (const [key, limiter] of this.limiters) {
      stats[key] = limiter.getStats();
    }
    
    return stats;
  }

  reset(key) {
    const limiter = this.limiters.get(key);
    if (limiter) {
      limiter.reset();
    }
  }

  resetAll() {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }

  removeLimiter(key) {
    return this.limiters.delete(key);
  }

  clear() {
    this.limiters.clear();
  }
}

// Export a global instance
export const globalRateLimiter = new GlobalRateLimiter();
