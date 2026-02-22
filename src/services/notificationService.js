import { Alert } from 'react-native';
import Haptic from 'react-native-haptic-feedback';
import { connectSocket, getSocket } from '../socket';
import { API_CONFIG } from '../screens/Config';
import { acceptFriendRequest, rejectFriendRequest, getPendingFriendRequests } from '../api/friendRequests';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

let notificationHandlers = {
  onFriendRequestReceived: null,
  onFriendRequestAccepted: null,
  onFriendshipExpired: null,
};

let isInitialized = false;
let currentAccessToken = null;
let currentSocket = null;
let connectionErrorLogged = false; // Prevent spam logging

/**
 * Initialize global notification listeners
 */
export async function initializeNotifications(accessToken) {
  currentAccessToken = accessToken || currentAccessToken;
  if (isInitialized) {
    console.log('⚠️ Notifications already initialized, skipping...');
    return;
  }
  if (!accessToken) {
    console.warn('⚠️ Cannot initialize notifications: No access token');
    return;
  }

  try {
    const socket = await connectSocket(API_CONFIG.BASE_URL);
    currentSocket = socket;

    // Add connection event handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected for notifications');
      isInitialized = true;
      connectionErrorLogged = false; // Reset error logging on successful connection
    });

    socket.on('disconnect', () => {
      console.log('⚠️ WebSocket disconnected');
      isInitialized = false;
    });

    socket.on('connect_error', (error) => {
      // Only log once to prevent console spam
      if (!connectionErrorLogged) {
        console.warn('❌ WebSocket connection failed:', error.message || error);
        console.warn('ℹ️  Real-time notifications are disabled. App will work without them.');
        console.warn('ℹ️  Users can still send/receive passes - they appear after refresh.');
        connectionErrorLogged = true;
      }
      // Don't throw error, just log it - app should continue working without real-time notifications
    });

    // Listen for friend request received
    socket.on('friend_request_received', async (payload) => {
      console.log('✨ Friend request received:', payload);

      Haptic.trigger('notificationSuccess', hapticOptions);

      if (notificationHandlers.onFriendRequestReceived) {
        notificationHandlers.onFriendRequestReceived(payload);
        return;
      }

      const requesterName = payload?.requester?.display_name || 'Someone';
      const message = payload?.message || `${requesterName} sent you a pass!`;

      let requestId = null;
      if (currentAccessToken && payload?.requester?.user_id) {
        try {
          const pending = await getPendingFriendRequests(currentAccessToken);
          const match = pending?.requests?.find(
            (req) => req?.requester?.user_id === payload.requester.user_id
          );
          requestId = match?.request_id || null;
        } catch (error) {
          console.warn('Failed to resolve friend request id:', error);
        }
      }

      Alert.alert(
        '✨ New Pass!',
        message,
        [
          {
            text: 'Reject',
            style: 'destructive',
            onPress: async () => {
              if (!requestId || !currentAccessToken) return;
              try {
                await rejectFriendRequest(requestId, currentAccessToken);
              } catch (error) {
                console.warn('Reject friend request error:', error);
              }
            },
          },
          {
            text: 'Accept',
            onPress: async () => {
              if (!requestId || !currentAccessToken) return;
              try {
                await acceptFriendRequest(requestId, currentAccessToken);
              } catch (error) {
                console.warn('Accept friend request error:', error);
              }
            },
          },
        ]
      );
    });

    // Listen for friend request accepted
    socket.on('friend_request_accepted', (payload) => {
      console.log('🎉 Friend request accepted:', payload);

      Haptic.trigger('notificationSuccess', hapticOptions);

      const accepterName = payload?.user?.display_name || 'Someone';
      const message =
        payload?.message ||
        `${accepterName} accepted your pass!

You can now see each other's socials when you're both in radar.`;

      Alert.alert(
        '🎉 Pass Accepted!',
        message,
        [{ text: 'Awesome!' }]
      );

      // Call handler if registered
      if (notificationHandlers.onFriendRequestAccepted) {
        notificationHandlers.onFriendRequestAccepted(payload);
      }
    });

    // Listen for friendship expired
    socket.on('friendship_expired', (payload) => {
      console.log('⏰ Friendship expired:', payload);

      Haptic.trigger('notificationWarning', hapticOptions);

      const friendName = payload?.friend?.display_name || 'your connection';

      Alert.alert(
        '⏰ Connection Expired',
        `Your connection with ${friendName} has expired after 1 minute.

You'll need to connect again to see each other's socials.`,
        [{ text: 'Got it' }]
      );

      // Call handler if registered
      if (notificationHandlers.onFriendshipExpired) {
        notificationHandlers.onFriendshipExpired(payload);
      }
    });

    console.log('✅ Global notifications initialized');
  } catch (err) {
    console.warn('Failed to initialize notifications:', err);
  }
}

/**
 * Register handlers for notification events
 */
export function setNotificationHandlers(handlers) {
  notificationHandlers = { ...notificationHandlers, ...handlers };
}

/**
 * Clear notification handlers
 */
export function clearNotificationHandlers() {
  notificationHandlers = {
    onFriendRequestReceived: null,
    onFriendRequestAccepted: null,
    onFriendshipExpired: null,
  };
}

/**
 * Cleanup notification listeners
 */
export function cleanupNotifications() {
  if (currentSocket) {
    currentSocket.off('friend_request_received');
    currentSocket.off('friend_request_accepted');
    currentSocket.off('friendship_expired');
  }
  isInitialized = false;
  currentSocket = null;
  currentAccessToken = null;
  clearNotificationHandlers();
}

/**
 * Get current initialization status
 */
export function isNotificationsInitialized() {
  return isInitialized;
}
