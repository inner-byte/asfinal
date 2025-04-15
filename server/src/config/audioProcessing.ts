/**
 * Configuration for audio processing settings
 * Centralizes hardcoded values from subtitleService.ts and other files
 */

export const AUDIO_PROCESSING = {
  // Audio format settings
  FORMAT: 'flac' as 'flac' | 'mp3',
  FREQUENCY: 16000,
  CHANNELS: 1,
  
  // FFmpeg settings
  LOG_LEVEL: 'info' as 'quiet' | 'info' | 'verbose',
  
  // Timeout settings (in milliseconds)
  FETCH_TIMEOUT: 60000, // 60 seconds for large files
  SUBTITLE_FETCH_TIMEOUT: 15000, // 15 seconds for subtitle files
  
  // File size limits
  MAX_VIDEO_SIZE_BYTES: 4 * 1024 * 1024 * 1024, // 4GB
  
  // Gemini model name
  GEMINI_MODEL: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
};

export default AUDIO_PROCESSING;
