export class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 300; // 5 minutes default
    this.strategy = options.strategy || 'lru'; // lru, fifo, lfu
    
    this.data = new Map();
    this.accessTimes = new Map();
    this.accessCounts = new Map();
    this.insertionOrder = [];
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  set(key, value, customTtl) {
    const now = Date.now();
    const expiresAt = now + ((customTtl || this.ttl) * 1000);
    
    // Check if we need to evict
    if (this.data.size >= this.maxSize && !this.data.has(key)) {
      this.evict();
    }

    // Store the value with metadata
    this.data.set(key, {
      value,
      expiresAt,
      createdAt: now
    });

    // Update tracking data
    this.accessTimes.set(key, now);
    this.accessCounts.set(key, 0);
    
    // Track insertion order for FIFO
    if (!this.insertionOrder.includes(key)) {
      this.insertionOrder.push(key);
    }

    this.stats.sets++;
    return true;
  }

  get(key) {
    const item = this.data.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    this.accessTimes.set(key, Date.now());
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    this.stats.hits++;
    return item.value;
  }

  has(key) {
    const item = this.data.get(key);
    
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    const deleted = this.data.delete(key);
    
    if (deleted) {
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      
      const index = this.insertionOrder.indexOf(key);
      if (index > -1) {
        this.insertionOrder.splice(index, 1);
      }
      
      this.stats.deletes++;
    }

    return deleted;
  }

  clear() {
    const size = this.data.size;
    
    this.data.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
    this.insertionOrder = [];
    
    this.stats.deletes += size;
  }

  evict() {
    let keyToEvict;

    switch (this.strategy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'fifo':
        keyToEvict = this.findFIFOKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      default:
        keyToEvict = this.findLRUKey();
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  findLRUKey() {
    let oldestTime = Date.now();
    let oldestKey = null;

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  findFIFOKey() {
    return this.insertionOrder[0] || null;
  }

  findLFUKey() {
    let lowestCount = Infinity;
    let leastUsedKey = null;

    for (const [key, count] of this.accessCounts) {
      if (count < lowestCount) {
        lowestCount = count;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    // Find expired keys
    for (const [key, item] of this.data) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }

    // Remove expired keys
    expiredKeys.forEach(key => {
      this.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.debug(`Cache cleanup: removed ${expiredKeys.length} expired items`);
    }
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.data.size,
      maxSize: this.maxSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, item] of this.data) {
      // Rough estimation of memory usage
      totalSize += this.estimateObjectSize(key);
      totalSize += this.estimateObjectSize(item.value);
      totalSize += 64; // Overhead for metadata
    }

    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024 * 100) / 100,
      mb: Math.round(totalSize / (1024 * 1024) * 100) / 100
    };
  }

  estimateObjectSize(obj) {
    if (obj === null || obj === undefined) return 0;
    
    switch (typeof obj) {
      case 'string':
        return obj.length * 2; // UTF-16
      case 'number':
        return 8;
      case 'boolean':
        return 4;
      case 'object':
        if (Array.isArray(obj)) {
          return obj.reduce((size, item) => size + this.estimateObjectSize(item), 0);
        }
        return Object.entries(obj).reduce((size, [key, value]) => {
          return size + this.estimateObjectSize(key) + this.estimateObjectSize(value);
        }, 0);
      default:
        return 0;
    }
  }

  // Get all keys
  keys() {
    return Array.from(this.data.keys());
  }

  // Get all values
  values() {
    return Array.from(this.data.values()).map(item => item.value);
  }

  // Get all entries
  entries() {
    return Array.from(this.data.entries()).map(([key, item]) => [key, item.value]);
  }

  // Get cache size
  size() {
    return this.data.size;
  }

  // Check if cache is empty
  isEmpty() {
    return this.data.size === 0;
  }

  // Check if cache is full
  isFull() {
    return this.data.size >= this.maxSize;
  }

  // Get remaining capacity
  remainingCapacity() {
    return this.maxSize - this.data.size;
  }

  // Set new max size
  setMaxSize(newMaxSize) {
    this.maxSize = newMaxSize;
    
    // Evict items if necessary
    while (this.data.size > this.maxSize) {
      this.evict();
    }
  }

  // Set new TTL
  setTTL(newTtl) {
    this.ttl = newTtl;
  }

  // Get item with metadata
  getWithMetadata(key) {
    const item = this.data.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    // Update access tracking
    this.accessTimes.set(key, Date.now());
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    return {
      value: item.value,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      accessCount: this.accessCounts.get(key),
      lastAccessed: this.accessTimes.get(key)
    };
  }

  // Extend TTL for a specific key
  touch(key, customTtl) {
    const item = this.data.get(key);
    
    if (!item) {
      return false;
    }

    const now = Date.now();
    item.expiresAt = now + ((customTtl || this.ttl) * 1000);
    this.accessTimes.set(key, now);
    
    return true;
  }

  // Destroy cache and cleanup
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.clear();
  }
}
