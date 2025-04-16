import IORedis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Default expiration time (e.g., 1 hour)
const DEFAULT_EXPIRATION_TIME = 3600;

// Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1', // Use REDIS_HOST from .env
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Let ioredis handle reconnection attempts
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableOfflineQueue: true,
  connectTimeout: 10000, // 10 seconds
  lazyConnect: false, // Connect immediately
};

// Create Redis client instance
let redisClient: IORedis;

try {
  // Create Redis client with the configured options
  redisClient = new IORedis(redisOptions);

  // Set up event listeners
  redisClient.on('connect', () => {
    console.log('Connected to Redis server');
  });

  redisClient.on('ready', () => {
    console.log('Redis client ready');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
    // Note: ioredis will automatically try to reconnect
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  redisClient.on('close', () => {
    console.log('Redis connection closed');
  });

  redisClient.on('end', () => {
    console.log('Redis connection ended');
  });

  // No need to explicitly connect when lazyConnect is false
  // IORedis will automatically connect when created
  console.log('Redis client created with auto-connect enabled');
} catch (error) {
  console.error('Error creating Redis client:', error);
  // Create a dummy client that doesn't actually connect to Redis
  // This allows the application to start even if Redis is not available
  console.warn('Creating fallback Redis client - caching will be disabled');
  redisClient = new IORedis(null as any);
}

// Export client and default expiration time
export { redisClient, DEFAULT_EXPIRATION_TIME };
