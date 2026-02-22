import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Authentication Context for managing user authentication state
 * 
 * Install required package:
 * npm install @react-native-async-storage/async-storage
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Load token from storage on app start
    loadAuthData();
  }, []);

  /**
   * Load authentication data from AsyncStorage
   */
  const loadAuthData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const uid = await AsyncStorage.getItem('userId');
      const userData = await AsyncStorage.getItem('userData');

      if (token && uid) {
        setAccessToken(token);
        setUserId(uid);
        setUser(userData ? JSON.parse(userData) : null);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user and store credentials
   * @param {string} token - Access token from backend
   * @param {string} uid - User ID
   * @param {object} userData - User profile data
   */
  const login = async (token, uid, userData = null) => {
    try {
      await AsyncStorage.setItem('accessToken', token);
      await AsyncStorage.setItem('userId', uid);
      
      if (userData) {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      }

      setAccessToken(token);
      setUserId(uid);
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error('Failed to save auth data:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Logout user and clear credentials
   */
  const logout = async () => {
    try {
      // Call backend to remove user from location tracking
      if (accessToken) {
        try {
          await fetch('https://cinespheres.org/remove_user_location', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });
        } catch (err) {
          console.warn('Failed to cleanup location:', err);
        }
      }

      // Clear local storage
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userData');

      setAccessToken(null);
      setUserId(null);
      setUser(null);
      setIsAuthenticated(false);

      return { success: true };
    } catch (error) {
      console.error('Failed to logout:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Update access token (e.g., after refresh)
   */
  const updateToken = async (newToken) => {
    try {
      await AsyncStorage.setItem('accessToken', newToken);
      setAccessToken(newToken);
      return { success: true };
    } catch (error) {
      console.error('Failed to update token:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Update user data
   */
  const updateUser = async (userData) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Failed to update user data:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Check if token is valid (basic check)
   * For production, implement proper token validation with expiry check
   */
  const isTokenValid = () => {
    return accessToken !== null && accessToken !== '';
  };

  const value = {
    // State
    accessToken,
    userId,
    user,
    loading,
    isAuthenticated,

    // Methods
    login,
    logout,
    updateToken,
    updateUser,
    isTokenValid,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 * Usage: const { accessToken, userId, login, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * HOC to protect routes that require authentication
 * Usage: export default withAuth(YourComponent);
 */
export const withAuth = (Component) => {
  return (props) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return null; // Or show loading screen
    }

    if (!isAuthenticated) {
      // Redirect to login screen
      props.navigation.replace('Login');
      return null;
    }

    return <Component {...props} />;
  };
};

export default AuthContext;