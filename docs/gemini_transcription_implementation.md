# Gemini 2.0 Flash Transcription Implementation Plan

This document outlines the strategy for generating subtitles using Gemini 2.0 Flash via the Vertex AI API, integrating with Appwrite storage and handling large video files.

## 1. Research Summary (April 2025)

*   **Model:** Gemini 2.0 Flash (via Vertex AI) is GA and supports multimodal input, including audio.
*   **Input Method:** While the API accepts video/audio input, transcription primarily works on the audio track. For files exceeding API request size limits (likely for most extracted audio), providing input via a Google Cloud Storage (GCS) URI is the standard and recommended approach. Inline base64 data is not feasible due to size constraints.
*   **Output:** The model outputs transcribed text. Timestamps can be requested via prompting (e.g., "transcribe with timestamps"), yielding raw text with interspersed time markers (e.g., `[ 0m5s120ms ]`) that require parsing into VTT format.
*   **Audio Extraction:** Tools like FFmpeg are necessary to extract the audio track from video files before sending it to Gemini.
*   **Appwrite Integration:** Video files stored in Appwrite (`videos_bucket`) can be accessed via the Node.js SDK using `storage.getFileDownload` to get a streamable URL, suitable for piping to FFmpeg.

## 2. Chosen Approach

To handle potentially large audio files extracted from videos (up to 4GB) and avoid Gemini API inline data limits, while minimizing user-facing GCS requirements, the following backend process will be implemented:

1.  **Retrieve Video Info:** Get the video's Appwrite `fileId` from the database using `videoService.getVideoById`.
2.  **Get Video Stream:** Obtain a readable stream for the video file from Appwrite Storage (`videos_bucket`) using `storage.getFileDownload` and fetching the resulting URL.
3.  **Extract Audio Locally:** Pipe the video stream to FFmpeg (using `fluent-ffmpeg`). Configure FFmpeg to extract the audio track (e.g., to FLAC format) and stream the output to a **temporary local file** on the server's filesystem.
4.  **Upload Audio to Backend GCS Bucket:** Upload the temporary local audio file to a dedicated GCS bucket managed by and accessible only to the backend application. This bucket is an *infrastructure prerequisite* for the server.
5.  **Generate GCS URI:** Construct the `gs://<your-backend-bucket-name>/<uploaded-audio-filename>` URI.
6.  **Call Gemini API:** Send the GCS URI of the extracted audio file to the Gemini 2.0 Flash model via the Vertex AI API (`@google-cloud/vertexai` SDK), prompting for transcription with timestamps.
7.  **Process Response:** Receive the raw transcription text with timestamps from Gemini.
8.  **Format VTT:** Parse the raw text and timestamps into the standard WebVTT format.
9.  **Store VTT in Appwrite:** Upload the generated VTT content to the Appwrite `subtitles_bucket` using `storage.createFile`.
10. **Update Database:** Create or update the subtitle record in the Appwrite database, linking it to the video and storing the VTT file's `fileId`.
11. **Cleanup:** Delete the temporary local audio file and the audio file from the backend's GCS bucket.

## 3. Implementation Details & Code Examples

*(Note: These are conceptual examples and require error handling, configuration management, and integration into existing services like `SubtitleService`.)*

### 3.1. Dependencies

Ensure these are installed:

*   `@google-cloud/vertexai`
*   `@google-cloud/storage` (For uploading audio to the backend's GCS bucket)
*   `fluent-ffmpeg`
*   `node-fetch` (or use Node's built-in `https`)
*   `@types/fluent-ffmpeg`

FFmpeg must be installed on the server environment where the backend runs.

### 3.2. Audio Extraction Utility (`/server/src/utils/ffmpegUtils.ts` - New File)

```typescript
// filepath: /server/src/utils/ffmpegUtils.ts
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Extracts audio from a video stream and saves it to a temporary local file.
 * @param videoStream Readable stream of the video file.
 * @param outputFormat Desired audio format (e.g., 'flac', 'mp3'). Recommended: 'flac' for quality.
 * @returns Promise resolving with the path to the temporary audio file and its MIME type.
 * @throws AppError if extraction fails.
 */
export async function extractAudioToTempFile(
  videoStream: Readable,
  outputFormat: 'flac' | 'mp3' = 'flac'
): Promise<{ tempFilePath: string; mimeType: string }> {
  const tempDir = os.tmpdir();
  const tempFileName = `audio_${Date.now()}.${outputFormat}`;
  const tempFilePath = path.join(tempDir, tempFileName);
  const mimeType = `audio/${outputFormat}`;

  return new Promise((resolve, reject) => {
    ffmpeg(videoStream)
      .noVideo() // Disable video processing
      .audioCodec(outputFormat === 'flac' ? 'flac' : 'libmp3lame') // Set codec
      .audioFrequency(16000) // Optional: Standard frequency for speech models
      .audioChannels(1) // Optional: Mono channel often sufficient
      .format(outputFormat)
      .output(tempFilePath)
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg Error:', err.message);
        console.error('FFmpeg stderr:', stderr);
        // Clean up potentially partially created file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        reject(new Error(`FFmpeg failed: ${err.message}`));
      })
      .on('end', (stdout, stderr) => {
        console.log('FFmpeg finished successfully.');
        console.log(`Temporary audio file created at: ${tempFilePath}`);
        if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
            reject(new Error(`FFmpeg completed but output file is missing or empty: ${tempFilePath}`));
        } else {
            resolve({ tempFilePath, mimeType });
        }
      })
      .run(); // Start processing
  });
}

/**
 * Cleans up (deletes) a temporary file.
 * @param filePath Path to the file to delete.
 */
export function cleanupTempFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up temporary file: ${filePath}`);
    } catch (error: any) {
      console.warn(`Failed to clean up temporary file ${filePath}: ${error.message}`);
    }
  } else {
    console.warn(`Attempted to clean up non-existent file: ${filePath}`);
  }
}

```

### 3.3. GCS Upload Utility (`/server/src/utils/gcsUtils.ts` - New File)

```typescript
// filepath: /server/src/utils/gcsUtils.ts
import { Storage } from '@google-cloud/storage';
import path from 'path';

// Initialize GCS Storage client
// Ensure GOOGLE_APPLICATION_CREDENTIALS is set in the environment
const storage = new Storage();
const BUCKET_NAME = process.env.BACKEND_GCS_BUCKET_NAME || ''; // Add this to your .env

if (!BUCKET_NAME) {
  console.error('Error: BACKEND_GCS_BUCKET_NAME environment variable is not set.');
  // Potentially throw an error or exit if this is critical at startup
}

/**
 * Uploads a local file to the backend's GCS bucket.
 * @param localPath Path to the local file.
 * @param destinationFileName Optional desired name for the file in GCS. Defaults to local filename.
 * @returns Promise resolving with the GCS URI (gs://...).
 * @throws Error if upload fails or bucket name is not configured.
 */
export async function uploadToGcs(localPath: string, destinationFileName?: string): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('Backend GCS bucket name is not configured.');
  }

  const effectiveDestination = destinationFileName || path.basename(localPath);

  try {
    console.log(`Uploading ${localPath} to gs://${BUCKET_NAME}/${effectiveDestination}...`);
    await storage.bucket(BUCKET_NAME).upload(localPath, {
      destination: effectiveDestination,
      // Optional: set metadata, e.g., contentType
    });
    const gcsUri = `gs://${BUCKET_NAME}/${effectiveDestination}`;
    console.log(`File uploaded successfully to ${gcsUri}`);
    return gcsUri;
  } catch (error: any) {
    console.error(`GCS Upload Error: Failed to upload ${localPath} to ${BUCKET_NAME}.`, error);
    throw new Error(`GCS upload failed: ${error.message}`);
  }
}

/**
 * Deletes a file from the backend's GCS bucket.
 * @param fileName The name of the file in the GCS bucket.
 * @returns Promise resolving when deletion is complete.
 */
export async function deleteFromGcs(fileName: string): Promise<void> {
  if (!BUCKET_NAME) {
    console.warn('Backend GCS bucket name is not configured. Skipping deletion.');
    return;
  }
  try {
    console.log(`Deleting gs://${BUCKET_NAME}/${fileName}...`);
    await storage.bucket(BUCKET_NAME).file(fileName).delete();
    console.log(`File ${fileName} deleted successfully from GCS.`);
  } catch (error: any) {
    // Log error but don't necessarily throw, cleanup failure might not be critical
    console.error(`GCS Deletion Error: Failed to delete ${fileName} from ${BUCKET_NAME}.`, error);
  }
}
```

## 4. Error Handling & Retries

*   **FFmpeg:** Wrap extraction in try/catch, check for non-zero exit codes or errors emitted by `fluent-ffmpeg`. Log stderr. Implement cleanup of partial files on failure.
*   **GCS Upload/Delete:** Wrap calls in try/catch. Log errors. Deletion failures should be logged but might not be critical to halt the process.
*   **Gemini API:** Implement retry logic (e.g., exponential backoff using a library like `async-retry`) for transient network errors or rate limits (HTTP 429, 5xx). For persistent errors (4xx), log details and fail gracefully. Parse API error responses for details.
*   **VTT Formatting:** Add checks in `formatRawTranscriptionToVTT` for unexpected input formats from Gemini. Handle cases with no timestamps or malformed timestamps gracefully.
*   **Appwrite:** Use try/catch for all SDK calls (database, storage). Handle specific Appwrite errors (e.g., document not found, permission denied).
*   **Overall:** Use the existing `AppError` class and `errorHandler` middleware. Update video status to 'failed' in the database on unrecoverable errors.

## 5. Frontend Integration for User Review

The backend process described above generates and stores the VTT subtitle file. To enable user review as required by the project goals (`#file:project_goals.md`), the frontend application (`ui` repository) will perform the following steps:

1.  **Trigger Generation:** The user initiates subtitle generation for a specific video via the UI (e.g., on the `app/video-upload/page.tsx` or a dedicated dashboard). This calls the backend endpoint `POST /api/videos/:videoId/subtitles`.
    *   *(Phase 5 Consideration):* If generation is moved to a background job, the UI will need to poll a status endpoint or use WebSockets to know when generation is complete.
2.  **Navigate to Preview:** Once generation is complete (or if subtitles already exist), the user navigates to the preview page (e.g., `app/subtitle-preview/[videoId]/page.tsx`).
3.  **Fetch Video Source:** The frontend fetches the streamable URL for the original video file from the backend (e.g., via an endpoint like `GET /api/videos/:videoId/playback`).
4.  **Fetch Subtitle Metadata:** The frontend calls `GET /api/videos/:videoId/subtitles` to get the subtitle document, which includes the `fileId` for the generated VTT file.
5.  **Fetch Subtitle Content:** Using the `fileId` obtained, the frontend calls `GET /api/subtitles/content/:fileId` (or a refined endpoint like `GET /api/videos/:videoId/subtitles/content`) to retrieve the actual VTT text content.
6.  **Configure Plyr:** The `components/SubtitlePreview/PlyrPlayer.tsx` component is initialized with:
    *   The video source URL.
    *   The fetched VTT content, typically loaded as a Blob URL or directly configured if Plyr's API allows. Plyr handles rendering the video and overlaying the subtitles based on the VTT timestamps.
7.  **User Review:** The user can now play the video within the Plyr player and see the generated subtitles displayed in real-time, allowing them to review the accuracy and timing.

This separation ensures the backend handles the heavy processing, while the frontend focuses on retrieving the necessary assets (video and VTT) and presenting them to the user for review using the designated Plyr player.

## 6. Future Considerations (Phase 5 & Beyond)

*   **Background Jobs:** The `generateSubtitles` service method is long-running and *must* be moved to a background job queue (e.g., using Redis/BullMQ, to be implemented in Phase 5) to avoid blocking requests and timeouts. The API controller should enqueue the job and return a 202 Accepted status with a task ID. Separate endpoints will be needed to check job status/progress. <!-- Restored "(Redis/Bull)" -->
*   **Progress Updates:** The background job should update progress (e.g., 'extracting_audio', 'uploading_audio', 'transcribing', 'formatting', 'saving') in the database or via Redis, which the frontend can poll. <!-- Restored "Redis or" -->
*   **Scalability:** Using a backend GCS bucket allows leveraging GCS's scalability for intermediate audio storage. Ensure appropriate lifecycle rules are set on the bucket to manage costs.
*   **Language Detection:** Implement language detection (either via Gemini if supported, or a separate tool) instead of hardcoding 'en'.
*   **Advanced VTT:** Explore Gemini features or post-processing for speaker diarization or more advanced VTT features if needed.
*   **Subtitle Editing:** Future phases might include UI elements for users to directly edit the fetched VTT content within the preview interface.

This plan provides a robust way to integrate Gemini transcription while managing large files and dependencies. Remember to add comprehensive logging and testing throughout the implementation.
