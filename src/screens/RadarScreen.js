import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Easing,
  AppState,
  PanResponder,
  StatusBar,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import Haptic from 'react-native-haptic-feedback';
import { useIsFocused } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { API_CONFIG } from './Config';
import { getSocket } from '../socket';

const { width } = Dimensions.get('window');

/* ---------- CONFIGURATION ---------- */
const API_BASE_URL = API_CONFIG.BASE_URL;

/* ---------- SIZES ---------- */
const RADAR_SIZE = Math.min(360, width * 0.88);
const CENTER = RADAR_SIZE / 2;
const MAX_RADIUS = RADAR_SIZE * 0.38;

const SLIDER_WIDTH = width * 0.86;
const SLIDER_HEIGHT = 56;
const KNOB_SIZE = 44;

const PARTICLES = [
  { id: 'p1', x: 0.18, y: 0.22, s: 3 },
  { id: 'p2', x: 0.78, y: 0.18, s: 2 },
  { id: 'p3', x: 0.28, y: 0.74, s: 2 },
  { id: 'p4', x: 0.64, y: 0.7, s: 3 },
  { id: 'p5', x: 0.12, y: 0.58, s: 2 },
  { id: 'p6', x: 0.86, y: 0.48, s: 2 },
];

/* ---------- HAPTIC OPTIONS ---------- */
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Calculate angle and distance between two coordinates
 */
const calculateRelativePosition = (userLat, userLon, targetLat, targetLon) => {
  const dLon = targetLon - userLon;
  const dLat = targetLat - userLat;

  let angle = Math.atan2(dLon, dLat) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  const distanceRaw = Math.sqrt(dLon * dLon + dLat * dLat);
  const distanceNormalized = clamp(distanceRaw / 0.001, 0.1, 1);

  return { angle, distance: distanceNormalized };
};

/**
 * Get profile photo URL from S3 key
 */
const getProfilePhotoUrl = (photoKey) => {
  if (!photoKey) return null;
  const base = API_CONFIG.S3_BASE_URL.replace(/\/$/, '');
  return `${base}/${photoKey}`;
};

const extractCoordinates = (user) => {
  const latitude = user?.latitude ?? user?.lat ?? user?.location?.latitude;
  const longitude = user?.longitude ?? user?.lon ?? user?.location?.longitude;
  if (latitude == null || longitude == null) return null;
  return { latitude: Number(latitude), longitude: Number(longitude) };
};

const buildRadarUser = (user) => {
  const id = user?.user_id || user?.id;
  if (!id) return null;

  const displayName = user?.display_name || user?.name || 'User';

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const angle = Math.abs(hash % 360);
  const distance = 0.25 + (Math.abs(hash) % 50) / 100;

  return {
    id,
    name: displayName,
    vibe: user?.vibe || 'nearby',
    gender: user?.gender,
    profilePhoto: user?.profile_photo_key,
    socials: user?.socials || {},
    angle,
    distance,
  };
};


export default function RadarScreen({ navigation, accessToken, currentUserId }) {
  // State
  const [users, setUsers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [scanAngle, setScanAngle] = useState(0);
  const [userLocation, setUserLocation] = useState(null);
  const [placeId, setPlaceId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [nearbyPhotoUrls, setNearbyPhotoUrls] = useState({});
  const [incomingRequestPhotoUrl, setIncomingRequestPhotoUrl] = useState(null);
  const [storedToken, setStoredToken] = useState(null);
  const [storedUserId, setStoredUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [incomingRequestId, setIncomingRequestId] = useState(null);
  const [requestCardVisible, setRequestCardVisible] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const isFocused = useIsFocused();
  const radarReady = isOpen && userLocation && placeId && !loading;

  const resolvedAccessToken = accessToken || storedToken;
  const resolvedUserId = currentUserId || storedUserId;

  const usersRef = useRef([]);
  const userLocationRef = useRef(null);
  const userIdRef = useRef(null);
  const tokenRef = useRef(null);
  const placeIdRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const isOpenRef = useRef(false);
  const scanLoopRef = useRef(null);
  const scanListenerRef = useRef(null);
  const nearbyPhotoInFlightRef = useRef(new Set());

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    userIdRef.current = resolvedUserId;
  }, [resolvedUserId]);

  useEffect(() => {
    tokenRef.current = resolvedAccessToken;
  }, [resolvedAccessToken]);

  useEffect(() => {
    placeIdRef.current = placeId;
  }, [placeId]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen, loading]);

  const fetchNearbyProfilePhoto = async (userId) => {
    if (!resolvedAccessToken || !userId) return null;

    try {
      const tokenType = await AsyncStorage.getItem('tokenType');
      const authHeader = `${tokenType || 'Bearer'} ${resolvedAccessToken}`;
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/profile-photo`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 403 || response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to load nearby profile photo');
      }

      const data = await response.json();
      return data?.profile_photo_url || null;
    } catch (err) {
      console.warn('Nearby profile photo fetch error:', err);
      return null;
    }
  };

  useEffect(() => {
    setNearbyPhotoUrls({});
    nearbyPhotoInFlightRef.current.clear();
  }, [placeId, isOpen]);

  useEffect(() => {
    if (!isOpen || !resolvedAccessToken || !users.length) return;

    const missing = users
      .map((u) => u.id)
      .filter((id) => id && !(id in nearbyPhotoUrls));

    if (!missing.length) return;

    missing.forEach((userId) => {
      if (nearbyPhotoInFlightRef.current.has(userId)) return;
      nearbyPhotoInFlightRef.current.add(userId);

      fetchNearbyProfilePhoto(userId).then((url) => {
        setNearbyPhotoUrls((prev) => ({ ...prev, [userId]: url }));
        nearbyPhotoInFlightRef.current.delete(userId);
      });
    });
  }, [users, resolvedAccessToken, isOpen, nearbyPhotoUrls]);

  /* ---------- LOAD AUTH FROM STORAGE ---------- */
  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const uid = await AsyncStorage.getItem('userId');

        if (!mounted) return;
        setStoredToken(token);
        setStoredUserId(uid);
      } catch (e) {
        console.warn('Failed to load auth data:', e);
      } finally {
        if (mounted) {
          setAuthReady(true);
        }
      }
    };

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- CHECK AUTH STATUS ---------- */
  useEffect(() => {
    if (!authReady) return;
    if (!resolvedAccessToken) {
      setError({ type: 'auth', message: 'Please log in to use radar.' });
    }
  }, [authReady, resolvedAccessToken]);

  /* ---------- LOCATION PERMISSIONS ---------- */
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForActiveAppState = () =>
    new Promise((resolve) => {
      if (AppState.currentState === 'active') {
        resolve();
        return;
      }

      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          sub.remove();
          resolve();
        }
      });
    });

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      try {
        const status = await Geolocation.requestAuthorization('whenInUse');
        return status === 'granted' ? 'granted' : 'denied';
      } catch (err) {
        console.warn('iOS location permission error:', err);
        return 'denied';
      }
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (alreadyGranted) return 'granted';

      await waitForActiveAppState();

      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'Pass needs your location to show nearby users on radar.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
              buttonNeutral: 'Ask Me Later',
            }
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
          if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';
          return 'denied';
        } catch (err) {
          const message = String(err?.message || err);
          const isActivityError = message.includes('not attached to an Activity');
          if (!isActivityError || attempt === maxAttempts) {
            throw err;
          }
          await sleep(300);
        }
      }
    } catch (err) {
      console.warn('Android location permission error:', err);
      return 'denied';
    }
  };

  /* ---------- API HELPER ---------- */
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const headers = {
      Authorization: `Bearer ${resolvedAccessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  };

  const resolveIncomingRequestId = async (requesterId) => {
    if (!requesterId || !resolvedAccessToken) return null;

    try {
      const data = await makeAuthenticatedRequest(
        `${API_BASE_URL}/friend_requests/pending`
      );

      const match = data?.requests?.find(
        (req) => req?.requester?.user_id === requesterId
      );

      return match?.request_id || null;
    } catch (err) {
      console.warn('Failed to resolve friend request id:', err);
      return null;
    }
  };

  const resetIncomingRequest = () => {
    setRequestActionLoading(false);
    setRequestCardVisible(false);
    setIncomingRequest(null);
    setIncomingRequestId(null);
  };

  const handleAcceptIncoming = async () => {
    if (!incomingRequest || !resolvedAccessToken || requestActionLoading) return;

    setRequestActionLoading(true);
    const requesterId = incomingRequest?.requester?.user_id || incomingRequest?.user_id;
    let requestId = incomingRequestId;

    if (!requestId) {
      requestId = await resolveIncomingRequestId(requesterId);
      setIncomingRequestId(requestId);
    }

    if (!requestId) {
      setRequestActionLoading(false);
      return;
    }

    try {
      await makeAuthenticatedRequest(
        `${API_BASE_URL}/friend_requests/accept/${requestId}`,
        { method: 'POST' }
      );
      setPendingRequestsCount((prev) => Math.max(prev - 1, 0));
      resetIncomingRequest();
      const requester = incomingRequest?.requester || incomingRequest;
      const requesterId = requester?.user_id || requester?.id;
      if (requesterId) {
        navigation.navigate('Pass', {
          user: {
            id: requesterId,
            name: requester?.display_name || requester?.name || 'User',
            vibe: requester?.vibe,
            gender: requester?.gender,
            profilePhoto: requester?.profile_photo_key || requester?.profilePhoto,
            socials: requester?.socials || {},
            socials_locked: requester?.socials_locked,
          },
          autoUnlock: true,
        });
      }
    } catch (err) {
      console.warn('Accept friend request error:', err);
      setRequestActionLoading(false);
    }
  };

  const handleRejectIncoming = async () => {
    if (!incomingRequest || !resolvedAccessToken || requestActionLoading) return;

    setRequestActionLoading(true);
    const requesterId = incomingRequest?.requester?.user_id || incomingRequest?.user_id;
    let requestId = incomingRequestId;

    if (!requestId) {
      requestId = await resolveIncomingRequestId(requesterId);
      setIncomingRequestId(requestId);
    }

    if (!requestId) {
      setRequestActionLoading(false);
      return;
    }

    try {
      await makeAuthenticatedRequest(
        `${API_BASE_URL}/friend_requests/reject/${requestId}`,
        { method: 'POST' }
      );
      setPendingRequestsCount((prev) => Math.max(prev - 1, 0));
      resetIncomingRequest();
    } catch (err) {
      console.warn('Reject friend request error:', err);
      setRequestActionLoading(false);
    }
  };

  useEffect(() => {
    if (!incomingRequest || !resolvedAccessToken) return;
    const requester = incomingRequest?.requester || incomingRequest;
    const requesterId = requester?.user_id || requester?.id;
    if (!requesterId) return;

    let mounted = true;
    fetchNearbyProfilePhoto(requesterId).then((url) => {
      if (!mounted) return;
      setIncomingRequestPhotoUrl(url);
    });

    return () => {
      mounted = false;
    };
  }, [incomingRequest, resolvedAccessToken]);

  /* ---------- LOCATION ASSIGNMENT (ONLY WHEN OPENING) ---------- */
  useEffect(() => {
    console.log('RADAR OPEN', { isOpen, authReady, resolvedAccessToken });
    if (!isOpen || !authReady || !resolvedAccessToken) return;

    let mounted = true;

    const assignLocation = async () => {
      try {
        console.log('assignLocation start');
        setLoading(true);
        setError(null);

        const permission = await requestLocationPermission();
        if (permission !== 'granted') {
          const message =
            permission === 'blocked'
              ? 'Location permission is blocked. Enable it in settings to use radar.'
              : 'Location permission is required to use radar.';
          setError({ type: 'location', message, action: permission === 'blocked' ? 'settings' : 'retry' });
          setLoading(false);
          setIsOpen(false);
          return;
        }

        const position = await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          });
        });

        const liveLat = position.coords.latitude;
        const liveLon = position.coords.longitude;

        // Assign user to location bucket
        const assignData = await makeAuthenticatedRequest(
          `${API_BASE_URL}/assign_location`,
          {
            method: 'POST',
            body: JSON.stringify({
              latitude: liveLat,
              longitude: liveLon,
            }),
          }
        );

        if (!mounted) return;

        setUserLocation({ latitude: liveLat, longitude: liveLon });
        setLocationLabel(`Lat ${liveLat.toFixed(4)}, Lon ${liveLon.toFixed(4)}`);
        setPlaceId(assignData.place_id);
        setLoading(false);

        console.log('Location assigned:', assignData);
      } catch (e) {
        console.warn('Location assignment error:', e);
        if (mounted) {
          const code = e?.code;
          let message = 'Failed to initialize location';
          let action = 'retry';

          if (code === 1 || String(e?.message || '').includes('denied')) {
            message = 'Location permission denied. Please enable it in settings.';
            action = 'settings';
          } else if (code === 2) {
            message = 'Location unavailable. Make sure location services are on.';
          } else if (code === 3) {
            message = 'Location request timed out. Try again.';
          }

          setError({ type: 'location', message, action });
          setLoading(false);
          setIsOpen(false);
        }
      }
    };

    assignLocation();

    return () => {
      mounted = false;
    };
  }, [isOpen, authReady, resolvedAccessToken]);

  /* ---------- SOCKET LISTENERS - RADAR UPDATES ---------- */
  // RadarScreen owns all radar + nearby user realtime events
  // Listens for: nearby_users, location_update, connect/disconnect status
  useEffect(() => {
    if (!authReady || !resolvedAccessToken || !isOpen || !placeId) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      console.warn('⚠️ RadarScreen: Global socket not available');
      setSocketConnected(false);
      return;
    }

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleConnectedAck = () => setSocketConnected(true);

const handleNearbyUsers = (payload) => {
  if (!isOpenRef.current) return;

  const currentUserId = userIdRef.current;
  const currentPlaceId = placeIdRef.current;

  if (payload?.place_id && currentPlaceId && payload.place_id !== currentPlaceId) {
    return;
  }

const list = (payload?.users || [])
  .filter((u) => (currentUserId ? (u.user_id || u.id) !== currentUserId : true))
  .map(buildRadarUser)
  .filter(Boolean);

  setUsers(list);

};




    const handleLocationUpdate = (payload) => {
  if (!isOpenRef.current) return;

  const currentUserId = userIdRef.current;
  const currentPlaceId = placeIdRef.current;

  if (!payload?.user) return;
  if (payload?.place_id && currentPlaceId && payload.place_id !== currentPlaceId) return;

  const incoming = payload.user;
  const incomingId = incoming.user_id || incoming.id;

  if (currentUserId && incomingId === currentUserId) return;

  if (payload.event_type === 'user_left') {
    setUsers((prev) => prev.filter((u) => u.id !== incomingId));
    return;
  }

  if (payload.event_type === 'user_entered') {
    const next = buildRadarUser(incoming);
    if (!next) return;

    setUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== next.id);
      return [...filtered, next];
    });
  }
};


    setSocketConnected(socket.connected);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connected', handleConnectedAck);
    socket.on('nearby_users', handleNearbyUsers);
    socket.on('location_update', handleLocationUpdate);

    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connected', handleConnectedAck);
        socket.off('nearby_users', handleNearbyUsers);
        socket.off('location_update', handleLocationUpdate);
      }
    };
  }, [authReady, resolvedAccessToken, isOpen, placeId]);

  /* ---------- JOIN/LEAVE LOCATION ROOM ---------- */
  // SINGLE source of join/leave emissions - controlled by React lifecycle
  // Automatically joins when radar opens, leaves when radar closes
  useEffect(() => {
    const socket = getSocket();
    const token = tokenRef.current;

    if (!isOpen || !socket || !token || !placeId || !socketConnected) return;

    socket.emit('join_location', { token, place_id: placeId });
    socket.emit('get_nearby_users', { token });

    return () => {
      // Automatic cleanup - leaves room when radar closes
      socket.emit('leave_location', { token, place_id: placeId });
    };
  }, [placeId, socketConnected, isOpen]);

  /* ---------- PING INTERVAL ---------- */
  useEffect(() => {
    const socket = getSocket();
    if (!isOpen || !socket || !socketConnected) return;

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Send initial ping
    if (socket && socket.connected) {
      socket.emit('ping');
    }

    pingIntervalRef.current = setInterval(() => {
      // Defensive check before each ping
      if (socket && socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [socketConnected, isOpen]);

  /* ---------- FETCH CURRENT USER PROFILE ---------- */
  useEffect(() => {
    if (!resolvedAccessToken) return;

    let mounted = true;
    const baseProfile = {
      display_name: 'You',
      profile_photo_key: null,
      profile_photo_url: null,
    };

    setCurrentUserProfile(baseProfile);

    const loadProfilePhoto = async () => {
      try {
        const tokenType = await AsyncStorage.getItem('tokenType');
        const authHeader = `${tokenType || 'Bearer'} ${resolvedAccessToken}`;
        const response = await fetch(`${API_BASE_URL}/api/me/profile-photo`, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });

        if (!mounted) return;

        if (response.status === 404) {
          setCurrentUserProfile((prev) => ({
            ...(prev || baseProfile),
            profile_photo_url: null,
          }));
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load profile photo');
        }

        const data = await response.json();
        setCurrentUserProfile((prev) => ({
          ...(prev || baseProfile),
          profile_photo_url: data?.profile_photo_url || null,
        }));
      } catch (err) {
        console.warn('Failed to load profile photo:', err);
      }
    };

    loadProfilePhoto();

    return () => {
      mounted = false;
    };
  }, [resolvedAccessToken]);


  /* ---------- FRIEND REQUEST REALTIME EVENTS ---------- */
  // RadarScreen owns all friend request realtime notifications
  // Shows popup + increments badge instantly when request received
  useEffect(() => {
    if (!resolvedAccessToken) return;

    const socket = getSocket();
    if (!socket) {
      console.warn('⚠️ RadarScreen: Global socket not available for friend requests');
      return;
    }

    const handleFriendRequestReceived = (payload) => {
      console.log('🔔 RadarScreen: friend_request_received');
      console.log('   Payload:', payload);

      // Increment badge counter
      setPendingRequestsCount((prev) => {
        const newCount = prev + 1;
        console.log(`   Badge count: ${prev} → ${newCount}`);
        return newCount;
      });

      // Show popup
      setIncomingRequest(payload);
      setIncomingRequestId(null);
      setRequestCardVisible(true);
    };

    const handleFriendshipExpired = (payload) => {
      console.log('⏰ RadarScreen: Friendship expired');
      // Could refresh nearby users list here
    };

    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friendship_expired', handleFriendshipExpired);

    return () => {
      if (socket) {
        socket.off('friend_request_received', handleFriendRequestReceived);
        socket.off('friendship_expired', handleFriendshipExpired);
      }
    };
  }, [resolvedAccessToken]);

  useEffect(() => {
    if (!resolvedAccessToken) return;

    const socket = getSocket();
    if (!socket) {
      console.warn('RadarScreen: Global socket not available for accept events');
      return;
    }

    const handleFriendRequestAccepted = (payload) => {
      if (!isFocused) return;
      const accepter = payload?.user;
      const accepterId = accepter?.user_id || accepter?.id;
      if (!accepterId) return;

      navigation.navigate('Pass', {
        user: {
          id: accepterId,
          name: accepter?.display_name || accepter?.name || 'User',
          vibe: accepter?.vibe,
          gender: accepter?.gender,
          profilePhoto: accepter?.profile_photo_key || accepter?.profilePhoto,
          socials: accepter?.socials || {},
          socials_locked: accepter?.socials_locked,
        },
        autoUnlock: true,
      });
    };

    socket.on('friend_request_accepted', handleFriendRequestAccepted);

    return () => {
      if (socket) {
        socket.off('friend_request_accepted', handleFriendRequestAccepted);
      }
    };
  }, [resolvedAccessToken, isFocused, navigation]);

  useEffect(() => {
    if (!requestCardVisible || !incomingRequest || incomingRequestId || !resolvedAccessToken) return;

    let mounted = true;
    const requesterId = incomingRequest?.requester?.user_id || incomingRequest?.user_id;

    (async () => {
      const id = await resolveIncomingRequestId(requesterId);
      if (!mounted) return;
      setIncomingRequestId(id);
    })();

    return () => {
      mounted = false;
    };
  }, [requestCardVisible, incomingRequest, incomingRequestId, resolvedAccessToken]);

  /* ---------- FETCH PENDING REQUESTS COUNT ---------- */
  const fetchRequestsCount = async () => {
    if (!resolvedAccessToken) return;

    try {
      const data = await makeAuthenticatedRequest(
        `${API_BASE_URL}/friend_requests/pending`
      );

      if (data.success) {
        const count = data.requests?.length || 0;
        setPendingRequestsCount(count);
        console.log(`📋 Pending requests count: ${count}`);
      }
    } catch (err) {
      console.warn('Failed to fetch requests count:', err);
    }
  };

  // Fetch on mount
  useEffect(() => {
    if (!resolvedAccessToken) return;
    fetchRequestsCount();
  }, [resolvedAccessToken]);

  // Refresh count when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📡 RadarScreen focused - refreshing request count');
      fetchRequestsCount();
    });

    return unsubscribe;
  }, [navigation, resolvedAccessToken]);

  // WebSocket will handle real-time updates - no polling needed!
  // The notification handler at line 583 will increment the badge instantly
  // The direct socket listener at line 629 will also fetch the count as backup

  /* ---------- FETCH NEARBY USERS (FALLBACK) ---------- */
  useEffect(() => {
    if (!isOpen || !placeId || !userLocation || !resolvedAccessToken || socketConnected) return;

    let mounted = true;

    const fetchNearbyUsers = async () => {
      try {
        const data = await makeAuthenticatedRequest(
          `${API_BASE_URL}/view_nearby_people`
        );

        if (!mounted || !data.success) {
          return;
        }

        const usersWithPositions = data.users
          .filter((user) => (resolvedUserId ? user.user_id !== resolvedUserId : true))
          .map((user) => buildRadarUser(user))

          .filter(Boolean);

        setUsers(usersWithPositions);
      } catch (e) {
        console.warn('Nearby users fetch error:', e);
        if (e.message.includes('401')) {
          setError('Authentication expired. Please log in again.');
        }
      }
    };

    fetchNearbyUsers();
    const interval = setInterval(fetchNearbyUsers, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [placeId, userLocation, resolvedAccessToken, resolvedUserId, socketConnected, isOpen]);

  /* ---------- HAPTIC REFS ---------- */
  const lastScanPulseRef = useRef(0);
  const lastTargetPulseRef = useRef({});

  /* ---------- ANIMS ---------- */
  const scanAnim = useRef(new Animated.Value(0)).current;
  const radarBreath = useRef(new Animated.Value(0)).current;
  const openFade = useRef(new Animated.Value(0)).current;
  const gridPulse = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const sliderX = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;

  const particleAnims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  /* ---------- POSITIONS ---------- */
  const usersWithPos = useMemo(() => {
    return users.map((u) => {
      const rad = ((u.angle - 90) * Math.PI) / 180;
      return {
        ...u,
        x: CENTER + Math.cos(rad) * u.distance * MAX_RADIUS,
        y: CENTER + Math.sin(rad) * u.distance * MAX_RADIUS,
      };
    });
  }, [users]);

  const currentUserAvatarUrl =
    currentUserProfile?.profile_photo_url ||
    (currentUserProfile?.profile_photo_key
      ? getProfilePhotoUrl(currentUserProfile.profile_photo_key)
      : null);

  const isScanNear = (angle) => {
    const d = Math.abs(angle - scanAngle);
    return d < 14 || d > 346;
  };

  /* ---------- APP STATE ---------- */
  // Close radar UI when app goes to background
  // Socket room cleanup happens automatically via useEffect cleanup above
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') closeRadar();
    });
    return () => sub.remove();
  }, []);

  /* ---------- RADAR BREATH ---------- */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarBreath, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(radarBreath, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(gridPulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(gridPulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 3600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    particleAnims.forEach((anim, i) => {
      const delay = i * 300;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const startScanLoop = () => {
    if (!isOpenRef.current || loading) return;

    if (scanLoopRef.current) {
      scanLoopRef.current.stop();
    }

    scanAnim.setValue(0);

    const anim = Animated.timing(scanAnim, {
      toValue: 1,
      duration: 14000,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    scanLoopRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && isOpenRef.current && !loading) {
        startScanLoop();
      }
    });
  };

  const stopScanLoop = () => {
    if (scanLoopRef.current) {
      scanLoopRef.current.stop();
      scanLoopRef.current = null;
    }
    scanAnim.stopAnimation();
  };

  /* ---------- OPEN / SCAN / HAPTICS ---------- */
  useEffect(() => {
    if (!radarReady) {
      // Reset scan angle when closed
      setScanAngle(0);
      scanAnim.setValue(0);
      stopScanLoop();

      if (scanListenerRef.current) {
        scanAnim.removeListener(scanListenerRef.current);
        scanListenerRef.current = null;
      }
      return;
    }

    Haptic.trigger('impactLight', hapticOptions);
    Animated.timing(openFade, { toValue: 1, duration: 240, useNativeDriver: true }).start();

    scanListenerRef.current = scanAnim.addListener(({ value }) => {
      if (!isOpenRef.current) return;

      const angle = value * 360;
      setScanAngle(angle);

      const now = Date.now();

      if (now - lastScanPulseRef.current > 1400) {
        Haptic.trigger('impactLight', hapticOptions);
        lastScanPulseRef.current = now;
      }

      usersRef.current.forEach((u) => {
        if (!isScanNear(u.angle)) return;

        const lastHit = lastTargetPulseRef.current[u.id] || 0;
        if (now - lastHit > 3500) {
          Haptic.trigger('impactMedium', hapticOptions);
          lastTargetPulseRef.current[u.id] = now;
        }
      });
    });

    startScanLoop();

    return () => {
      stopScanLoop();
      if (scanListenerRef.current) {
        scanAnim.removeListener(scanListenerRef.current);
        scanListenerRef.current = null;
      }
    };
  }, [radarReady]);

  /* ---------- SLIDER ---------- */
  const closeRadar = async () => {
    Haptic.trigger('impactSoft', hapticOptions);

    const token = tokenRef.current;

    // Remove user from location tracking
    if (token) {
      try {
        await makeAuthenticatedRequest(`${API_BASE_URL}/remove_user_location`, {
          method: 'DELETE',
        });
        console.log('User removed from location tracking');
      } catch (err) {
        console.warn('Cleanup error:', err);
      }
    }

    // Clear radar state
    setIsOpen(false);
    setUsers([]);
    setUserLocation(null);
    setPlaceId(null);
    setLocationLabel('');

    lastScanPulseRef.current = 0;
    lastTargetPulseRef.current = {};

    Animated.parallel([
      Animated.timing(sliderX, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fillAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(openFade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const openRadar = () => {
    const max = SLIDER_WIDTH - KNOB_SIZE - 10;
    Animated.parallel([
      Animated.spring(sliderX, { toValue: max, bounciness: 0, useNativeDriver: true }),
      Animated.timing(fillAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setIsOpen(true);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && !isOpen,
      onPanResponderMove: (_, g) => {
        const max = SLIDER_WIDTH - KNOB_SIZE - 10;
        const dx = clamp(g.dx, 0, max);
        sliderX.setValue(dx);
        fillAnim.setValue(dx / max);
      },
      onPanResponderRelease: (_, g) => {
        const max = SLIDER_WIDTH - KNOB_SIZE - 10;
        g.dx > max * 0.9 ? openRadar() : closeRadar();
      },
    })
  ).current;

  const scanRotate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale = radarBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.25],
  });

  const pulseOpacity = radarBreath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.36],
  });

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.1],
  });

  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.7],
  });

  const gridOpacity = gridPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  /* ---------- LOADING STATE ---------- */
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  /* ---------- ERROR STATE ---------- */
  if (error?.type === 'auth') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableWithoutFeedback
            onPress={() => {
              setError(null);
              navigation.replace('Login');
            }}
          >
            <View style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>
    );
  }

  if (error?.type === 'location') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error.message}</Text>
          <View>
            <TouchableWithoutFeedback
              onPress={() => {
                setError(null);
              }}
            >
              <View style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </View>
            </TouchableWithoutFeedback>
            {error.action === 'settings' && (
              <TouchableWithoutFeedback
                onPress={() => {
                  Linking.openSettings();
                }}
              >
                <View style={[styles.retryButton, { marginTop: 10 }]}>
                  <Text style={styles.retryButtonText}>Open Settings</Text>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>
      </View>
    );
  }

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbRight} />
      <View style={styles.bgOrbBottom} />

      <View style={styles.starsWrap} pointerEvents="none">
        {PARTICLES.map((p, i) => (
          <Animated.View
            key={p.id}
            style={[
              styles.star,
              {
                width: p.s,
                height: p.s,
                borderRadius: p.s / 2,
                left: RADAR_SIZE * p.x,
                top: RADAR_SIZE * p.y,
                opacity: particleAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.9],
                }),
                transform: [
                  {
                    scale: particleAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>PASS</Text>
          <View style={styles.headerRight}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{socketConnected ? 'Live' : 'Offline'}</Text>
            </View>
            <TouchableOpacity
              style={styles.requestsButton}
              onPress={() => {
                Haptic.trigger('impactLight', hapticOptions);
                setPendingRequestsCount(0); // Reset badge when navigating
                navigation.navigate('FriendRequests');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.requestsText}>REQUESTS</Text>
              {pendingRequestsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.location}>{locationLabel || 'Slide to begin'}</Text>

        {/* HEADER ACTIONS */}
        <View style={styles.headerActions}>
          <TouchableWithoutFeedback
            onPress={() => {
              Haptic.trigger('impactLight', hapticOptions);
              navigation.navigate('Profile');
            }}
            >
              <View style={styles.profileAvatar}>
                {currentUserAvatarUrl ? (
                  <Image
                    source={{ uri: currentUserAvatarUrl }}
                    style={styles.avatarImg}
                  />
                ) : (
                <Text style={styles.avatarText}>
                  {currentUserProfile?.display_name?.[0]?.toUpperCase() || 'Y'}
                </Text>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>

      {requestCardVisible && incomingRequest && (
        <View style={styles.requestOverlay} pointerEvents="box-none">
          <View style={styles.requestCard}>
            <View style={styles.requestBadge}>
              <Text style={styles.requestBadgeText}>NEW PASS</Text>
            </View>

            <View style={styles.requestHeader}>
              <View style={styles.requestAvatar}>
                {incomingRequestPhotoUrl ? (
                  <Image
                    source={{
                      uri: incomingRequestPhotoUrl,
                    }}
                    style={styles.requestAvatarImg}
                  />
                ) : (
                  <Text style={styles.requestAvatarText}>
                    {(incomingRequest.requester?.display_name || incomingRequest.display_name || 'U')
                      .slice(0, 1)
                      .toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>
                  {incomingRequest.requester?.display_name || incomingRequest.display_name || 'Unknown'}
                </Text>
                <Text style={styles.requestMeta}>
                  {incomingRequest.requester?.vibe || incomingRequest.vibe || 'Wants to connect with you'}
                </Text>
              </View>
            </View>

            <Text style={styles.requestMessage}>
              Wants to connect with you! Accept to unlock each other's socials.
            </Text>

            <View style={styles.requestActions}>
              <TouchableOpacity
                style={[styles.requestAccept, requestActionLoading && styles.requestButtonDisabled]}
                onPress={handleAcceptIncoming}
                activeOpacity={0.8}
                disabled={requestActionLoading}
              >
                {requestActionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.requestAcceptText}>Accept Pass</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestReject, requestActionLoading && styles.requestButtonDisabled]}
                onPress={handleRejectIncoming}
                activeOpacity={0.8}
                disabled={requestActionLoading}
              >
                <Text style={styles.requestRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* RADAR */}
      <View style={styles.radarWrap}>
        <Animated.View
          style={[
            styles.radar,
            {
              transform: [
                {
                  scale: radarBreath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.04],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.radarFrame} />
          <Animated.View style={[styles.crosshairH, { opacity: gridOpacity }]} />
          <Animated.View style={[styles.crosshairV, { opacity: gridOpacity }]} />

          {[1, 0.78, 0.56, 0.34].map((r, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: RADAR_SIZE * r,
                  height: RADAR_SIZE * r,
                  borderRadius: (RADAR_SIZE * r) / 2,
                  opacity: gridOpacity,
                },
              ]}
            />
          ))}

          <Animated.View
            style={[
              styles.ripple,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          <Animated.View style={[styles.scanWrap, { transform: [{ rotate: scanRotate }] }]}>
            <Animated.View style={[styles.scanConeSoft, { opacity: shimmerOpacity }]} />
            <View style={styles.scanConeSharp} />
            <View style={[styles.scanLine, { opacity: isOpen ? 1 : 0.15 }]} />
          </Animated.View>

          <Animated.View style={[styles.centerPulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
          <View style={styles.youDot} />

          {!isOpen && <Text style={styles.tapHint}>Slide below to open radar</Text>}

          {usersWithPos.map((u) => {
            const active = isOpen && isScanNear(u.angle);

            return (
              <View
                key={u.id}
                style={[
                  styles.userWrap,
                  { left: u.x - 6, top: u.y - 6, opacity: active ? 1 : 0.35 },
                ]}
                pointerEvents={isOpen ? 'auto' : 'none'}
              >
                <Text style={[styles.vibeText, active && styles.vibeTextActive]}>
                  {u.vibe.length > 20 ? u.vibe.substring(0, 20) + '...' : u.vibe}
                </Text>

                <TouchableWithoutFeedback
                  onPress={() => {
                    Haptic.trigger('impactMedium', hapticOptions);
                    navigation.navigate('Pass', {
                      user: {
                        id: u.id,
                        name: u.name,
                        vibe: u.vibe,
                        gender: u.gender,
                        profilePhoto: u.profilePhoto,
                        socials: u.socials,
                      },
                    });
                  }}
                >
                  <View style={styles.dotStack}>
                    {nearbyPhotoUrls[u.id] ? (
                      <View style={[styles.userDotPhoto, active && styles.userDotPhotoActive]}>
                        <Image
                          source={{ uri: nearbyPhotoUrls[u.id] }}
                          style={styles.userDotImg}
                        />
                      </View>
                    ) : (
                      <>
                        <View style={[styles.userDotGlow, active && styles.userDotGlowActive]} />
                        <View style={[styles.userDot, active && styles.userDotActive]} />
                        <View style={[styles.userDotSpark, active && styles.userDotSparkActive]} />
                      </>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            );
          })}
        </Animated.View>
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Animated.View style={{ opacity: openFade }}>
          <Text style={styles.openNearby}>{users.length} open nearby</Text>
        </Animated.View>

        <View style={styles.sliderShell}>
          <Animated.View style={[styles.sliderFill, { opacity: fillAnim }]} />
          <View style={styles.sliderHighlight} pointerEvents="none" />

          {!isOpen ? (
            <Animated.View
              {...panResponder.panHandlers}
              style={[styles.knob, { transform: [{ translateX: sliderX }] }]}
            >
              <View style={styles.knobInner} />
            </Animated.View>
          ) : (
            <TouchableWithoutFeedback onPress={closeRadar}>
              <View style={[styles.knob, styles.knobOpen]}>
                <View style={styles.knobInner} />
              </View>
            </TouchableWithoutFeedback>
          )}

          <Text style={styles.sliderText}>{isOpen ? "You're open" : 'Slide to open'}</Text>
        </View>

        <Text style={styles.subHint}>{isOpen ? 'Tap a dot to connect' : 'Visible only while open'}</Text>

        <Text style={styles.disappearHint}>Presence fades when you leave</Text>
      </View>
    </View>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  errorText: {
    fontSize: 14,
    color: 'rgba(255,100,100,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },

  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  bgOrbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124,92,255,0.18)',
    top: -110,
    left: -50,
  },

  bgOrbRight: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(108,255,181,0.12)',
    top: 120,
    right: -90,
  },

  bgOrbBottom: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124,92,255,0.12)',
    bottom: -180,
    left: 10,
  },

  starsWrap: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    top: 140,
    alignSelf: 'center',
  },

  star: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  header: { paddingTop: 52, alignItems: 'center', paddingBottom: 12 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  logo: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 4 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  statusText: { fontSize: 10, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.4 },

  location: { marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)' },

  radarWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  radar: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },

  radarFrame: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.2)',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },

  crosshairH: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  crosshairV: {
    position: 'absolute',
    width: 1,
    height: RADAR_SIZE,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(124,92,255,0.22)' },

  ripple: {
    position: 'absolute',
    width: RADAR_SIZE * 0.85,
    height: RADAR_SIZE * 0.85,
    borderRadius: (RADAR_SIZE * 0.85) / 2,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.4)',
  },

  scanWrap: { position: 'absolute', width: RADAR_SIZE, height: RADAR_SIZE },

  scanConeSoft: {
    position: 'absolute',
    left: CENTER,
    top: CENTER - RADAR_SIZE * 0.12,
    width: 0,
    height: 0,
    borderTopWidth: RADAR_SIZE * 0.12,
    borderBottomWidth: RADAR_SIZE * 0.12,
    borderRightWidth: RADAR_SIZE * 0.52,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(124,92,255,0.14)',
  },

  scanConeSharp: {
    position: 'absolute',
    left: CENTER,
    top: CENTER - RADAR_SIZE * 0.06,
    width: 0,
    height: 0,
    borderTopWidth: RADAR_SIZE * 0.06,
    borderBottomWidth: RADAR_SIZE * 0.06,
    borderRightWidth: RADAR_SIZE * 0.44,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(124,92,255,0.26)',
  },

  scanLine: {
    position: 'absolute',
    width: RADAR_SIZE / 2,
    height: 2,
    backgroundColor: 'rgba(124,92,255,0.8)',
    left: CENTER,
    top: CENTER - 1,
  },

  centerPulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
  },

  youDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },

  tapHint: { position: 'absolute', bottom: -34, fontSize: 12, color: 'rgba(255,255,255,0.28)' },

  userWrap: { position: 'absolute', alignItems: 'center' },

  dotStack: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },

  userDotGlow: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  userDotGlowActive: { backgroundColor: 'rgba(124,92,255,0.45)' },

  userDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.5)' },

  userDotActive: { backgroundColor: colors.primary },

  userDotSpark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  userDotSparkActive: { backgroundColor: 'rgba(255,255,255,0.75)' },

  userDotPhoto: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },

  userDotPhotoActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  userDotImg: {
    width: '100%',
    height: '100%',
  },

  vibeText: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 4, opacity: 0.85 },

  vibeTextActive: { color: colors.primary },

  footer: { paddingBottom: 28, alignItems: 'center' },

  openNearby: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 10 },

  sliderShell: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: SLIDER_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  sliderFill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(124,92,255,0.25)' },

  sliderHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SLIDER_HEIGHT / 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: colors.primary,
    position: 'absolute',
    left: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.85,
    shadowRadius: 22,
    elevation: 18,
  },

  knobOpen: { left: SLIDER_WIDTH - KNOB_SIZE - 6 },

  knobInner: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', opacity: 0.92 },

  sliderText: { position: 'absolute', alignSelf: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  subHint: { marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.26)' },

  disappearHint: { marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: 0.3 },

  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  headerActions: { position: 'absolute', right: 16, top: 52 },

  requestsButton: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    position: 'relative',
  },

  requestsText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  requestOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },

  requestCard: {
    width: Math.min(360, width * 0.9),
    backgroundColor: 'rgba(15,15,24,0.98)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.45)',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },

  requestBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(124,92,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.45)',
  },

  requestBadgeText: {
    fontSize: 10,
    color: colors.text,
    letterSpacing: 0.8,
    fontWeight: '700',
  },

  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },

  requestAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124,92,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(124,92,255,0.6)',
  },

  requestAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  requestAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },

  requestInfo: { flex: 1 },

  requestName: { color: colors.text, fontSize: 18, fontWeight: '700' },

  requestMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },

  requestMessage: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16,
  },

  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },

  requestAccept: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  requestAcceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  requestReject: {
    width: 88,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,80,80,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.6)',
  },

  requestRejectText: { color: '#ff6b6b', fontSize: 12, fontWeight: '700' },

  requestButtonDisabled: { opacity: 0.6 },

  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(124,92,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(124,92,255,0.5)',
  },
});
