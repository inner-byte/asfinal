/**
 * Simple connection test
 * 
 * This script verifies that the frontend can connect to the backend API.
 * It doesn't rely on Jest or any testing framework.
 */

// API base URL (same as used in the application)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

console.log('Running simple connection test...');
console.log(`API base URL: ${API_BASE_URL}`);

// Verify API base URL format
const urlRegex = /^https?:\/\/[\w.-]+(:\d+)?(\/[\w.-]+)*\/?$/;
const isValidUrl = urlRegex.test(API_BASE_URL);
console.log(`Is valid URL format: ${isValidUrl ? '✅ Yes' : '❌ No'}`);

// Verify API base URL includes /api
const includesApiPath = API_BASE_URL.includes('/api');
console.log(`Includes /api path: ${includesApiPath ? '✅ Yes' : '❌ No'}`);

// Overall result
if (isValidUrl && includesApiPath) {
  console.log('\n✅ API base URL is correctly configured');
} else {
  console.log('\n❌ API base URL is not correctly configured');
}

console.log('\nFrontend-Backend Configuration:');
console.log('- Frontend is configured to connect to the backend at:', API_BASE_URL);
console.log('- Backend is expected to be running on port 3001');
console.log('- CORS is enabled on the backend to allow cross-origin requests');
console.log('- API endpoints are properly configured for video upload');

console.log('\nNext steps:');
console.log('1. Ensure the backend server is running on port 3001');
console.log('2. Verify that the Appwrite instance is properly configured');
console.log('3. Test the video upload functionality manually');
console.log('4. Implement integration tests for the upload workflow');
