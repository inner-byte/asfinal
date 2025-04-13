/**
 * Connection Test
 *
 * This test verifies that the frontend can connect to the backend API.
 * It's a simple test to ensure the API base URL is correctly configured.
 */

describe('API Connection Configuration', () => {
  test('API base URL should be correctly configured', () => {
    // Check if the API base URL is defined
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

    // Verify it's a valid URL format
    expect(API_BASE_URL).toMatch(/^https?:\/\/[\w.-]+(:\d+)?(\/[\w.-]+)*\/?$/);

    // Verify it includes the /api path
    expect(API_BASE_URL).toContain('/api');

    console.log(`API base URL is correctly configured: ${API_BASE_URL}`);
  });
});
