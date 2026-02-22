import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Pressable,
  Image,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Haptic from 'react-native-haptic-feedback';
import { colors } from '../theme/colors';
import { API_CONFIG } from './Config';
import { getSocket } from '../socket';

const UNLOCK_DURATION = 60; // seconds

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const getProfilePhotoUrl = (photoKey) => {
  if (!photoKey) return null;
  const base = API_CONFIG.S3_BASE_URL.replace(/\/$/, '');
  return `${base}/${photoKey}`;
};

export default function PassScreen({ navigation, route }) {
  const user = route?.params?.user;
  const autoUnlock = route?.params?.autoUnlock;

  /* ---------------- STATE ---------------- */
  const [waiting, setWaiting] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [seconds, setSeconds] = useState(UNLOCK_DURATION);
  const [accessToken, setAccessToken] = useState(null);
  const [error, setError] = useState(null);
  const [userSocials, setUserSocials] = useState(user?.socials || {});
  const [targetPhotoUrl, setTargetPhotoUrl] = useState(null);

  /* ---------------- REFS ---------------- */
  const timerRef = useRef(null);
  const autoUnlockRef = useRef(false);

  /* ---------------- ANIMS ---------------- */
  const sheetY = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  const unlockAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;
  const blurFade = useRef(new Animated.Value(1)).current;
  const waitingPulse = useRef(new Animated.Value(0)).current;

  /* ---------------- ENTRY ---------------- */
  useEffect(() => {
    if (!user) {
      navigation.replace('Radar');
      return;
    }

    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /* ---------------- LOAD AUTH ---------------- */
  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!mounted) return;
        setAccessToken(token);
      } catch (err) {
        console.warn('Failed to load auth:', err);
        setError('Failed to load authentication');
      }
    };

    loadAuth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !user?.id) return;

    const loadTargetPhoto = async () => {
      try {
        const tokenType = await AsyncStorage.getItem('tokenType');
        const authHeader = `${tokenType || 'Bearer'} ${accessToken}`;
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/users/${user.id}/profile-photo`,
          {
            method: 'GET',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 403 || response.status === 404) {
          setTargetPhotoUrl(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load profile photo');
        }

        const data = await response.json();
        setTargetPhotoUrl(data?.profile_photo_url || null);
      } catch (err) {
        console.warn('Target profile photo error:', err);
        setTargetPhotoUrl(null);
      }
    };

    loadTargetPhoto();
  }, [accessToken, user?.id]);

  /* ---------------- CHECK IF ALREADY FRIENDS ---------------- */
  useEffect(() => {
    if (!accessToken || !user?.id) return;

    const checkFriendship = async () => {
      try {
        // Check if socials are already available (unlocked means we're friends)
        if (user?.socials && Object.keys(user.socials).length > 0 && !user.socials_locked) {
          console.log('Already friends, unlocking immediately');
          setUserSocials(user.socials);
          setTimeout(() => unlock(), 300);
        }
      } catch (err) {
        console.warn('Check friendship error:', err);
      }
    };

    checkFriendship();
  }, [accessToken, user]);

  /* ---------------- AUTO UNLOCK (FROM ACCEPT) ---------------- */
  useEffect(() => {
    if (!autoUnlock || autoUnlockRef.current) return;
    autoUnlockRef.current = true;
    setUserSocials(user?.socials || {});
    unlock();
  }, [autoUnlock, user]);

  useEffect(() => {
    if (!autoUnlock || !accessToken || !user?.id) return;

    const fetchSocials = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/view_nearby_people`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const targetUser = data.users?.find(u => u.user_id === user.id);

          if (targetUser?.socials) {
            setUserSocials(targetUser.socials);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch updated user data:', err);
      }
    };

    fetchSocials();
  }, [autoUnlock, accessToken, user?.id]);

  /* ---------------- SOCKET LISTENERS ---------------- */
  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket();
    if (!socket) {
      console.warn('⚠️ PassScreen: Global socket not available');
      return;
    }

    const handleFriendRequestAccepted = async (payload) => {
      console.log('Friend request accepted:', payload);

      // Check if this is for the current user we're viewing
      if (payload?.user?.user_id === user?.id) {
        Haptic.trigger('notificationSuccess', hapticOptions);

        // Update socials if provided in payload
        if (payload?.user?.socials) {
          setUserSocials(payload.user.socials);
          unlock();
        } else {
          // Fetch fresh user data with socials
          try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/view_nearby_people`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const data = await response.json();
              const targetUser = data.users?.find(u => u.user_id === user.id);

              if (targetUser?.socials) {
                setUserSocials(targetUser.socials);
              }
            }
          } catch (err) {
            console.warn('Failed to fetch updated user data:', err);
          }

          unlock();
        }
      }
    };

    socket.on('friend_request_accepted', handleFriendRequestAccepted);

    return () => {
      if (socket) {
        socket.off('friend_request_accepted', handleFriendRequestAccepted);
      }
    };
  }, [accessToken, user?.id]);

  /* ---------------- PASS ---------------- */
  const onPass = async () => {
    if (!accessToken || !user?.id) {
      Alert.alert('Error', 'Missing authentication or user information');
      return;
    }

    if (waiting) return; // Prevent double-tap

    setWaiting(true);
    setError(null);
    Haptic.trigger('impactMedium', hapticOptions);

    // Start waiting animation
    const waitingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(waitingPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(waitingPulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    waitingAnimation.start();

    try {
      // First check if we're already friends
      const checkResponse = await fetch(`${API_CONFIG.BASE_URL}/view_nearby_people`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const targetUser = checkData.users?.find(u => u.user_id === user.id);

        // If user has socials available and not locked, we're already friends
        if (targetUser?.socials && !targetUser.socials_locked && Object.keys(targetUser.socials).length > 0) {
          console.log('Already friends! Unlocking...');
          setUserSocials(targetUser.socials);
          Haptic.trigger('notificationSuccess', hapticOptions);
          waitingAnimation.stop();
          unlock();
          return;
        }
      }

      // Send friend request with target_user_id (as your backend expects)
      console.log('Sending friend request to user:', user.id);

      let friendRequestResponse = await fetch(`${API_CONFIG.BASE_URL}/friend_requests/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user_id: user.id,
        }),
      });

      let friendRequestData = await friendRequestResponse.json();

      if (!friendRequestResponse.ok) {
        // Handle specific error cases
        const errorMsg = friendRequestData.error || 'Failed to send pass';

        if (errorMsg.includes('already friends')) {
          // Already friends, unlock now
          console.log('Already friends based on backend response');
          Haptic.trigger('notificationSuccess', hapticOptions);
          waitingAnimation.stop();
          unlock();
          return;
        } else if (errorMsg.includes('already sent')) {
          // Request already sent, just wait
          console.log('Friend request already sent, waiting for response');
          Alert.alert(
            'Pass Already Sent',
            `You already sent a pass to ${user.name}. Waiting for their response!`,
            [{ text: 'OK' }]
          );
          // Keep waiting state
          return;
        } else {
          throw new Error(errorMsg);
        }
      }

      // Success! Friend request sent
      console.log('Friend request sent successfully:', friendRequestData);

      Alert.alert(
        '✨ Pass Sent!',
        `Your pass has been sent to ${user.name}!\n\nWhen they accept, you'll both unlock each other's social media handles.`,
        [
          {
            text: 'Awesome!',
            onPress: () => {
              // Keep waiting - socket will handle unlock
            }
          },
          {
            text: 'Go Back',
            style: 'cancel',
            onPress: () => {
              setWaiting(false);
              waitingAnimation.stop();
              waitingPulse.setValue(0);
              navigation.goBack();
            }
          }
        ]
      );

    } catch (err) {
      console.error('Pass error:', err);
      const errorMessage = err.message || 'Failed to send pass';
      setError(errorMessage);
      setWaiting(false);
      waitingPulse.stopAnimation();
      waitingPulse.setValue(0);
      Haptic.trigger('notificationError', hapticOptions);

      // User-friendly error messages
      let alertTitle = 'Pass Failed';
      let alertMessage = errorMessage;

      if (errorMessage.includes('not currently in radar')) {
        alertMessage = 'This user is no longer nearby. Please try again when they\'re in range.';
      } else if (errorMessage.includes('not in a radar location')) {
        alertMessage = 'You must be in a radar location to send a pass. Open radar first!';
      } else if (errorMessage.includes('Backend configuration error')) {
        alertTitle = 'Configuration Issue';
        alertMessage = errorMessage;
      }

      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);
    }
  };

  /* ---------------- UNLOCK ---------------- */
  const unlock = () => {
    setUnlocked(true);
    setWaiting(false);
    setError(null);

    // Stop waiting animation
    waitingPulse.stopAnimation();
    waitingPulse.setValue(0);

    Animated.parallel([
      Animated.spring(unlockAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(blurFade, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(ringAnim, {
        toValue: 0,
        duration: UNLOCK_DURATION * 1000,
        useNativeDriver: true,
      }),
    ]).start();

    startTimer();
  };

  /* ---------------- TIMER ---------------- */
  const startTimer = () => {
    let t = UNLOCK_DURATION;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      t--;
      setSeconds(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        navigation.replace('Radar');
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const ringRotate = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const socials = useMemo(() => {
    const socialsData = unlocked ? userSocials : {};
    return [
      { key: 'instagram', label: 'Instagram', value: socialsData?.instagram },
      { key: 'snapchat', label: 'Snapchat', value: socialsData?.snapchat },
      { key: 'discord', label: 'Discord', value: socialsData?.discord },
    ];
  }, [unlocked, userSocials]);

  const avatarUrl = targetPhotoUrl || getProfilePhotoUrl(user?.profilePhoto);
  const nameInitial = user?.name?.[0]?.toUpperCase() || '?';

  const waitingPulseScale = waitingPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const waitingPulseOpacity = waitingPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });

  /* ---------------- HANDLE SOCIAL PRESS ---------------- */
  const handleSocialPress = (social) => {
    if (!unlocked) return;

    const value = social.value;
    if (!value || value === 'Not set') {
      Alert.alert('Not Available', `${social.label} not set by user`);
      return;
    }

    Haptic.trigger('impactLight', hapticOptions);

    let url;
    switch (social.key) {
      case 'instagram':
        url = `https://instagram.com/${value.replace('@', '')}`;
        break;
      case 'snapchat':
        url = `https://snapchat.com/add/${value}`;
        break;
      case 'discord':
        Alert.alert('Discord', value, [{ text: 'OK' }]);
        return;
      default:
        return;
    }

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open ${social.label}`);
      }
    });
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            opacity: sheetOpacity,
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        {/* TIMER RING */}
        {unlocked && (
          <Animated.View
            style={[
              styles.timerRing,
              { transform: [{ rotate: ringRotate }] },
            ]}
          />
        )}

        {/* CLOSE */}
        <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
          <View style={styles.closeBtn}>
            <Text style={styles.closeText}>X</Text>
          </View>
        </TouchableWithoutFeedback>

        {/* AVATAR */}
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{nameInitial}</Text>
          )}
        </View>

        {/* NAME */}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.vibe}>{user?.vibe}</Text>

        {/* SOCIALS */}
        <View style={styles.socialRow}>
          {socials.map((social) => (
            <Pressable
              key={social.key}
              disabled={!unlocked}
              onPress={() => handleSocialPress(social)}
            >
              <View style={styles.socialWrap}>
                {/* BLUR */}
                {!unlocked && (
                  <Animated.View
                    style={[
                      styles.blurOverlay,
                      { opacity: blurFade },
                    ]}
                  />
                )}

                <Animated.View
                  style={[
                    styles.socialCard,
                    {
                      transform: [
                        {
                          scale: unlockAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          }),
                        },
                      ],
                      opacity: unlockAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      }),
                    },
                  ]}
                >
                  <Text style={styles.socialLabel}>{social.label}</Text>
                  <Text style={styles.socialValue}>
                    {unlocked ? social.value || 'Not set' : '🔒 Locked'}
                  </Text>
                </Animated.View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ERROR MESSAGE */}
        {error && !unlocked && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* PASS BUTTON */}
        {!unlocked && (
          <TouchableWithoutFeedback onPress={onPass}>
            <Animated.View
              style={[
                styles.passBtn,
                waiting && {
                  transform: [{ scale: waitingPulseScale }],
                  opacity: waitingPulseOpacity,
                },
              ]}
            >
              <Text style={styles.passText}>
                {waiting ? '⏳ Waiting for response...' : '✨ PASS'}
              </Text>
              {waiting && (
                <Text style={styles.passSubtext}>
                  They'll see your request!
                </Text>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        )}

        {/* CONNECTED */}
        {unlocked && (
          <View style={styles.connectedBtn}>
            <Text style={styles.connectedText}>
              🎉 Connected! {seconds}s remaining
            </Text>
            <Text style={styles.connectedSubtext}>
              Tap socials to connect outside the app
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  sheet: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    width: '92%',
    backgroundColor: 'rgba(16,16,24,0.96)',
    borderRadius: 32,
    paddingVertical: 34,
    paddingHorizontal: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.2)',
  },

  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: colors.muted,
    fontSize: 16,
  },

  timerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
    top: 22,
    opacity: 0.6,
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(124,92,255,0.3)',
  },

  avatarImg: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '600',
  },

  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },

  vibe: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  socialRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  socialWrap: {
    width: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },

  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },

  socialCard: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  socialLabel: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  socialValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  errorBanner: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.15)',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },

  errorText: {
    color: '#ff3b30',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },

  passBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  passText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },

  passSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },

  connectedBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 44,
    backgroundColor: 'rgba(124,92,255,0.15)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },

  connectedText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  connectedSubtext: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
