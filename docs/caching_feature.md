# File Deduplication with Automatic Media Preview

This document outlines the implementation of a file deduplication system with automatic media preview functionality for the AI-powered subtitle generator application. The chosen approach is **Content-Based Hashing with Redis and Redirect Flow**.

## Table of Contents

1. [Overview](#overview)
2. [Current Workflow](#current-workflow)
3. [Implementation Approach](#implementation-approach)
4. [Required Changes](#required-changes)
   - [Backend Changes](#backend-changes)
   - [Frontend Changes](#frontend-changes)
5. [Implementation Steps](#implementation-steps)
6. [Testing](#testing)
7. [Considerations and Edge Cases](#considerations-and-edge-cases)

## Overview

The deduplication system will detect when a user attempts to upload a file that has already been processed by the application. Instead of re-uploading and re-processing the file, the system will:

1. Detect the duplicate based on file content hash
2. Retrieve the existing video and subtitle information
3. Redirect the user to the media preview page
4. Load the existing video and subtitles

This approach saves bandwidth, processing time, and storage space while providing a seamless user experience.

## Current Workflow

### Video Upload Flow

The current video upload process follows these steps:

1. **Frontend Initialization**:
   - User selects a video file in the UI
   - Frontend validates file type and size (up to 4GB)
   - Frontend calls `POST /api/videos` with metadata (filename, size, type)

2. **Backend Initialization**:
   - `videoController.initializeUpload` processes the request
   - `videoService.initializeUpload` creates a document in Appwrite
   - Returns a video ID to the frontend

3. **File Upload**:
   - Frontend uploads the file using `POST /api/videos/:id/upload`
   - `videoController.uploadVideo` processes the request
   - `videoService.handleFileUpload` uploads the file to Appwrite storage
   - Updates the video document status to 'uploaded'

4. **Subtitle Generation**:
   - User triggers subtitle generation
   - Frontend calls `POST /api/subtitles/video/:videoId/generate`
   - `subtitleController.generateSubtitles` processes the request
   - `subtitleService.generateSubtitles` or `backgroundJobService.addSubtitleGenerationJob` handles the generation
   - Returns subtitle information to the frontend

5. **Media Preview**:
   - Frontend navigates to the media preview page
   - Loads the video using `GET /api/videos/:id/stream`
   - Loads the subtitles using `GET /api/subtitles/content/:fileId`
   - Displays the video with subtitles using Plyr player

### Current Caching Implementation

The application currently uses Redis for caching:

- `redisService.ts` provides methods for caching video and subtitle metadata
- `videoService.getVideoById` and `listVideos` use the cache for performance
- Cache keys are generated using `generateVideoKey` and `generateSubtitleKey`
- The Redis client is configured in `redis.ts`

## Implementation Approach

The chosen approach is **Content-Based Hashing with Redis and Redirect Flow**:

1. **Generate a SHA-256 hash** of the file content during the upload phase
2. **Store the hash in Redis** with metadata about the associated video and subtitles
3. **Check the hash** before processing any new upload
4. **Return existing video and subtitle IDs** when a duplicate is detected
5. **Implement a redirect mechanism** in the frontend to navigate to the media preview page

This approach provides:
- High accuracy through content-based hashing
- Seamless user experience with automatic redirection
- Efficient use of existing Redis infrastructure
- Minimal changes to the current architecture

## Required Changes

### Backend Changes

#### 1. Create a Utility for File Hashing

Create a new file `src/utils/hashUtils.ts`:

```typescript
import crypto from 'crypto';

/**
 * Generates a SHA-256 hash of a file buffer
 * @param buffer The file buffer to hash
 * @returns The hex-encoded hash string
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
```

#### 2. Extend Redis Service

Add new methods to `src/services/redisService.ts`:

```typescript
/**
 * Store a file hash with associated video and subtitle information
 * @param fileHash The SHA-256 hash of the file content
 * @param videoData Object containing videoId and optional subtitleId
 * @param expirationSeconds Cache expiration time in seconds (default: 30 days)
 */
async storeFileHash(
  fileHash: string, 
  videoData: { videoId: string, subtitleId?: string }, 
  expirationSeconds: number = 60 * 60 * 24 * 30
): Promise<void> {
  const key = `file:hash:${fileHash}`;
  await setCacheValue(key, videoData, expirationSeconds);
}

/**
 * Get video information by file hash
 * @param fileHash The SHA-256 hash of the file content
 * @returns Object containing videoId and optional subtitleId, or null if not found
 */
async getVideoByFileHash(fileHash: string): Promise<{ videoId: string, subtitleId?: string } | null> {
  const key = `file:hash:${fileHash}`;
  return getCacheValue<{ videoId: string, subtitleId?: string }>(key);
}

/**
 * Update subtitle information for an existing file hash
 * @param fileHash The SHA-256 hash of the file content
 * @param subtitleId The ID of the generated subtitle
 * @returns True if the update was successful, false otherwise
 */
async updateFileHashWithSubtitle(fileHash: string, subtitleId: string): Promise<boolean> {
  const key = `file:hash:${fileHash}`;
  const existingData = await getCacheValue<{ videoId: string, subtitleId?: string }>(key);
  
  if (!existingData) {
    return false;
  }
  
  await setCacheValue(key, { ...existingData, subtitleId }, 60 * 60 * 24 * 30);
  return true;
}
```

#### 3. Modify Video Controller

Update `src/controllers/videoController.ts` to implement deduplication in the `uploadVideo` method:

```typescript
import { generateFileHash } from '../utils/hashUtils';

// Inside VideoController class
uploadVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new AppError('Video ID is required', 400);
    }

    if (!req.file) {
      throw new AppError('No file data received. Ensure the file was uploaded correctly.', 400);
    }
    
    const { originalname: fileName, size: fileSize, mimetype: mimeType, buffer } = req.file;

    // Check if buffer exists and has content
    if (!buffer || buffer.length === 0) {
      throw new AppError('File buffer is empty or missing in the request.', 500);
    }

    // Generate file hash and check for duplicates
    const fileHash = generateFileHash(buffer);
    const existingVideo = await redisService.getVideoByFileHash(fileHash);
    
    if (existingVideo) {
      // Get video and subtitle information
      let videoData = null;
      let subtitleData = null;
      
      try {
        videoData = await videoService.getVideoById(existingVideo.videoId);
        
        if (existingVideo.subtitleId) {
          subtitleData = await subtitleService.getSubtitleById(existingVideo.subtitleId);
        }
      } catch (error) {
        console.warn(`Failed to fetch complete data for duplicate video: ${error}`);
      }
      
      // Return the existing video and subtitle information
      const response: ApiResponse<{
        isDuplicate: boolean,
        videoId: string,
        subtitleId?: string,
        videoData?: Video,
        subtitleData?: any
      }> = {
        status: 'success',
        data: {
          isDuplicate: true,
          videoId: existingVideo.videoId,
          subtitleId: existingVideo.subtitleId,
          videoData,
          subtitleData
        },
        message: 'Duplicate file detected. Redirecting to existing media.'
      };
      
      return res.status(200).json(response);
    }

    // Validate fileSize against buffer length for consistency
    if (fileSize !== buffer.length) {
      console.warn(`Reported file size (${fileSize}) differs from buffer length (${buffer.length}). Using buffer length.`);
    }

    // Process the file upload using the buffer
    const video = await videoService.handleFileUpload(
      id,
      buffer,
      fileName,
      buffer.length,
      mimeType
    );
    
    // Store the file hash for future duplicate checks
    await redisService.storeFileHash(fileHash, { videoId: video.id });
    
    const response: ApiResponse<Video & { fileHash: string }> = {
      status: 'success',
      data: { ...video, fileHash },
      message: 'Video uploaded successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
```

#### 4. Update Subtitle Controller

Modify `src/controllers/subtitleController.ts` to update the file hash record after subtitle generation:

```typescript
import { generateFileHash } from '../utils/hashUtils';

// Inside the generateSubtitles method, after successful subtitle generation
generateSubtitles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // ... existing code ...
    
    // Use the subtitle service to generate subtitles
    const subtitle = await subtitleService.generateSubtitles(videoId, language);
    
    // Try to update the file hash record with the subtitle ID
    try {
      // Get the video to access its fileId
      const video = await videoService.getVideoById(videoId);
      
      // Get the file content
      const fileStream = await videoService.getVideoStream(video.fileId);
      const chunks: Buffer[] = [];
      
      for await (const chunk of fileStream) {
        chunks.push(Buffer.from(chunk));
      }
      
      const fileBuffer = Buffer.concat(chunks);
      const fileHash = generateFileHash(fileBuffer);
      
      // Update the hash record with the subtitle ID
      await redisService.updateFileHashWithSubtitle(fileHash, subtitle.id);
    } catch (error) {
      // Log but don't fail if updating the hash record fails
      console.warn(`Failed to update file hash record with subtitle ID: ${error}`);
    }
    
    // Construct detailed response
    const response: ApiResponse<Subtitle> = {
      status: 'success',
      data: subtitle,
      message: 'Subtitle generation completed successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    // ... existing error handling ...
  }
};
```

### Frontend Changes

#### 1. Update Video Upload Hook

Modify `ui/hooks/useVideoUpload.ts` to handle duplicate detection:

```typescript
// Add a new interface for upload result
interface UploadResult {
  id: string;
  name: string;
  size: number;
  type: string;
  isDuplicate?: boolean;
  duplicateData?: {
    videoId: string;
    subtitleId?: string;
    videoData?: any;
    subtitleData?: any;
  };
}

// Modify the uploadVideo function
const uploadVideo = useCallback(async (file: File): Promise<UploadResult | null> => {
  // ... existing validation code ...
  
  try {
    // ... existing initialization code ...
    
    // Wait for upload to complete
    const response = await uploadPromise;
    
    // Check if the response indicates a duplicate
    if (response.data && response.data.isDuplicate) {
      setIsUploading(false);
      setProgress({ percentage: 100, bytesUploaded: file.size, bytesTotal: file.size });
      
      // Return the duplicate information
      return {
        id: response.data.videoId,
        name: file.name,
        size: file.size,
        type: file.type,
        isDuplicate: true,
        duplicateData: {
          videoId: response.data.videoId,
          subtitleId: response.data.subtitleId,
          videoData: response.data.videoData,
          subtitleData: response.data.subtitleData
        }
      };
    }
    
    // ... existing success handling ...
    
    return {
      id: response.data.id,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (err) {
    // ... existing error handling ...
    return null;
  }
}, [validateFile, initializeUpload]);
```

#### 2. Update Video Upload Component

Modify `ui/components/VideoUpload/VideoUpload.tsx` to handle duplicate detection and redirection:

```typescript
// Inside the handleUpload function
const handleUpload = useCallback(async () => {
  if (!selectedFile) return;

  try {
    // Step 1: Upload the video
    const result = await uploadVideo(selectedFile.file);
    
    if (!result) return;
    
    // Check if the result indicates a duplicate
    if (result.isDuplicate && result.duplicateData) {
      setUploadSuccess(true);
      
      // Store the duplicate data in the navigation context
      setVideoUploaded({
        id: result.duplicateData.videoId,
        name: result.name,
        isDuplicate: true
      });
      
      if (result.duplicateData.subtitleId) {
        setSubtitlesGenerated({
          id: result.duplicateData.subtitleId,
          videoId: result.duplicateData.videoId,
          isDuplicate: true
        });
        
        // Skip subtitle generation and go directly to preview
        goToNextStep();
        return;
      }
      
      // If no subtitle exists yet, proceed with normal subtitle generation
      setVideoId(result.duplicateData.videoId);
      handleGenerateSubtitles(result.duplicateData.videoId);
      return;
    }
    
    // ... existing code for non-duplicate case ...
  } catch (err) {
    console.error("Upload failed:", err);
    // Error is already handled by the hook
  }
}, [selectedFile, uploadVideo, generateSubtitles, goToNextStep, setVideoUploaded, setSubtitlesGenerated]);
```

#### 3. Update Navigation Context

Ensure the `NavigationContext` can handle duplicate information:

```typescript
// In ui/contexts/NavigationContext.tsx
interface VideoInfo {
  id: string;
  name: string;
  isDuplicate?: boolean;
}

interface SubtitleInfo {
  id: string;
  videoId: string;
  isDuplicate?: boolean;
}

// Make sure the context provider handles this information correctly
```

## Implementation Steps

Follow these steps to implement the deduplication feature:

1. **Create Utility File**:
   - Create `src/utils/hashUtils.ts` with the `generateFileHash` function

2. **Update Redis Service**:
   - Add the new methods to `src/services/redisService.ts`:
     - `storeFileHash`
     - `getVideoByFileHash`
     - `updateFileHashWithSubtitle`

3. **Modify Video Controller**:
   - Update `src/controllers/videoController.ts` to:
     - Generate file hash during upload
     - Check for duplicates
     - Return duplicate information if found
     - Store hash for new uploads

4. **Update Subtitle Controller**:
   - Modify `src/controllers/subtitleController.ts` to:
     - Update file hash records after subtitle generation

5. **Update Frontend Hook**:
   - Modify `ui/hooks/useVideoUpload.ts` to:
     - Handle duplicate detection in the response
     - Return duplicate information to the component

6. **Update Frontend Component**:
   - Modify `ui/components/VideoUpload/VideoUpload.tsx` to:
     - Handle duplicate detection
     - Store duplicate information in the navigation context
     - Navigate to the media preview page

7. **Test the Implementation**:
   - Test with various video files
   - Verify duplicate detection works correctly
   - Ensure redirection to media preview works seamlessly

## Testing

To test the deduplication feature:

1. **Upload a New Video**:
   - Upload a video file that hasn't been processed before
   - Verify it's processed normally
   - Generate subtitles for the video

2. **Upload the Same Video Again**:
   - Upload the exact same video file
   - Verify the duplicate is detected
   - Verify you're redirected to the media preview page
   - Verify the existing video and subtitles are loaded

3. **Edge Cases**:
   - Test with very large files (close to 4GB)
   - Test with different video formats
   - Test when Redis is temporarily unavailable
   - Test when Appwrite is temporarily unavailable

## Considerations and Edge Cases

1. **Performance**:
   - Computing SHA-256 hashes for large files (up to 4GB) may impact performance
   - Consider implementing a streaming hash computation for very large files

2. **Redis Availability**:
   - The deduplication feature depends on Redis availability
   - Implement graceful fallback when Redis is unavailable

3. **Partial Uploads**:
   - Handle cases where a file was previously uploaded but subtitle generation failed
   - Ensure the hash record is updated correctly when subtitles are generated later

4. **Cache Expiration**:
   - Set appropriate expiration times for hash records
   - Consider implementing a cleanup mechanism for old hash records

5. **User Experience**:
   - Provide clear feedback to users when duplicates are detected
   - Consider adding an option to force re-upload if needed

6. **Security**:
   - Ensure file hashes cannot be manipulated to access other users' content
   - Validate permissions when retrieving duplicate content

7. **Storage Considerations**:
   - Monitor Redis memory usage as hash records accumulate
   - Implement a cleanup strategy for hash records of deleted videos
