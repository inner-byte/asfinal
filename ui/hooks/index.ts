/**
 * Hooks Index
 *
 * This file centralizes exports for all custom hooks.
 * Using this pattern allows for cleaner imports across the application.
 *
 * Example: import { useVideoUpload, useSubtitleGeneration } from '@/hooks';
 */

export { default as useVideoUpload } from './useVideoUpload';
export type {
  UploadProgress,
  VideoFile,
  UseVideoUploadResult
} from './useVideoUpload';

export { default as useSubtitleGeneration } from './useSubtitleGeneration';
export type {
  SubtitleGenerationResult,
  UseSubtitleGenerationResult
} from './useSubtitleGeneration';
