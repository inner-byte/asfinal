'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useVideoUpload, useSubtitleGeneration } from '@/hooks';
import { DragDrop } from './DragDrop';
import { ProgressBar } from './ProgressBar';
import { useNavigation } from '@/contexts/NavigationContext';

/**
 * VideoUpload Component
 *
 * A component that allows users to upload video files either by drag and drop
 * or by selecting files through the file browser. Follows the "lipsync-2" design
 * with dark theme and subtle animations.
 *
 * Requirements from project_goals.md:
 * - Support videos up to 4GB in size
 * - Create glowing drop zones for uploads
 * - Provide visual feedback during interactions
 */
const VideoUpload: React.FC = () => {
  const { goToNextStep, setVideoUploaded, setSubtitlesGenerated } = useNavigation();
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [generatingSubtitles, setGeneratingSubtitles] = useState<boolean>(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  // Use our custom hook for handling video uploads
  const {
    selectedFile,
    progress,
    isUploading,
    error,
    uploadVideo,
    selectFile,
    cancelUpload,
    resetState,
    validateFile
  } = useVideoUpload();

  // Use our custom hook for subtitle generation
  const {
    isGenerating,
    error: subtitleGenerationError,
    result: subtitleResult,
    generateSubtitles
  } = useSubtitleGeneration();

  // Handle file selection from DragDrop component
  const handleFileSelected = useCallback((file: File) => {
    selectFile(file);
  }, [selectFile]);

  // Handle the upload process
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      // Step 1: Upload the video
      const result = await uploadVideo(selectedFile.file);

      if (result) {
        setUploadSuccess(true);

        // Check if this is a duplicate file
        if (result.isDuplicate && result.duplicateData) {
          console.log('Handling duplicate file:', result.duplicateData);

          // Store the video info in the navigation context
          setVideoUploaded({
            id: result.duplicateData.videoId,
            name: result.name,
            isDuplicate: true
          });

          // If subtitles already exist for this video
          if (result.duplicateData.subtitleId && result.duplicateData.subtitleData) {
            console.log('Duplicate has existing subtitles:', result.duplicateData.subtitleData);

            // Store the subtitle info in the navigation context
            setSubtitlesGenerated({
              id: result.duplicateData.subtitleId,
              videoId: result.duplicateData.videoId,
              isDuplicate: true
            });

            // Show success message briefly before redirecting
            setTimeout(() => {
              goToNextStep();
            }, 2000);
            return;
          }

          // If no subtitles exist yet, generate them
          setGeneratingSubtitles(true);
          setSubtitleError(null);

          try {
            console.log(`Generating subtitles for duplicate video ID: ${result.duplicateData.videoId}`);
            const subtitles = await generateSubtitles(result.duplicateData.videoId);

            if (subtitles) {
              console.log('Subtitle generation successful for duplicate:', subtitles);
              setSubtitlesGenerated({
                id: subtitles.id,
                videoId: result.duplicateData.videoId,
                isDuplicate: true
              });

              setTimeout(() => {
                goToNextStep();
              }, 2000);
            }
          } catch (subtitleErr) {
            console.error('Subtitle generation failed for duplicate:', subtitleErr);
            setSubtitleError(typeof subtitleErr === 'string' ? subtitleErr :
              subtitleErr instanceof Error ? subtitleErr.message : 'Failed to generate subtitles');
          } finally {
            setGeneratingSubtitles(false);
          }

          return;
        }

        // Handle normal (non-duplicate) upload
        setVideoUploaded({
          id: result.id!,
          name: result.name,
          isDuplicate: false
        });

        // Step 2: Generate subtitles automatically
        setGeneratingSubtitles(true);
        setSubtitleError(null);

        try {
          console.log(`Generating subtitles for video ID: ${result.id}`);
          const subtitles = await generateSubtitles(result.id!);

          if (subtitles) {
            console.log('Subtitle generation successful:', subtitles);
            // Update the navigation context to indicate subtitles are generated
            setSubtitlesGenerated({
              id: subtitles.id,
              videoId: result.id!,
              isDuplicate: false
            });

            // Navigate to subtitle preview after a short delay
            setTimeout(() => {
              goToNextStep();
            }, 2000);
          }
        } catch (subtitleErr) {
          console.error('Subtitle generation failed:', subtitleErr);
          setSubtitleError(typeof subtitleErr === 'string' ? subtitleErr :
            subtitleErr instanceof Error ? subtitleErr.message : 'Failed to generate subtitles');
        } finally {
          setGeneratingSubtitles(false);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
      // Error is already handled by the hook
    }
  }, [selectedFile, uploadVideo, generateSubtitles, goToNextStep, setVideoUploaded, setSubtitlesGenerated]);


  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  // Render upload success message
  const renderSuccessMessage = () => {
    if (!uploadSuccess) return null;

    // Check if we're dealing with a duplicate file
    const isDuplicate = selectedFile?.isDuplicate;

    return (
      <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--color-success-light)_15%,transparent)] border border-[var(--color-success)] rounded-md text-[var(--color-success)] text-sm flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        {isDuplicate ? 'Duplicate file detected!' : 'Upload successful!'} {generatingSubtitles ? 'Generating subtitles...' : 'Redirecting to subtitle preview...'}
      </div>
    );
  };

  // Render subtitle generation status
  const renderSubtitleStatus = () => {
    if (!uploadSuccess || (!generatingSubtitles && !isGenerating && !subtitleError && !subtitleGenerationError)) return null;

    if (generatingSubtitles || isGenerating) {
      return (
        <div className="mt-2 p-3 bg-[color-mix(in_srgb,var(--color-info-light)_15%,transparent)] border border-[var(--color-info)] rounded-md text-[var(--color-info)] text-sm flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 animate-spin"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          Generating subtitles... This may take a few minutes.
        </div>
      );
    }

    if (subtitleError || subtitleGenerationError) {
      const errorMessage = subtitleError || subtitleGenerationError;
      return (
        <div className="mt-2 p-3 bg-[color-mix(in_srgb,var(--color-error-light)_15%,transparent)] border border-[var(--color-error)] rounded-md text-[var(--color-error)] text-sm flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Subtitle generation failed: {errorMessage}
        </div>
      );
    }

    return null;
  };

  // Render styled error message
  const renderErrorMessage = () => {
    if (!error) return null;

    return (
      <div className="mt-4 p-4 bg-red-900/30 border border-red-600/50 rounded-lg text-red-300 text-sm flex items-start shadow-md animate-fade-in">
        {/* Error Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-3 flex-shrink-0 text-red-400 mt-0.5" // Adjusted margin and alignment
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {/* Error Text */}
        <span>{error}</span>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-[var(--foreground-primary)]">
        Upload Your Video
      </h1>

      <div className="w-full max-w-4xl mx-auto">
        {selectedFile ? (
          <div className="w-full flex flex-col items-center border border-[var(--color-gray-700)] rounded-xl p-8 bg-[color-mix(in_srgb,var(--color-gray-900)_90%,black)] animate-subtle-pulse">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--color-gray-800)_90%,black)] mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-primary-400)]"
              >
                <path d="m21 8-5-5H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"></path>
                <polyline points="17 3 17 8 22 8"></polyline>
                <circle cx="12" cy="14" r="4"></circle>
                <path d="m11 13 2 2 1-1"></path>
              </svg>
            </div>

            <div className="text-[var(--foreground-primary)] font-medium mb-1 text-lg">
              {selectedFile.name}
            </div>

            <div className="text-sm text-[var(--foreground-secondary)] mb-4">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>

            {/* Show progress bar during upload */}
            {isUploading && progress && (
              <ProgressBar
                percentage={progress.percentage}
                bytesUploaded={progress.bytesUploaded}
                bytesTotal={progress.bytesTotal}
              />
            )}

            {/* Success message */}
            {renderSuccessMessage()}

            {/* Subtitle generation status */}
            {renderSubtitleStatus()}

            {/* Error message - Use the new renderer */}
            {renderErrorMessage()}

            <div className="flex gap-3 mt-6">
              {isUploading ? (
                <button
                  onClick={cancelUpload}
                  className="button button-secondary text-sm"
                  disabled={uploadSuccess}
                >
                  Cancel Upload
                </button>
              ) : (
                <>
                  <button
                    onClick={resetState}
                    className="button button-secondary text-sm"
                    disabled={uploadSuccess || generatingSubtitles || isGenerating}
                  >
                    Change File
                  </button>
                  <button
                    onClick={handleUpload}
                    className="button button-primary text-sm"
                    disabled={uploadSuccess || !selectedFile || generatingSubtitles || isGenerating}
                  >
                    Start Upload
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <DragDrop onFileSelected={handleFileSelected} validateFile={validateFile} />
        )}
      </div>
    </div>
  );
};

export default VideoUpload;