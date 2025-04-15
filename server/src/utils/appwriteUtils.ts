import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { validateSubtitleDocument } from './validationUtils';
import {
    storage,
    databases,
    DATABASE_ID,
    SUBTITLES_BUCKET_ID,
    SUBTITLES_COLLECTION_ID,
    createDocumentPermissions,
    createFilePermissions
} from '../config/appwrite';
import { Subtitle, SubtitleFormat, SubtitleGenerationStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import AUDIO_PROCESSING from '../config/audioProcessing';
import retry from 'async-retry';

/**
 * Uploads a VTT file from a temporary path to Appwrite Storage.
 *
 * @param vttTempFilePath The local path to the temporary VTT file.
 * @param desiredFileId A unique ID to use for the file in Appwrite.
 * @returns The ID of the uploaded file.
 * @throws AppError if the upload fails.
 */
export async function uploadVttToAppwrite(vttTempFilePath: string, desiredFileId: string): Promise<string> {
    console.log(`[AppwriteUtils] Uploading VTT file from ${vttTempFilePath} to Appwrite Storage with ID ${desiredFileId}`);
    try {
        // Read file into buffer instead of using stream (InputFile.fromStream is not available in node-appwrite 15.0.1)
        const fileBuffer = fs.readFileSync(vttTempFilePath);
        const inputFile = InputFile.fromBuffer(
            fileBuffer,
            path.basename(vttTempFilePath)
            // Note: MIME type is automatically detected or can be inferred from the filename
        );

        // Upload the file to Appwrite with retry logic for transient errors
        const uploadedFile = await retry(
            async (bail) => {
                try {
                    return await storage.createFile(
                        SUBTITLES_BUCKET_ID,
                        desiredFileId,
                        inputFile,
                        createFilePermissions()
                    );
                } catch (error: any) {
                    // Don't retry client errors (4xx)
                    if (error.code >= 400 && error.code < 500) {
                        bail(error);
                        return null; // This will never be reached due to bail()
                    }
                    throw error; // Retry on server errors (5xx)
                }
            },
            {
                retries: 3,
                minTimeout: 1000,
                maxTimeout: 5000,
                factor: 2,
                onRetry: (error, attempt) => {
                    console.warn(`[AppwriteUtils] Retry attempt ${attempt} to upload file ${desiredFileId}: ${error.message}`);
                }
            }
        );

        if (!uploadedFile) {
            throw new Error('File upload failed after retries');
        }

        console.log(`[AppwriteUtils] VTT file uploaded successfully: ${uploadedFile.$id}`);
        return uploadedFile.$id;
    } catch (error: any) {
        console.error(`[AppwriteUtils] Failed to upload VTT file ${desiredFileId}: ${error.message}`, error.stack);
        throw new AppError(`Failed to upload VTT file to Appwrite Storage: ${error.message}`, 500);
    }
}

/**
 * Creates a subtitle document in the Appwrite Database.
 *
 * @param videoId The ID of the associated video.
 * @param fileId The ID of the uploaded VTT file in Appwrite Storage.
 * @param language The language code of the subtitle.
 * @param videoDuration The duration of the original video in seconds.
 * @returns The created Subtitle object.
 * @throws AppError if document creation fails.
 */
export async function createSubtitleDocumentInAppwrite(
    videoId: string,
    fileId: string,
    language: string,
    videoDuration: number,
    name?: string // Add optional name parameter
): Promise<Subtitle> {
    console.log(`[AppwriteUtils] Creating subtitle document in Appwrite Database for video ${videoId}, file ${fileId}`);
    const documentId = ID.unique(); // Generate unique ID for the document
    // Generate a default name if not provided
    const defaultName = `subtitle_${videoId}_${language}.vtt`;

    // Get file size information from storage if possible
    let fileSize = 0;
    try {
        const fileInfo = await storage.getFile(SUBTITLES_BUCKET_ID, fileId);
        fileSize = fileInfo.sizeOriginal;
    } catch (error) {
        console.warn(`[AppwriteUtils] Could not get file size for ${fileId}, using default value of 0`);
    }

    const subtitleDocData = {
        videoId,
        fileId,
        format: SubtitleFormat.VTT,
        language,
        name: name || defaultName, // Use provided name or default
        fileSize, // Add fileSize attribute
        mimeType: 'text/vtt', // Add mimeType attribute for VTT format
        generatedAt: new Date().toISOString(),
        status: SubtitleGenerationStatus.COMPLETED,
        processingMetadata: JSON.stringify({
            model: AUDIO_PROCESSING.GEMINI_MODEL, // Using centralized configuration
            audioFormat: 'flac',
            duration: videoDuration,
            processedAt: new Date().toISOString()
        })
    };

    try {
        // Validate the document before creating it
        validateSubtitleDocument(subtitleDocData);

        const subtitleDoc = await databases.createDocument(
            DATABASE_ID,
            SUBTITLES_COLLECTION_ID,
            documentId,
            subtitleDocData,
            createDocumentPermissions()
        );
        console.log(`[AppwriteUtils] Subtitle document created successfully: ${subtitleDoc.$id}`);

        // Map Appwrite document to Subtitle type
        return {
            id: subtitleDoc.$id,
            videoId: subtitleDoc.videoId,
            format: subtitleDoc.format as SubtitleFormat,
            fileId: subtitleDoc.fileId,
            language: subtitleDoc.language,
            name: subtitleDoc.name,
            fileSize: subtitleDoc.fileSize,
            mimeType: subtitleDoc.mimeType,
            status: subtitleDoc.status as SubtitleGenerationStatus,
            processingMetadata: subtitleDoc.processingMetadata,
            generatedAt: subtitleDoc.generatedAt ? new Date(subtitleDoc.generatedAt) : undefined,
            createdAt: new Date(subtitleDoc.$createdAt),
            updatedAt: new Date(subtitleDoc.$updatedAt)
        };
    } catch (error: any) {
        console.error(`[AppwriteUtils] Failed to create subtitle document for file ${fileId}: ${error.message}`, error.stack);
        // Attempt cleanup of the uploaded file if document creation fails? Consider implications.
        // Maybe cleanup should happen at a higher level (service layer).
        throw new AppError(`Failed to create subtitle document in Appwrite Database: ${error.message}`, 500);
    }
}

/**
 * Deletes a subtitle file from Appwrite Storage.
 *
 * @param fileId The ID of the file to delete.
 * @throws AppError if deletion fails.
 */
export async function deleteSubtitleFileFromAppwrite(fileId: string): Promise<void> {
    console.log(`[AppwriteUtils] Deleting subtitle file ${fileId} from Appwrite Storage.`);
    try {
        await storage.deleteFile(SUBTITLES_BUCKET_ID, fileId);
        console.log(`[AppwriteUtils] Successfully deleted subtitle file ${fileId}.`);
    } catch (error: any) {
        console.error(`[AppwriteUtils] Failed to delete subtitle file ${fileId}: ${error.message}`, error.stack);
        // Allow higher level to decide how to handle failed cleanup
        throw new AppError(`Failed to delete subtitle file ${fileId} from Appwrite Storage: ${error.message}`, 500);
    }
}

/**
 * Deletes a subtitle document from Appwrite Database.
 *
 * @param documentId The ID of the document to delete.
 * @throws AppError if deletion fails.
 */
export async function deleteSubtitleDocumentFromAppwrite(documentId: string): Promise<void> {
    console.log(`[AppwriteUtils] Deleting subtitle document ${documentId} from Appwrite Database.`);
    try {
        await databases.deleteDocument(DATABASE_ID, SUBTITLES_COLLECTION_ID, documentId);
        console.log(`[AppwriteUtils] Successfully deleted subtitle document ${documentId}.`);
    } catch (error: any) {
        console.error(`[AppwriteUtils] Failed to delete subtitle document ${documentId}: ${error.message}`, error.stack);
        throw new AppError(`Failed to delete subtitle document ${documentId} from Appwrite Database: ${error.message}`, 500);
    }
}
