import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import AUDIO_PROCESSING from '../config/audioProcessing';

// Promisify fs functions for async usage
const fsAccess = promisify(fs.access);
const fsStat = promisify(fs.stat);
const fsUnlink = promisify(fs.unlink);

/**
 * Extracts audio from a video stream and saves it to a temporary local file.
 * @param videoStream Readable stream of the video file.
 * @param outputFormat Desired audio format (e.g., 'flac', 'mp3'). Recommended: 'flac' for quality.
 * @param options Additional options for audio extraction.
 * @returns Promise resolving with the path to the temporary audio file and its MIME type.
 * @throws Error if extraction fails.
 */
export async function extractAudioToTempFile(
  videoStream: Readable,
  outputFormat: 'flac' | 'mp3' = 'flac',
  options: {
    audioFrequency?: number;
    audioChannels?: number;
    logLevel?: 'quiet' | 'info' | 'verbose';
  } = {}
): Promise<{ tempFilePath: string; mimeType: string }> {
  // Configure default options
  const {
    audioFrequency = AUDIO_PROCESSING.FREQUENCY,
    audioChannels = AUDIO_PROCESSING.CHANNELS,
    logLevel = AUDIO_PROCESSING.LOG_LEVEL
  } = options;

  // Create a unique filename with timestamp and random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const tempDir = os.tmpdir();
  const tempFileName = `audio_${Date.now()}_${randomSuffix}.${outputFormat}`;
  const tempFilePath = path.join(tempDir, tempFileName);
  const mimeType = `audio/${outputFormat}`;

  return new Promise((resolve, reject) => {
    // Configure FFmpeg command
    const command = ffmpeg(videoStream)
      .noVideo() // Disable video processing
      .audioCodec(outputFormat === 'flac' ? 'flac' : 'libmp3lame') // Set codec based on format
      .audioFrequency(audioFrequency) // Standard frequency for speech recognition
      .audioChannels(audioChannels) // Mono is often sufficient for speech
      .format(outputFormat)
      .output(tempFilePath);

    // Set log level
    if (logLevel === 'quiet') {
      command.outputOptions(['-v', 'quiet']);
    } else if (logLevel === 'verbose') {
      command.outputOptions(['-v', 'verbose']);
    }

    // Handle events
    command
      .on('start', (commandLine) => {
        console.log(`[FFmpeg] Starting audio extraction: ${commandLine}`);
      })
      .on('progress', (progress) => {
        if (logLevel !== 'quiet' && progress.percent) {
          console.log(`[FFmpeg] Processing: ${Math.round(progress.percent)}% done`);
        }
      })
      .on('error', async (err, _stdout, stderr) => {
        console.error('[FFmpeg] Error:', err.message);
        if (stderr) {
          console.error('[FFmpeg] stderr:', stderr);
        }

        // Clean up potentially partially created file
        await cleanupTempFile(tempFilePath);

        reject(new Error(`FFmpeg audio extraction failed: ${err.message}`));
      })
      .on('end', async () => {
        console.log(`[FFmpeg] Audio extraction completed: ${tempFilePath}`);

        try {
          // Verify the file exists and has content using async methods
          try {
            await fsAccess(tempFilePath, fs.constants.F_OK);
          } catch (accessError) {
            reject(new Error(`FFmpeg completed but output file is missing: ${accessError.message}`));
            return;
          }

          try {
            const fileStats = await fsStat(tempFilePath);
            if (fileStats.size === 0) {
              await cleanupTempFile(tempFilePath);
              reject(new Error('FFmpeg completed but output file is empty'));
              return;
            }
          } catch (statError) {
            reject(new Error(`FFmpeg completed but failed to check file size: ${statError.message}`));
            return;
          }

          resolve({ tempFilePath, mimeType });
        } catch (error: any) {
          console.error(`[FFmpeg] Error verifying output file: ${error.message}`);
          await cleanupTempFile(tempFilePath);
          reject(new Error(`FFmpeg output verification failed: ${error.message}`));
        }
      })
      .run(); // Start processing
  });
}

/**
 * Cleans up (deletes) a temporary file.
 * @param filePath Path to the file to delete.
 * @returns Promise that resolves when the file is deleted or if it doesn't exist
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  if (!filePath) {
    console.warn('[FFmpeg] Attempted to clean up with empty file path');
    return;
  }

  try {
    // Check if file exists using promisified fs.access
    try {
      await fsAccess(filePath, fs.constants.F_OK);
    } catch (accessError) {
      // File doesn't exist, no need to delete
      console.warn(`[FFmpeg] Attempted to clean up non-existent file: ${filePath}`);
      return;
    }

    // Delete the file using promisified fs.unlink
    await fsUnlink(filePath);
    console.log(`[FFmpeg] Cleaned up temporary file: ${filePath}`);
  } catch (error: any) {
    console.warn(`[FFmpeg] Failed to clean up temporary file ${filePath}: ${error.message}`);
    // Don't throw the error to avoid breaking the application flow
    // The calling code should continue even if cleanup fails
  }
}

/**
 * Extracts audio from a video stream.
 * This is an alias for extractAudioToTempFile for backward compatibility.
 *
 * @param videoStream Readable stream of the video file.
 * @param outputFormat Desired audio format (e.g., 'flac', 'mp3').
 * @param options Additional options for audio extraction.
 * @returns Promise resolving with the path to the temporary audio file and its MIME type.
 */
export async function extractAudio(
  videoStream: Readable,
  outputFormat: 'flac' | 'mp3' = 'flac',
  options: {
    audioFrequency?: number;
    audioChannels?: number;
    logLevel?: 'quiet' | 'info' | 'verbose';
  } = {}
): Promise<{ tempFilePath: string; mimeType: string }> {
  return extractAudioToTempFile(videoStream, outputFormat, options);
}

/**
 * Sets FFmpeg and FFprobe paths manually if provided in environment variables.
 * This is especially important for Node.js 18+ environments where FFmpeg might not be in PATH.
 */
export function configureFFmpegPaths(): void {
  const ffmpegPath = process.env.FFMPEG_PATH;
  const ffprobePath = process.env.FFPROBE_PATH;

  if (ffmpegPath) {
    console.log(`[FFmpeg] Setting FFmpeg path to: ${ffmpegPath}`);
    ffmpeg.setFfmpegPath(ffmpegPath);
  }

  if (ffprobePath) {
    console.log(`[FFmpeg] Setting FFprobe path to: ${ffprobePath}`);
    ffmpeg.setFfprobePath(ffprobePath);
  }
}

// Initialize FFmpeg paths when this module is imported
configureFFmpegPaths();