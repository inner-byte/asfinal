/**
 * Hooks Index
 *
 * This file centralizes exports for all custom hooks.
 * Using this pattern allows for cleaner imports across the application.
 *
 * Example: import { useVideoUpload, useSubtitleSync } from '@/hooks';
 */

export { default as useVideoUpload } from './useVideoUpload';
export type {
  UploadProgress,
  VideoFile,
  UseVideoUploadResult
} from './useVideoUpload';
