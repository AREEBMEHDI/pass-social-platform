import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Haptic from 'react-native-haptic-feedback';
import { colors } from '../theme/colors';
import { API_CONFIG } from './Config';

const { width } = Dimensions.get('window');

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const getProfilePhotoUrl = (photoKey) => {
  if (!photoKey) return null;
  const base = API_CONFIG.S3_BASE_URL.replace(/\/$/, '');
  return `${base}/${photoKey}`;
};

const getTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
};

const RequestCard = ({ item, index, isProcessing, onAccept, onReject }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, scaleAnim, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  const photoUrl = getProfilePhotoUrl(item.requester.profile_photo_key);
  const initial = item.requester.display_name?.[0]?.toUpperCase() || '?';

  return (
    <Animated.View
      style={[
        styles.requestCard,
        {
          opacity: slideAnim,
          transform: [{ translateY }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* New Pass Badge */}
      <View style={styles.newBadge}>
        <Text style={styles.newBadgeText}>NEW PASS</Text>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.textInfo}>
          <Text style={styles.name}>{item.requester.display_name}</Text>
          {item.requester.vibe && (
            <Text style={styles.vibe} numberOfLines={2}>
              "{item.requester.vibe}"
            </Text>
          )}
          <Text style={styles.time}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </View>

      {/* Message */}
      <Text style={styles.message}>
        Wants to connect with you! Accept to unlock each other's socials.
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.acceptBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onAccept(item)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.acceptText}>
            {isProcessing ? 'Accepting...' : 'Accept Pass'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.rejectBtn, isProcessing && styles.btnDisabled]}
          onPress={() => onReject(item)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default function FriendRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());

  /* ---------------- LOAD AUTH ---------------- */
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        setAccessToken(token);
      } catch (err) {
        console.warn('Failed to load auth:', err);
      }
    };

    loadAuth();
  }, []);

  /* ---------------- FETCH PENDING REQUESTS ---------------- */
  const fetchRequests = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/friend_requests/pending`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests || []);
      } else {
        console.error('Failed to fetch requests:', data.error);
      }
    } catch (err) {
      console.error('Fetch requests error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchRequests();
    }
  }, [accessToken, fetchRequests]);

  /* ---------------- REFRESH ON FOCUS ---------------- */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📋 FriendRequestsScreen: Refreshing via API on focus');
      fetchRequests();
    });

    return unsubscribe;
  }, [navigation, fetchRequests]);

  /* ---------------- ACCEPT REQUEST ---------------- */
  const handleAccept = async (request) => {
    if (processingIds.has(request.request_id)) return;

    setProcessingIds((prev) => new Set(prev).add(request.request_id));
    Haptic.trigger('impactMedium', hapticOptions);

    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/friend_requests/accept/${request.request_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Remove from list with animation
        setRequests((prev) =>
          prev.filter((r) => r.request_id !== request.request_id)
        );

        Haptic.trigger('notificationSuccess', hapticOptions);

        Alert.alert(
          '🎉 Connected!',
          `You're now connected with ${request.requester.display_name}!\n\nYou can now see each other's social media handles when you're both in radar.`,
          [
            {
              text: 'Awesome!',
              onPress: () => {
                // Optionally navigate to friends list or radar
              },
            },
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to accept request');
      }
    } catch (err) {
      console.error('Accept error:', err);
      Alert.alert('Error', err.message || 'Failed to accept pass');
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(request.request_id);
        return newSet;
      });
    }
  };

  /* ---------------- REJECT REQUEST ---------------- */
  const handleReject = async (request) => {
    if (processingIds.has(request.request_id)) return;

    Haptic.trigger('impactLight', hapticOptions);

    Alert.alert(
      'Reject Pass?',
      `Are you sure you want to reject the pass from ${request.requester.display_name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => Haptic.trigger('impactLight', hapticOptions),
        },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingIds((prev) => new Set(prev).add(request.request_id));
            Haptic.trigger('notificationWarning', hapticOptions);

            try {
              const response = await fetch(
                `${API_CONFIG.BASE_URL}/friend_requests/reject/${request.request_id}`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const data = await response.json();

              if (response.ok) {
                // Remove from list
                setRequests((prev) =>
                  prev.filter((r) => r.request_id !== request.request_id)
                );
              } else {
                throw new Error(data.error || 'Failed to reject request');
              }
            } catch (err) {
              console.error('Reject error:', err);
              Alert.alert('Error', err.message || 'Failed to reject pass');
            } finally {
              setProcessingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(request.request_id);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  /* ---------------- RENDER ---------------- */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friend Requests</Text>
        <View style={styles.placeholder} />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No pending passes</Text>
          <Text style={styles.emptySubtext}>
            When someone sends you a pass, it'll appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={({ item, index }) => (
            <RequestCard
              item={item}
              index={index}
              isProcessing={processingIds.has(item.request_id)}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          )}
          keyExtractor={(item) => item.request_id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRequests();
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: colors.text,
    fontSize: 28,
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  placeholder: {
    width: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  loadingText: {
    color: colors.muted,
    fontSize: 16,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  emptySubtext: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },

  list: {
    padding: 20,
  },

  requestCard: {
    backgroundColor: 'rgba(16,16,24,0.95)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(124,92,255,0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
    overflow: 'visible',
  },

  newBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },

  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16,
    position: 'relative',
  },

  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: 'rgba(124,92,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },

  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    borderWidth: 3,
    borderColor: colors.primary,
  },

  avatarText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },

  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00ff88',
    borderWidth: 3,
    borderColor: '#000',
  },

  textInfo: {
    flex: 1,
  },

  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },

  vibe: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 18,
  },

  time: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  message: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
  },

  btn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  acceptBtn: {
    flex: 3,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },

  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,59,48,0.45)',
    shadowColor: '#ff3b30',
  },

  btnDisabled: {
    opacity: 0.5,
  },

  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  rejectText: {
    color: '#ff3b30',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
