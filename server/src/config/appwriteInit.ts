import {
  databases,
  DATABASE_ID,
  VIDEOS_BUCKET_ID,
  SUBTITLES_BUCKET_ID,
  VIDEOS_COLLECTION_ID,
  SUBTITLES_COLLECTION_ID,
  ensureBucketExists,
  ensureCollectionExists
} from './appwrite';

/**
 * Initialize Appwrite resources (buckets, collections, attributes)
 * This ensures all necessary resources exist with proper permissions
 */
export const initializeAppwrite = async (): Promise<void> => {
  console.log('Initializing Appwrite resources...');

  try {
    // Ensure storage buckets exist
    await ensureBucketExists(
      VIDEOS_BUCKET_ID,
      'Videos Bucket'
    );

    await ensureBucketExists(
      SUBTITLES_BUCKET_ID,
      'Subtitles Bucket'
    );

    // Ensure database collections exist
    await ensureCollectionExists(
      DATABASE_ID,
      VIDEOS_COLLECTION_ID,
      'Videos Collection'
    );

    await ensureCollectionExists(
      DATABASE_ID,
      SUBTITLES_COLLECTION_ID,
      'Subtitles Collection'
    );

    // Add required attributes to the Videos collection if they don't exist
    await ensureVideosAttributes();

    // Add required attributes to the Subtitles collection if they don't exist
    await ensureSubtitlesAttributes();

    console.log('Appwrite resources initialized successfully');
  } catch (error: any) {
    console.error('Error initializing Appwrite resources:', error);
    // Don't throw, just log the error - we don't want to prevent the server from starting
  }
};

/**
 * Ensure all required attributes exist for the Videos collection
 */
async function ensureVideosAttributes(): Promise<void> {
  try {
    const attributes = await databases.listAttributes(DATABASE_ID, VIDEOS_COLLECTION_ID);

    const existingAttributes = attributes.attributes.map(attr => attr.key);

    // Create name attribute if it doesn't exist
    if (!existingAttributes.includes('name')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'name',
        255,
        true  // required
      );
      console.log('Created name attribute for Videos collection');
    }

    // Create fileSize attribute if it doesn't exist
    if (!existingAttributes.includes('fileSize')) {
      await databases.createIntegerAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'fileSize',
        true  // required
      );
      console.log('Created fileSize attribute for Videos collection');
    }

    // Create mimeType attribute if it doesn't exist
    if (!existingAttributes.includes('mimeType')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'mimeType',
        100,
        true  // required
      );
      console.log('Created mimeType attribute for Videos collection');
    }

    // Create fileId attribute if it doesn't exist
    if (!existingAttributes.includes('fileId')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'fileId',
        36,
        true  // required
      );
      console.log('Created fileId attribute for Videos collection');
    }

    // Create status attribute if it doesn't exist
    if (!existingAttributes.includes('status')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'status',
        20,
        true  // required - no default value for required attributes
      );
      console.log('Created status attribute for Videos collection');
    }

    // Create duration attribute if it doesn't exist (optional)
    if (!existingAttributes.includes('duration')) {
      await databases.createFloatAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'duration',
        false,  // not required
        undefined,   // min - no constraint
        undefined    // max - no constraint
      );
      console.log('Created duration attribute for Videos collection');
    }

    // Create videoFormat attribute if it doesn't exist (optional String)
    if (!existingAttributes.includes('videoFormat')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'videoFormat', // Correct attribute name
        50,  // Allow for various video format strings
        false  // not required
      );
      console.log('Created videoFormat attribute for Videos collection');
    }

    // Create language attribute if it doesn't exist (optional String)
    if (!existingAttributes.includes('language')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        'language',
        10,  // Language code length
        false  // not required
      );
      console.log('Created language attribute for Videos collection');
    }

    // Create videoId attribute if it doesn't exist (required String)
    // This was missing and is required by the Video type/interface
    if (!existingAttributes.includes('videoId')) {
        await databases.createStringAttribute(
            DATABASE_ID,
            VIDEOS_COLLECTION_ID,
            'videoId',
            36, // Assuming same length as fileId/documentId
            true // required
        );
        console.log('Created videoId attribute for Videos collection');
    }


  } catch (error) {
    console.error('Error ensuring Videos attributes:', error);
  }
}

/**
 * Ensure all required attributes exist for the Subtitles collection
 */
async function ensureSubtitlesAttributes(): Promise<void> {
  try {
    const attributes = await databases.listAttributes(DATABASE_ID, SUBTITLES_COLLECTION_ID);

    const existingAttributes = attributes.attributes.map(attr => attr.key);

    // Create videoId attribute if it doesn't exist
    if (!existingAttributes.includes('videoId')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'videoId',
        36,
        true  // required
      );
      console.log('Created videoId attribute for Subtitles collection');
    }

    // Create name attribute if it doesn't exist
    if (!existingAttributes.includes('name')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'name',
        255,
        true  // required
      );
      console.log('Created name attribute for Subtitles collection');
    }

    // Create format attribute if it doesn't exist
    if (!existingAttributes.includes('format')) {
      await databases.createEnumAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'format',
        ['vtt', 'srt', 'ass'],
        true  // required - no default value for required attributes
      );
      console.log('Created format attribute for Subtitles collection');
    }

    // Create fileId attribute if it doesn't exist
    if (!existingAttributes.includes('fileId')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'fileId',
        36,
        true  // required
      );
      console.log('Created fileId attribute for Subtitles collection');
    }

    // Create fileSize attribute if it doesn't exist
    if (!existingAttributes.includes('fileSize')) {
      await databases.createIntegerAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'fileSize',
        true  // required
      );
      console.log('Created fileSize attribute for Subtitles collection');
    }

    // Create mimeType attribute if it doesn't exist
    if (!existingAttributes.includes('mimeType')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'mimeType',
        100,
        true  // required
      );
      console.log('Created mimeType attribute for Subtitles collection');
    }

    // Create language attribute if it doesn't exist
    if (!existingAttributes.includes('language')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'language',
        10,
        true  // required - no default value for required attributes
      );
      console.log('Created language attribute for Subtitles collection');
    }

    // Create status attribute if it doesn't exist
    if (!existingAttributes.includes('status')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'status',
        20,
        true  // required - no default value for required attributes
      );
      console.log('Created status attribute for Subtitles collection');
    }

    // Create generatedAt attribute if it doesn't exist
    if (!existingAttributes.includes('generatedAt')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'generatedAt',
        50,  // ISO date string length
        false  // not required
      );
      console.log('Created generatedAt attribute for Subtitles collection');
    }

    // Create processingMetadata attribute if it doesn't exist
    if (!existingAttributes.includes('processingMetadata')) {
      await databases.createStringAttribute(
        DATABASE_ID,
        SUBTITLES_COLLECTION_ID,
        'processingMetadata',
        1000,  // JSON string can be long
        false  // not required
      );
      console.log('Created processingMetadata attribute for Subtitles collection');
    }

  } catch (error) {
    console.error('Error ensuring Subtitles attributes:', error);
  }
}