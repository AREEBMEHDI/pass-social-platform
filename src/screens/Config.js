/**
 * API Configuration for Authenticated Backend
 */

export const API_CONFIG = {
  // Replace with your Flask server URL
  // Examples:
  // - Local development Android emulator: 'http://10.0.2.2:5000/api/radar'
  // - Local development iOS simulator: 'http://localhost:5000/api/radar'
  // - Production: 'https://yourdomain.com/api/radar'
  BASE_URL: 'https://cinespheres.org',
  
  // S3 or CDN base URL for profile photos
  // Example: 'https://your-bucket.s3.amazonaws.com'
  S3_BASE_URL: 'https://your-s3-bucket.s3.amazonaws.com',
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Polling interval for nearby users (milliseconds)
  POLL_INTERVAL: 5000,
};

/**
 * Demo Location Configuration
 * Replace with actual geolocation service
 */
export const DEMO_LOCATION = {
  latitude: 37.7749,  // San Francisco
  longitude: -122.4194,
};

/**
 * Get Authentication Token
 * Replace with your actual auth system
 */
export const getAuthToken = () => {
  // TODO: Get from your authentication context/redux store/AsyncStorage
  // Example implementations:
  
  // From Context:
  // const { accessToken } = useAuth();
  // return accessToken;
  
  // From AsyncStorage:
  // const token = await AsyncStorage.getItem('accessToken');
  // return token;
  
  // For now, returning a placeholder
  return 'YOUR_ACCESS_TOKEN_HERE';
};

/**
 * Get Current User ID
 * Replace with your actual auth system
 */
export const getCurrentUserId = () => {
  // TODO: Get from your authentication context/redux store
  // Example: const { userId } = useAuth();
  return 'YOUR_USER_ID_HERE';
};