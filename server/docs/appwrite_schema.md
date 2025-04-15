# Appwrite Schema Documentation

This document provides a comprehensive overview of the Appwrite database schema used in the subtitle generator application. It serves as a reference for developers to understand the structure and requirements of the database collections.

## Database Collections

The application uses the following collections:

1. `videos_collection` - Stores metadata about uploaded videos
2. `subtitles_collection` - Stores metadata about generated subtitles

## Videos Collection

### Required Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | String (255) | The name of the video file |
| `fileSize` | Integer | The size of the video file in bytes |
| `mimeType` | String (100) | The MIME type of the video file (e.g., 'video/mp4') |
| `fileId` | String (36) | The ID of the file in Appwrite Storage |
| `status` | String (20) | The status of the video (e.g., 'initialized', 'processed') |

### Optional Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `format` | String (50) | The format of the video (e.g., 'mp4', 'webm') |
| `language` | String (10) | The language of the video audio |
| `duration` | Float | The duration of the video in seconds |
| `generatedAt` | String (50) | ISO date string when the video was processed |
| `processingMetadata` | String (1000) | JSON string containing processing metadata |

## Subtitles Collection

### Required Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `videoId` | String (36) | The ID of the associated video |
| `fileId` | String (36) | The ID of the subtitle file in Appwrite Storage |
| `format` | Enum ['vtt', 'srt', 'ass'] | The format of the subtitle file |
| `language` | String (10) | The language of the subtitles |
| `name` | String (255) | The name of the subtitle file |
| `fileSize` | Integer | The size of the subtitle file in bytes |
| `mimeType` | String (100) | The MIME type of the subtitle file (e.g., 'text/vtt') |
| `status` | String (20) | The status of the subtitle generation (e.g., 'pending', 'completed') |

### Optional Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `generatedAt` | String (50) | ISO date string when the subtitles were generated |
| `processingMetadata` | String (1000) | JSON string containing processing metadata |

## Storage Buckets

The application uses the following storage buckets:

1. `videos_bucket` - Stores uploaded video files
2. `subtitles_bucket` - Stores generated subtitle files

## Document Permissions

All documents are created with the following permissions:
- Read: Any user
- Read, Update, Delete: Authenticated users

## Schema Initialization

The schema is initialized in the `appwriteInit.ts` file, which ensures that all required attributes exist in the collections. If you need to add a new attribute to the schema, you should:

1. Update the `ensureVideosAttributes` or `ensureSubtitlesAttributes` function in `appwriteInit.ts`
2. Update the corresponding interface in `types/index.ts`
3. Update the validation function in `utils/validationUtils.ts`
4. Update any document creation or mapping functions to include the new attribute

## Best Practices

1. Always validate documents before creating them using the validation functions in `utils/validationUtils.ts`
2. When mapping Appwrite documents to TypeScript interfaces, ensure all required attributes are included
3. When updating the schema, ensure all related code is updated to maintain consistency
4. Use the appropriate data types for attributes to ensure efficient storage and querying
