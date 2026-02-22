/**
 * Friend Request API Helper
 * Handles all friend request operations with the Flask backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../screens/Config';

/**
 * Send a friend request/pass to another user
 * @param {string} targetUserId - The user ID to send request to
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} Response data
 */
export const sendFriendRequest = async (targetUserId, accessToken) => {
  if (!targetUserId || !accessToken) {
    throw new Error('Missing required parameters');
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/friend_requests/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_user_id: targetUserId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Send friend request error:', error);
    throw error;
  }
};

/**
 * Accept a friend request
 * @param {number} requestId - The friend request ID to accept
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} Response data
 */
export const acceptFriendRequest = async (requestId, accessToken) => {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/friend_requests/accept/${requestId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to accept friend request');
    }

    return data;
  } catch (error) {
    console.error('Accept friend request error:', error);
    throw error;
  }
};

/**
 * Reject a friend request
 * @param {number} requestId - The friend request ID to reject
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} Response data
 */
export const rejectFriendRequest = async (requestId, accessToken) => {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/friend_requests/reject/${requestId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to reject friend request');
    }

    return data;
  } catch (error) {
    console.error('Reject friend request error:', error);
    throw error;
  }
};

/**
 * Get all pending friend requests
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} Response data with pending requests
 */
export const getPendingFriendRequests = async (accessToken) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/friend_requests/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get pending requests');
    }

    return data;
  } catch (error) {
    console.error('Get pending requests error:', error);
    throw error;
  }
};

/**
 * Get all friends list
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} Response data with friends list
 */
export const getFriends = async (accessToken) => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/friends`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get friends');
    }

    return data;
  } catch (error) {
    console.error('Get friends error:', error);
    throw error;
  }
};

/**
 * Check if two users are friends
 * @param {string} userId - The user ID to check friendship with
 * @param {string} accessToken - Authentication token
 * @returns {Promise<boolean>} True if friends, false otherwise
 */
export const areFriends = async (userId, accessToken) => {
  try {
    const friendsData = await getFriends(accessToken);
    return friendsData.friends?.some((friend) => friend.user_id === userId) || false;
  } catch (error) {
    console.error('Check friendship error:', error);
    return false;
  }
};
