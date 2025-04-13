/**
 * Video Upload Test
 *
 * This test verifies that the video upload functionality works correctly.
 * It tests the useVideoUpload hook with mocked API responses.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useVideoUpload } from '../hooks/useVideoUpload';

// Mock API base URL
const API_BASE_URL = 'http://localhost:3001/api';

// Mock fetch for API requests
global.fetch = jest.fn().mockImplementation((url) => {
  if (url === `${API_BASE_URL}/videos`) {
    return Promise.resolve({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        status: 'success',
        data: {
          id: 'mock-video-id',
          fileName: 'test-video.mp4',
          fileSize: 1024,
          mimeType: 'video/mp4',
          createdAt: new Date().toISOString()
        },
        message: 'Upload initialized successfully'
      })
    });
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'success' })
  });
}) as jest.Mock;

// Mock XMLHttpRequest for file uploads
class MockXMLHttpRequest {
  open = jest.fn();
  send = jest.fn(() => {
    // Simulate upload progress
    setTimeout(() => {
      if (this.upload.onprogress) {
        this.upload.onprogress({ lengthComputable: true, loaded: 512, total: 1024 } as ProgressEvent);
      }

      // Simulate upload completion
      setTimeout(() => {
        if (this.upload.onprogress) {
          this.upload.onprogress({ lengthComputable: true, loaded: 1024, total: 1024 } as ProgressEvent);
        }

        // Simulate load event
        if (this.onload) {
          this.onload(new Event('load'));
        }
      }, 100);
    }, 100);
  });
  abort = jest.fn();
  setRequestHeader = jest.fn();
  upload = {
    onprogress: null as any,
    addEventListener: jest.fn((event, handler) => {
      if (event === 'progress') {
        this.upload.onprogress = handler;
      }
    })
  };
  onload: ((ev: Event) => any) | null = null;
  onerror: ((ev: Event) => any) | null = null;
  onabort: ((ev: Event) => any) | null = null;
  status = 200;
  responseText = JSON.stringify({
    status: 'success',
    data: {
      id: 'mock-video-id',
      fileName: 'test-video.mp4',
      fileSize: 1024,
      mimeType: 'video/mp4',
      fileId: 'mock-file-id',
      url: 'https://example.com/video.mp4'
    }
  });
  addEventListener = jest.fn((event, handler) => {
    if (event === 'load') {
      this.onload = handler;
    } else if (event === 'error') {
      this.onerror = handler;
    } else if (event === 'abort') {
      this.onabort = handler;
    }
  });
}

// Replace global XMLHttpRequest with mock
global.XMLHttpRequest = MockXMLHttpRequest as any;

describe('useVideoUpload Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should validate file types correctly', () => {
    const { result } = renderHook(() => useVideoUpload());

    // Valid MP4 file
    const validFile = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
    expect(result.current.validateFile(validFile).valid).toBe(true);

    // Invalid file type
    const invalidFile = new File(['mock content'], 'test.txt', { type: 'text/plain' });
    expect(result.current.validateFile(invalidFile).valid).toBe(false);
  });

  test('should handle file selection', () => {
    const { result } = renderHook(() => useVideoUpload());

    // Select a valid file
    const validFile = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
    Object.defineProperty(validFile, 'size', { value: 1024 });

    act(() => {
      result.current.selectFile(validFile);
    });

    expect(result.current.selectedFile).not.toBeNull();
    expect(result.current.selectedFile?.name).toBe('test.mp4');

    // Reset state
    act(() => {
      result.current.resetState();
    });

    expect(result.current.selectedFile).toBeNull();
  });

  test('should initialize and upload a video', async () => {
    const { result } = renderHook(() => useVideoUpload());

    // Create a mock file
    const mockFile = new File(['mock video content'], 'test.mp4', { type: 'video/mp4' });
    Object.defineProperty(mockFile, 'size', { value: 1024 });

    // Select the file
    act(() => {
      result.current.selectFile(mockFile);
    });

    expect(result.current.selectedFile).not.toBeNull();

    // Start the upload
    let uploadPromise: Promise<any>;

    await act(async () => {
      uploadPromise = result.current.uploadVideo(mockFile);
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for mock XHR events
    });

    // Verify the upload was successful
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress?.percentage).toBe(100);
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/videos`, expect.any(Object));
  });
});
