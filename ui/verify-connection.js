/**
 * Verify Connection Script
 * 
 * This script verifies that the frontend can connect to the backend API.
 * It makes a simple HTTP request to the backend API and checks the response.
 */

const http = require('http');
const https = require('https');

// API base URL (same as used in the application)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

console.log('Verifying connection to backend API...');
console.log(`API base URL: ${API_BASE_URL}`);

// Parse the URL
const url = new URL(API_BASE_URL);
const protocol = url.protocol === 'https:' ? https : http;
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname.replace(/\/api$/, '/health'), // Use health check endpoint
  method: 'GET'
};

console.log(`Making request to: ${url.protocol}//${options.hostname}:${options.port}${options.path}`);

// Make the request
const req = protocol.request(options, (res) => {
  console.log(`Status code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', response);
      
      if (res.statusCode === 200 && response.status === 'ok') {
        console.log('\n✅ Successfully connected to backend API');
      } else {
        console.log('\n❌ Failed to connect to backend API');
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('\n❌ Failed to connect to backend API');
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error);
  console.log('\n❌ Failed to connect to backend API');
});

req.end();
