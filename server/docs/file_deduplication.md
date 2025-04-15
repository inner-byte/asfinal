# File Deduplication Feature

## Overview

The file deduplication feature detects when a user attempts to upload a video that has already been processed by the application. Instead of re-uploading and re-processing the file, the system:

1. Detects the duplicate based on file content hash
2. Retrieves the existing video and subtitle information
3. Returns this information to the frontend
4. The frontend can then redirect the user to the media preview page

This approach saves bandwidth, processing time, and storage space while providing a seamless user experience.

## Implementation Details

### File Hashing

The system uses SHA-256 hashing to generate a unique identifier for each uploaded file. This hash is based on the file content, not the filename, ensuring accurate duplicate detection even if the same file is uploaded with different names.

```typescript
// src/utils/hashUtils.ts
import crypto from 'crypto';

export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
```

### Redis Storage

File hashes are stored in Redis with associated video and subtitle information. The key format is `file:hash:{hash}` and the value is a JSON object containing the video ID and optional subtitle ID.

```typescript
// Example Redis entry
// Key: file:hash:1a2b3c4d5e6f...
// Value: { "videoId": "video123", "subtitleId": "subtitle456" }
```

### Duplicate Detection

During the upload process, the system:
1. Generates a SHA-256 hash of the file content
2. Checks if the hash exists in Redis
3. If found, returns the existing video and subtitle information
4. If not found, proceeds with the normal upload process and stores the hash

### Subtitle Association

When subtitles are generated for a video, the system:
1. Retrieves the file hash for the video
2. Updates the hash record with the subtitle ID
3. This ensures that future uploads of the same file will include subtitle information

## API Response Format

When a duplicate file is detected, the API response includes:

```json
{
  "status": "success",
  "data": {
    "isDuplicate": true,
    "videoId": "existing-video-id",
    "subtitleId": "existing-subtitle-id",
    "videoData": { /* video metadata */ },
    "subtitleData": { /* subtitle metadata */ }
  },
  "message": "Duplicate file detected. Redirecting to existing media."
}
```

## Error Handling

The deduplication system is designed to be non-blocking:

1. If Redis is unavailable, the system falls back to normal processing
2. If retrieving video or subtitle data fails, the system still returns the IDs
3. All errors during hash calculation or lookup are logged but don't prevent the upload

## Performance Considerations

- SHA-256 hash calculation is performed in-memory and is efficient for files up to 4GB
- Redis operations are asynchronous and don't block the main thread
- The system uses a 30-day expiration for hash records to prevent unlimited growth of the cache

## Testing

The feature includes unit tests for:
- Hash generation consistency
- Redis storage and retrieval
- Duplicate detection logic

## Future Improvements

Potential future enhancements include:
- Streaming hash calculation for very large files
- User-specific hash records for privacy
- Option to force re-upload of duplicate files
- Cleanup mechanism for hash records of deleted videos
