"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_NAME = exports.LOCATION = exports.PROJECT_ID = exports.geminiModel = exports.vertexAI = exports.validateVertexConfig = void 0;
const vertexai_1 = require("@google-cloud/vertexai");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Vertex AI configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
exports.PROJECT_ID = PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
exports.LOCATION = LOCATION;
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';
exports.MODEL_NAME = MODEL_NAME;
// Initialize Vertex AI client
const vertexAI = new vertexai_1.VertexAI({
    project: PROJECT_ID,
    location: LOCATION
});
exports.vertexAI = vertexAI;
// Create a generative model instance for Gemini
const geminiModel = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
});
exports.geminiModel = geminiModel;
/**
 * Validates that the Vertex AI configuration is complete
 * @returns boolean - Whether the configuration is valid
 */
const validateVertexConfig = () => {
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
exports.validateVertexConfig = validateVertexConfig;
