import { ID } from 'node-appwrite'; // Keep for generating unique IDs if needed locally
import fetch from 'node-fetch'; // Keep for getSubtitleContent
import path from 'path';
import fs from 'fs'; // Keep for temp file writing/unlinking

// Import configurations (Only those needed directly by the service)
import {
  databases, // Keep for direct queries (getById, getByVideoId)
  storage, // For downloading subtitle files
  DATABASE_ID,
  SUBTITLES_COLLECTION_ID,
  SUBTITLES_BUCKET_ID, // For accessing subtitle files
} from '../config/appwrite';

// Import utilities
import { extractAudio, cleanupTempFile as cleanupFfmpegTempFile } from '../utils/ffmpegUtils';
import { uploadAudioToGcs as uploadToGcsUtil, deleteFromGcs as deleteFromGcsUtil } from '../utils/gcsUtils';
import { VttFormatter } from '../utils/VttFormatter';
import { generateTranscriptionViaGemini } from '../utils/geminiUtils';
import { prepareVideoForProcessing } from '../utils/videoProcessingUtils'; // Import new util
import {
    uploadVttToAppwrite,
    createSubtitleDocumentInAppwrite,
    deleteSubtitleFileFromAppwrite,
    deleteSubtitleDocumentFromAppwrite
} from '../utils/appwriteUtils'; // Import new util

// Import types
import { Subtitle } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Service for orchestrating subtitle generation and managing subtitle metadata.
 * Delegates I/O and processing tasks to specific utility modules.
 */
export class SubtitleService {
  /**
   * Orchestrates the generation of subtitles for a video.
   */
  async generateSubtitles(
    videoId: string,
    language: string = 'en'
  ): Promise<Subtitle> {
    console.log(`[SubtitleService] Orchestrating subtitle generation for video ${videoId}`);

    let audioTempFilePath: string | null = null;
    let gcsAudioPath: string | null = null;
    let vttTempFilePath: string | null = null;
    let uploadedVttFileId: string | null = null; // Track Appwrite file ID for cleanup on error

    try {
      // Step 1: Prepare video (validation, get stream) - Delegate
      const { video, videoStream } = await prepareVideoForProcessing(videoId);

      // Step 2: Extract audio - Delegate (assuming implementation in ffmpegUtils)
      console.log(`[SubtitleService] Requesting audio extraction...`);
      const { tempFilePath: audioPath, mimeType } = await extractAudio(videoStream, 'flac', {
          audioFrequency: 16000,
          audioChannels: 1,
          logLevel: 'info' // Or get from config
      });
      audioTempFilePath = audioPath;
      console.log(`[SubtitleService] Audio extracted to ${audioTempFilePath}`);

      // Step 3: Upload audio to GCS - Delegate (assuming implementation in gcsUtils)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const gcsFileName = `audio/${videoId}/${timestamp}.flac`;
      console.log(`[SubtitleService] Requesting audio upload to GCS as ${gcsFileName}...`);
      const gcsUri = await uploadToGcsUtil(audioTempFilePath, gcsFileName, {
          contentType: mimeType,
          metadata: { videoId: video.id, language, videoName: video.name, sourceType: 'gemini-transcription' }
      });
      gcsAudioPath = gcsFileName; // Store GCS path for cleanup
      console.log(`[SubtitleService] Audio uploaded to GCS: ${gcsUri}`);

      // Step 4: Generate transcription - Delegate
      const rawTranscription = await generateTranscriptionViaGemini(gcsUri, language);

      // Step 5: Format transcription to VTT - Delegate
      const vttContent = VttFormatter.formatRawTranscriptionToVTT(rawTranscription);
      console.log(`[SubtitleService] VTT content generated (${Math.round(vttContent.length / 1024)}KB)`);

      // Step 6: Write VTT temp file and save to Appwrite - Delegate parts
      vttTempFilePath = path.join(path.dirname(audioTempFilePath), `subtitle_${videoId}_${timestamp}.vtt`);
      const result = await this.writeVttTempFileAndSaveToAppwrite(
          videoId,
          vttTempFilePath,
          vttContent,
          language,
          video.duration || 0
      );
      uploadedVttFileId = result.fileId; // Store for potential cleanup if subsequent steps fail (though none currently)

      console.log(`[SubtitleService] Subtitle generation completed successfully for video ${videoId}. Subtitle ID: ${result.id}`);
      return result;

    } catch (error: any) {
      console.error(`[SubtitleService] Orchestration failed: ${error.message}`, error.stack);

      // Attempt to clean up Appwrite file if it was uploaded before the error occurred
      if (uploadedVttFileId) {
          console.warn(`[SubtitleService] Attempting to clean up Appwrite file ${uploadedVttFileId} due to error.`);
          try {
              await deleteSubtitleFileFromAppwrite(uploadedVttFileId);
          } catch (cleanupError: any) {
              console.error(`[SubtitleService] Failed to cleanup Appwrite file ${uploadedVttFileId}: ${cleanupError.message}`);
          }
      }

      // Re-throw error (ensure it's an AppError)
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Subtitle generation failed: ${error.message}`, 500);
    } finally {
      // Final cleanup of local and GCS resources
      await this.cleanupResources(audioTempFilePath, vttTempFilePath, gcsAudioPath);
    }
  }

  /**
   * Writes VTT content to a temporary file, then delegates upload and document creation to Appwrite utils.
   * Handles potential cleanup if Appwrite document creation fails after file upload.
   */
  private async writeVttTempFileAndSaveToAppwrite(
    videoId: string,
    vttTempFilePath: string,
    vttContent: string,
    language: string,
    videoDuration: number
  ): Promise<Subtitle> {
    // 1. Write VTT content to temporary file
    try {
      console.log(`[SubtitleService] Writing VTT content to temporary file: ${vttTempFilePath}`);
      fs.writeFileSync(vttTempFilePath, vttContent, 'utf-8');
      console.log(`[SubtitleService] Successfully wrote VTT content.`);
    } catch (error: any) {
      throw new AppError(`Failed to write VTT content to temporary file: ${error.message}`, 500);
    }

    // 2. Delegate upload and document creation to Appwrite utils
    let uploadedFileId: string | null = null;
    try {
        const uniqueFileId = ID.unique(); // Generate ID for Appwrite file
        uploadedFileId = await uploadVttToAppwrite(vttTempFilePath, uniqueFileId);

        const subtitle = await createSubtitleDocumentInAppwrite(
            videoId,
            uploadedFileId,
            language,
            videoDuration
        );
        return subtitle;
    } catch (error: any) {
        console.error(`[SubtitleService] Error during Appwrite save process: ${error.message}`);
        // If document creation failed after file upload, attempt to clean up the file
        if (uploadedFileId && !(error instanceof AppError && error.message.includes('create subtitle document'))) {
             console.warn(`[SubtitleService] Attempting cleanup of Appwrite file ${uploadedFileId} after document creation failure.`);
             try {
                 await deleteSubtitleFileFromAppwrite(uploadedFileId);
             } catch (cleanupError: any) {
                 console.error(`[SubtitleService] Failed cleanup of Appwrite file ${uploadedFileId}: ${cleanupError.message}`);
             }
        }
        // Re-throw the original error, ensuring it's an AppError
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(`Failed to save subtitle to Appwrite: ${error.message}`, 500);
    }
  }

  /**
   * Clean up temporary local files and remote GCS resources.
   * Delegates specific cleanup tasks where appropriate.
   */
  private async cleanupResources(
    audioTempFilePath: string | null,
    vttTempFilePath: string | null,
    gcsAudioPath: string | null
  ): Promise<void> {
    console.log(`[SubtitleService] Cleaning up resources...`);

    // Use Promise.allSettled to attempt all cleanups even if one fails
    const cleanupPromises = [];

    // Local audio file cleanup (delegate to ffmpegUtils if it handles its temps)
    if (audioTempFilePath) {
        cleanupPromises.push(
            (async () => {
                try {
                    await cleanupFfmpegTempFile(audioTempFilePath);
                    console.log(`[SubtitleService] Local audio temp file cleanup requested for: ${audioTempFilePath}`);
                } catch (error: any) {
                    console.warn(`[SubtitleService] Failed cleanup for audio temp file ${audioTempFilePath}: ${error.message}`);
                }
            })()
        );
    }

    // Local VTT file cleanup (handle directly with fs)
    if (vttTempFilePath && fs.existsSync(vttTempFilePath)) {
       cleanupPromises.push(
            (async () => {
                try {
                    await fs.promises.unlink(vttTempFilePath);
                    console.log(`[SubtitleService] Cleaned up local VTT temp file: ${vttTempFilePath}`);
                } catch (error: any) {
                    console.warn(`[SubtitleService] Failed to clean up local VTT temp file ${vttTempFilePath}: ${error.message}`);
                }
            })()
       );
    }

    // GCS audio file cleanup (delegate to gcsUtils)
    if (gcsAudioPath) {
        cleanupPromises.push(
            (async () => {
                try {
                    await deleteFromGcsUtil(gcsAudioPath);
                    console.log(`[SubtitleService] GCS audio file cleanup requested for: ${gcsAudioPath}`);
                } catch (error: any) {
                    console.warn(`[SubtitleService] Failed to delete GCS audio file ${gcsAudioPath}: ${error.message}`);
                }
            })()
        );
    }

    await Promise.allSettled(cleanupPromises);
    console.log(`[SubtitleService] Resource cleanup process finished.`);
  }

  // --- Methods for getting/deleting subtitles (Interact directly with DB/Storage via Appwrite SDK or Utils) ---

  async getSubtitleById(id: string): Promise<Subtitle> {
    try {
      const subtitle = await databases.getDocument(DATABASE_ID, SUBTITLES_COLLECTION_ID, id);
      return {
        id: subtitle.$id,
        videoId: subtitle.videoId,
        format: subtitle.format,
        fileId: subtitle.fileId,
        language: subtitle.language,
        createdAt: new Date(subtitle.$createdAt),
        updatedAt: new Date(subtitle.$updatedAt)
      };
    } catch (error: any) {
      throw new AppError(`Subtitle with ID ${id} not found`, 404);
    }
  }

  async getSubtitlesByVideoId(videoId: string): Promise<Subtitle[]> {
     try {
      const response = await databases.listDocuments(DATABASE_ID, SUBTITLES_COLLECTION_ID, [`videoId=${videoId}`]);
      return response.documents.map(doc => ({
        id: doc.$id,
        videoId: doc.videoId,
        format: doc.format,
        fileId: doc.fileId,
        language: doc.language,
        createdAt: new Date(doc.$createdAt),
        updatedAt: new Date(doc.$updatedAt)
      }));
    } catch (error: any) {
      throw new AppError(`Failed to get subtitles for video ${videoId}`, 500);
    }
  }

  async getSubtitleContent(fileId: string): Promise<string> {
    try {
        const fileUrl = await storage.getFileDownload(SUBTITLES_BUCKET_ID, fileId);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(fileUrl.toString(), { signal: controller.signal });
            if (!response.ok) {
                throw new AppError(`Failed to download subtitle file: ${response.statusText} (${response.status})`, response.status);
            }
            return await response.text();
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error: any) {
        throw new AppError(`Failed to get subtitle content for file ${fileId}`, 500);
    }
  }

  async deleteSubtitle(id: string): Promise<void> {
    let subtitleFileId: string | null = null;
    try {
      const subtitle = await this.getSubtitleById(id);
      subtitleFileId = subtitle.fileId;

      await deleteSubtitleFileFromAppwrite(subtitleFileId);
      await deleteSubtitleDocumentFromAppwrite(id);

      console.log(`[SubtitleService] Successfully deleted subtitle ${id}`);
    } catch (error: any) {
      let errorMessage = `Failed to delete subtitle ${id}`;
      if (subtitleFileId) errorMessage += ` (file: ${subtitleFileId})`;

      if (error instanceof AppError) {
         throw new AppError(`${errorMessage}: ${error.message}`, error.statusCode);
       }
      throw new AppError(`${errorMessage}: ${error.message}`, 500);
    }
  }
}

// Export a singleton instance
export default new SubtitleService();