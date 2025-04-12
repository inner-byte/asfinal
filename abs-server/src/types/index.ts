/**
 * Video related types
 */
export interface Video {
  id: string;
  name: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  fileId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subtitle related types
 */
export interface Subtitle {
  id: string;
  videoId: string;
  format: SubtitleFormat;
  fileId: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubtitleFormat {
  VTT = 'vtt',
  SRT = 'srt',
  ASS = 'ass'
}

/**
 * Subtitle generation status
 */
export enum SubtitleGenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Generation task type
 */
export interface SubtitleGenerationTask {
  id: string;
  videoId: string;
  status: SubtitleGenerationStatus;
  progress: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Response structure
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}