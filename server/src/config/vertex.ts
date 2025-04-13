import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Vertex AI configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

// Initialize Vertex AI client
const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION
});

// Create a generative model instance for Gemini
const geminiModel = vertexAI.getGenerativeModel({
  model: MODEL_NAME,
});

/**
 * Validates that the Vertex AI configuration is complete
 * @returns boolean - Whether the configuration is valid
 */
export const validateVertexConfig = (): boolean => {
  if (!PROJECT_ID) {
    console.error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
    return false;
  }

  if (!LOCATION) {
    console.error('GOOGLE_CLOUD_LOCATION environment variable is not set');
    return false;
  }

  if (!MODEL_NAME) {
    console.error('GEMINI_MODEL_NAME environment variable is not set');
    return false;
  }

  return true;
};

export {
  vertexAI,
  geminiModel,
  PROJECT_ID,
  LOCATION,
  MODEL_NAME
};