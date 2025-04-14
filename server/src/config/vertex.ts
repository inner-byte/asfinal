import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Vertex AI configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

// Private variables to hold instances
let _vertexAI: VertexAI | null = null;
let _geminiModel: GenerativeModel | null = null;

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

/**
 * Initializes the Vertex AI client and Gemini model
 * @returns Object containing vertexAI and geminiModel instances
 * @throws Error if configuration is invalid
 */
export const initializeVertexAI = (): { vertexAI: VertexAI; geminiModel: GenerativeModel } => {
  // Validate configuration before initializing
  if (!validateVertexConfig()) {
    throw new Error('Invalid Vertex AI configuration. Check environment variables.');
  }

  // Initialize Vertex AI client if not already initialized
  if (!_vertexAI) {
    _vertexAI = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION
    });
    console.log(`Initialized Vertex AI client with project: ${PROJECT_ID}, location: ${LOCATION}`);
  }

  // Initialize Gemini model if not already initialized
  if (!_geminiModel && _vertexAI) {
    _geminiModel = _vertexAI.getGenerativeModel({
      model: MODEL_NAME,
    });
    console.log(`Initialized Gemini model: ${MODEL_NAME}`);
  }

  return {
    vertexAI: _vertexAI,
    geminiModel: _geminiModel as GenerativeModel
  };
};

/**
 * Gets the Vertex AI client, initializing it if necessary
 * @returns VertexAI instance
 */
export const getVertexAI = (): VertexAI => {
  if (!_vertexAI) {
    const { vertexAI } = initializeVertexAI();
    return vertexAI;
  }
  return _vertexAI;
};

/**
 * Gets the Gemini model, initializing it if necessary
 * @returns GenerativeModel instance
 */
export const getGeminiModel = (): GenerativeModel => {
  if (!_geminiModel) {
    const { geminiModel } = initializeVertexAI();
    return geminiModel;
  }
  return _geminiModel;
};

export {
  PROJECT_ID,
  LOCATION,
  MODEL_NAME
};