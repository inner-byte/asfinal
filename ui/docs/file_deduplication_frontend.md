# File Deduplication Frontend Implementation

## Overview

This document explains how the frontend handles duplicate file detection during the video upload process. When a user attempts to upload a video that has already been processed by the application, the system detects this and redirects the user to the existing media instead of re-uploading and re-processing the file.

## Implementation Details

### Navigation Context

The `NavigationContext` has been extended to store video and subtitle information, including duplicate status:

```typescript
// New interfaces for video and subtitle info
export interface VideoInfo {
  id: string;
  name: string;
  isDuplicate?: boolean;
}

export interface SubtitleInfo {
  id: string;
  videoId: string;
  isDuplicate?: boolean;
}

// Updated context type
type NavigationContextType = {
  // ... existing properties
  setVideoUploaded: (info: VideoInfo | boolean) => void;
  videoUploaded: boolean;
  videoInfo: VideoInfo | null;
  setSubtitlesGenerated: (info: SubtitleInfo | boolean) => void;
  subtitlesGenerated: boolean;
  subtitleInfo: SubtitleInfo | null;
};
```

The context provider now includes handlers for setting video and subtitle information:

```typescript
// Handle setting video uploaded state and info
const handleSetVideoUploaded = (info: VideoInfo | boolean) => {
  if (typeof info === 'boolean') {
    setVideoUploaded(info);
    if (!info) setVideoInfo(null);
  } else {
    setVideoUploaded(true);
    setVideoInfo(info);
  }
};

// Handle setting subtitles generated state and info
const handleSetSubtitlesGenerated = (info: SubtitleInfo | boolean) => {
  if (typeof info === 'boolean') {
    setSubtitlesGenerated(info);
    if (!info) setSubtitleInfo(null);
  } else {
    setSubtitlesGenerated(true);
    setSubtitleInfo(info);
  }
};
```

### Video Upload Hook

The `useVideoUpload` hook has been updated to handle duplicate detection responses from the server:

1. The `VideoFile` interface now includes duplicate-related properties:

```typescript
export interface VideoFile {
  // ... existing properties
  isDuplicate?: boolean;
  duplicateData?: {
    videoId: string;
    subtitleId?: string;
    videoData?: any;
    subtitleData?: any;
  };
}
```

2. The upload process now checks for duplicate detection in the server response:

```typescript
// Check if this is a duplicate detection response
if (responseData.isDuplicate === true) {
  console.log('Duplicate file detected:', responseData);
  
  resolve({
    file,
    id: responseData.videoId,
    name: file.name,
    size: file.size,
    type: file.type,
    isDuplicate: true,
    duplicateData: {
      videoId: responseData.videoId,
      subtitleId: responseData.subtitleId,
      videoData: responseData.videoData,
      subtitleData: responseData.subtitleData
    }
  });
  return;
}
```

### Video Upload Component

The `VideoUpload` component has been updated to handle duplicate files:

1. When a duplicate is detected, it stores the video info in the navigation context:

```typescript
// Check if this is a duplicate file
if (result.isDuplicate && result.duplicateData) {
  console.log('Handling duplicate file:', result.duplicateData);
  
  // Store the video info in the navigation context
  setVideoUploaded({
    id: result.duplicateData.videoId,
    name: result.name,
    isDuplicate: true
  });
  
  // If subtitles already exist for this video
  if (result.duplicateData.subtitleId && result.duplicateData.subtitleData) {
    // Store the subtitle info and redirect
    // ...
  }
  
  // If no subtitles exist yet, generate them
  // ...
}
```

2. The success message now indicates when a duplicate is detected:

```typescript
{isDuplicate ? 'Duplicate file detected!' : 'Upload successful!'} {generatingSubtitles ? 'Generating subtitles...' : 'Redirecting to subtitle preview...'}
```

### Subtitle Preview Component

The `SubtitlePreview` component has been updated to display information about duplicate files:

1. It shows a "Duplicate file" status when the video is a duplicate:

```tsx
{videoInfo.isDuplicate && (
  <>
    <div className="text-[var(--foreground-secondary)]">Status:</div>
    <div className="text-[var(--color-success)]">Duplicate file (reusing existing video)</div>
  </>
)}
```

2. It shows a "Reusing existing subtitles" status when the subtitles are from a duplicate:

```tsx
{subtitleInfo.isDuplicate && (
  <>
    <div className="text-[var(--foreground-secondary)]">Status:</div>
    <div className="text-[var(--color-success)]">Reusing existing subtitles</div>
  </>
)}
```

## User Flow

1. User selects a video file for upload
2. Frontend sends the file to the server
3. Server checks if the file is a duplicate (using SHA-256 hash)
4. If duplicate:
   - Server returns the existing video and subtitle information
   - Frontend displays a "Duplicate file detected" message
   - Frontend redirects to the subtitle preview page
   - Subtitle preview page shows the duplicate status
5. If not duplicate:
   - Normal upload and subtitle generation process continues

## Benefits

- Saves bandwidth by avoiding re-uploading files
- Saves processing time by reusing existing subtitles
- Provides a seamless user experience
- Clearly indicates when duplicates are detected

## Future Improvements

- Add an option to force re-upload of duplicate files
- Show more detailed information about the duplicate file
- Implement a visual indicator in the file list for duplicate files
- Add a history view showing all previously uploaded files
