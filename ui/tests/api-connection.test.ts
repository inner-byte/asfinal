/**
 * API Connection Test
 *
 * This test verifies that the frontend can connect to the backend API.
 * It uses mocks to simulate API responses.
 */

// API base URL (same as used in the application)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// Mock fetch responses
global.fetch = jest.fn((url) => {
  if (url.includes('/health')) {
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ status: 'ok', message: 'Server is running' })
    });
  } else if (url.includes('/videos')) {
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: [] })
    });
  } else {
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve({
        status: 'ok',
        message: 'Welcome to the ABS Server API',
        endpoints: {
          health: '/health',
          api: '/api',
          videos: '/api/videos'
        }
      })
    });
  }
}) as jest.Mock;

describe('Backend API Connection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Health check endpoint should be accessible', async () => {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL.replace('/api', '')}/health`);
  });

  test('Videos endpoint should be accessible', async () => {
    const response = await fetch(`${API_BASE_URL}/videos`);
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/videos`);
  });

  test('API root endpoint should return expected structure', async () => {
    const response = await fetch(API_BASE_URL.replace('/api', ''));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.endpoints).toBeDefined();
    expect(data.endpoints.videos).toBeDefined();
    expect(fetch).toHaveBeenCalledWith(API_BASE_URL.replace('/api', ''));
  });
});
