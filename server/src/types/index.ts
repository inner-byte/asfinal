/**
 * Video related types
 */
export interface Video {
  id: string;
  videoId?: string; // Added in previous step, ensure it's here
  name: string;
  fileSize: number;
  mimeType: string;
  format?: string; // Added in previous step, ensure it's here
  language?: string; // Add language field
  duration?: number;
  fileId: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subtitle related types
 */
/**
 * Subtitle document interface
 * Represents a subtitle document in the Appwrite database
 * All required attributes in the Appwrite schema must be included here
 */
export interface Subtitle {
  id: string;
  videoId: string;
  format: SubtitleFormat;
  fileId: string;
  language: string;
  name: string; // Required in Appwrite schema
  fileSize: number; // Required in Appwrite schema
  mimeType: string; // Required in Appwrite schema
  status: SubtitleGenerationStatus; // Required in Appwrite schema
  processingMetadata?: string; // Optional in Appwrite schema
  generatedAt?: Date; // Optional in Appwrite schema
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