# Redis Monitoring and Memory Management

## Overview

This document explains the Redis monitoring and memory management implementation for the file deduplication feature. The monitoring system tracks Redis memory usage, particularly focusing on file hash records, and provides tools for managing and cleaning up expired records.

## Implementation Details

### Redis Monitoring Service

The `RedisMonitoringService` provides methods for monitoring Redis memory usage and key statistics:

- `getMemoryInfo()`: Returns detailed information about Redis memory usage, including used memory, peak memory, memory fragmentation ratio, and memory usage percentage.
- `getKeyStats()`: Returns statistics about Redis keys, including total keys, keys by prefix, and expiring vs. persistent keys.
- `getFileHashStats()`: Returns statistics specifically about file hash records, including total hashes, hashes with subtitles, and average TTL.
- `cleanupExpiredFileHashes()`: Removes expired file hash records to free up memory.

### Redis Monitoring Controller

The `RedisMonitoringController` exposes the monitoring functionality through API endpoints:

- `GET /api/redis/status`: Returns Redis status and memory usage information.
- `GET /api/redis/keys`: Returns statistics about Redis keys.
- `GET /api/redis/file-hashes`: Returns statistics about file hash records.
- `POST /api/redis/cleanup`: Triggers a manual cleanup of expired file hash records.

### Scheduled Cleanup Job

The `BackgroundJobService` includes a scheduled job that periodically cleans up expired file hash records:

- The job runs every 24 hours.
- It logs statistics before and after cleanup to track the effectiveness of the cleanup.
- It also logs Redis memory usage after cleanup to monitor memory consumption.

### Health Check Integration

The health check endpoint (`/health`) has been enhanced to include Redis memory usage and file hash statistics:

```json
{
  "status": "ok",
  "message": "Server is running",
  "services": {
    "redis": {
      "status": "connected",
      "memory": {
        "usedMemoryHuman": "10.25M",
        "memoryUsagePercentage": "5.12%",
        "maxmemoryHuman": "200M",
        "maxmemoryPolicy": "noeviction"
      },
      "fileHashes": {
        "totalHashes": 150,
        "hashesWithSubtitles": 120,
        "hashesWithoutSubtitles": 30
      }
    }
  },
  "monitoringEndpoints": {
    "redisStatus": "/api/redis/status",
    "redisKeys": "/api/redis/keys",
    "redisFileHashes": "/api/redis/file-hashes",
    "redisCleanup": "/api/redis/cleanup"
  }
}
```

## Memory Management Strategy

### TTL-Based Expiration

File hash records are stored with a 30-day TTL (Time To Live) by default. This ensures that records are automatically removed after a certain period, preventing unlimited growth of the cache.

### Proactive Cleanup

The scheduled cleanup job proactively removes expired records, ensuring that Redis memory usage remains under control even if the automatic TTL-based expiration is delayed.

### Monitoring and Alerting

The monitoring endpoints provide visibility into Redis memory usage and file hash statistics, allowing for early detection of potential memory issues.

## Best Practices for Redis Memory Management

1. **Monitor Memory Usage**: Regularly check Redis memory usage through the monitoring endpoints.
2. **Adjust TTL**: If memory usage is growing too quickly, consider reducing the TTL for file hash records.
3. **Increase Cleanup Frequency**: If memory usage is a concern, increase the frequency of the scheduled cleanup job.
4. **Configure Maxmemory**: Set an appropriate `maxmemory` value in the Redis configuration to prevent Redis from using too much memory.
5. **Choose Appropriate Eviction Policy**: Set an appropriate `maxmemory-policy` in the Redis configuration (e.g., `volatile-lru` to remove the least recently used keys with an expiration set).

## Monitoring Dashboard

A future enhancement could include a monitoring dashboard that visualizes Redis memory usage and file hash statistics over time, providing a more comprehensive view of the system's performance.

## Conclusion

The Redis monitoring and memory management implementation ensures that the file deduplication feature remains performant and reliable, even as the number of processed files grows. By proactively monitoring and managing Redis memory usage, the system can handle a large number of files without running into memory issues.
