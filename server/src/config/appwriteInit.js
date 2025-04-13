"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAppwrite = void 0;
const appwrite_1 = require("./appwrite");
/**
 * Initialize Appwrite resources (buckets, collections, attributes)
 * This ensures all necessary resources exist with proper permissions
 */
const initializeAppwrite = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Initializing Appwrite resources...');
    try {
        // Ensure storage buckets exist
        yield (0, appwrite_1.ensureBucketExists)(appwrite_1.VIDEOS_BUCKET_ID, 'Videos Bucket');
        yield (0, appwrite_1.ensureBucketExists)(appwrite_1.SUBTITLES_BUCKET_ID, 'Subtitles Bucket');
        // Ensure database collections exist
        yield (0, appwrite_1.ensureCollectionExists)(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'Videos Collection');
        yield (0, appwrite_1.ensureCollectionExists)(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, 'Subtitles Collection');
        // Add required attributes to the Videos collection if they don't exist
        yield ensureVideosAttributes();
        // Add required attributes to the Subtitles collection if they don't exist
        yield ensureSubtitlesAttributes();
        console.log('Appwrite resources initialized successfully');
    }
    catch (error) {
        console.error('Error initializing Appwrite resources:', error);
        // Don't throw, just log the error - we don't want to prevent the server from starting
    }
});
exports.initializeAppwrite = initializeAppwrite;
/**
 * Ensure all required attributes exist for the Videos collection
 */
function ensureVideosAttributes() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const attributes = yield appwrite_1.databases.listAttributes(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID);
            const existingAttributes = attributes.attributes.map(attr => attr.key);
            // Create name attribute if it doesn't exist
            if (!existingAttributes.includes('name')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'name', 255, true // required
                );
                console.log('Created name attribute for Videos collection');
            }
            // Create fileSize attribute if it doesn't exist
            if (!existingAttributes.includes('fileSize')) {
                yield appwrite_1.databases.createIntegerAttribute(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'fileSize', true // required
                );
                console.log('Created fileSize attribute for Videos collection');
            }
            // Create mimeType attribute if it doesn't exist
            if (!existingAttributes.includes('mimeType')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'mimeType', 100, true // required
                );
                console.log('Created mimeType attribute for Videos collection');
            }
            // Create fileId attribute if it doesn't exist
            if (!existingAttributes.includes('fileId')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'fileId', 36, true // required
                );
                console.log('Created fileId attribute for Videos collection');
            }
            // Create status attribute if it doesn't exist
            if (!existingAttributes.includes('status')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'status', 20, true // required - no default value for required attributes
                );
                console.log('Created status attribute for Videos collection');
            }
            // Create duration attribute if it doesn't exist (optional)
            if (!existingAttributes.includes('duration')) {
                yield appwrite_1.databases.createFloatAttribute(appwrite_1.DATABASE_ID, appwrite_1.VIDEOS_COLLECTION_ID, 'duration', false, // not required
                undefined, // min - no constraint
                undefined // max - no constraint
                );
                console.log('Created duration attribute for Videos collection');
            }
        }
        catch (error) {
            console.error('Error ensuring Videos attributes:', error);
        }
    });
}
/**
 * Ensure all required attributes exist for the Subtitles collection
 */
function ensureSubtitlesAttributes() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const attributes = yield appwrite_1.databases.listAttributes(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID);
            const existingAttributes = attributes.attributes.map(attr => attr.key);
            // Create videoId attribute if it doesn't exist
            if (!existingAttributes.includes('videoId')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, 'videoId', 36, true // required
                );
                console.log('Created videoId attribute for Subtitles collection');
            }
            // Create format attribute if it doesn't exist
            if (!existingAttributes.includes('format')) {
                yield appwrite_1.databases.createEnumAttribute(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, 'format', ['vtt', 'srt', 'ass'], true // required - no default value for required attributes
                );
                console.log('Created format attribute for Subtitles collection');
            }
            // Create fileId attribute if it doesn't exist
            if (!existingAttributes.includes('fileId')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, 'fileId', 36, true // required
                );
                console.log('Created fileId attribute for Subtitles collection');
            }
            // Create language attribute if it doesn't exist
            if (!existingAttributes.includes('language')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, 'language', 10, true // required - no default value for required attributes
                );
                console.log('Created language attribute for Subtitles collection');
            }
            // Create status attribute if it doesn't exist
            if (!existingAttributes.includes('status')) {
                yield appwrite_1.databases.createStringAttribute(appwrite_1.DATABASE_ID, appwrite_1.SUBTITLES_COLLECTION_ID, 'status', 20, true // required - no default value for required attributes
                );
                console.log('Created status attribute for Subtitles collection');
            }
        }
        catch (error) {
            console.error('Error ensuring Subtitles attributes:', error);
        }
    });
}
