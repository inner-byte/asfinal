import { ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import fs from 'fs';
import path from 'path';
import {
    storage,
    databases,
    DATABASE_ID,
    SUBTITLES_BUCKET_ID,
    SUBTITLES_COLLECTION_ID,
    createDocumentPermissions,
    createFilePermissions
} from '../config/appwrite';
import { Subtitle, SubtitleFormat, SubtitleGenerationStatus } from '../types'; // Assuming types are defined
import { AppError } from '../middleware/errorHandler';

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
        // Read the file content and create an InputFile
        const fileContent = await fs.promises.readFile(vttTempFilePath);
        const inputFile = InputFile.fromBuffer(fileContent, path.basename(vttTempFilePath));

        // Upload the file to Appwrite
        const uploadedFile = await storage.createFile(
            SUBTITLES_BUCKET_ID,
            desiredFileId,
            inputFile,
            createFilePermissions()
        );
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
    videoDuration: number
): Promise<Subtitle> {
    console.log(`[AppwriteUtils] Creating subtitle document in Appwrite Database for video ${videoId}, file ${fileId}`);
    const documentId = ID.unique(); // Generate unique ID for the document
    const subtitleDocData = {
        videoId,
        fileId,
        format: SubtitleFormat.VTT,
        language,
        generatedAt: new Date().toISOString(),
        status: SubtitleGenerationStatus.COMPLETED,
        processingMetadata: JSON.stringify({
            model: 'gemini-2.0-flash', // Consider making this dynamic
            audioFormat: 'flac',
            duration: videoDuration,
            processedAt: new Date().toISOString()
        })
    };

    try {
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
            createdAt: new Date(subtitleDoc.$createdAt),
            updatedAt: new Date(subtitleDoc.$updatedAt)
            // Include other fields from Subtitle type if necessary
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
