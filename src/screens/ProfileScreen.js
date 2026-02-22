import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  Modal,
  Animated,
  Pressable,
  Easing,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { API_CONFIG } from './Config';

const ALL_SOCIALS = [
  {
    key: 'instagram',
    label: 'instagram username',
    icon: require('../assets/icons/insta.png'),
  },
  {
    key: 'facebook',
    label: 'facebook username',
    icon: require('../assets/icons/fb.png'),
  },
  {
    key: 'snapchat',
    label: 'snapchat username',
    icon: require('../assets/icons/sc.png'),
  },
  {
    key: 'discord',
    label: 'discord username',
    icon: require('../assets/icons/discord.png'),
  },
  {
    key: 'linkedin',
    label: 'linkedin username',
    icon: require('../assets/icons/linkedin.png'),
  },
  {
    key: 'twitter',
    label: 'twitter / x username',
    icon: require('../assets/icons/twitter.png'),
  },
  {
    key: 'website',
    label: 'website url',
    icon: require('../assets/icons/web.png'),
  },
];

const DEFAULT_SOCIAL_KEYS = ['instagram', 'facebook'];

const formatDate = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
};

const buildPhotoUrl = (photoKey) => {
  if (!photoKey) return null;
  const base = API_CONFIG.S3_BASE_URL.replace(/\/$/, '');
  return `${base}/${photoKey}`;
};

const getInitials = (value) => {
  if (!value) return 'U';
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

export default function ProfileScreen({ navigation }) {
  const [accessToken, setAccessToken] = useState(null);
  const [tokenReady, setTokenReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);
  const [photoPreviewUri, setPhotoPreviewUri] = useState('');
  const [photoAsset, setPhotoAsset] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [editState, setEditState] = useState({
    displayName: '',
    vibe: '',
    gender: '',
  });
  const [socialData, setSocialData] = useState({});
  const [visibleSocialKeys, setVisibleSocialKeys] = useState(DEFAULT_SOCIAL_KEYS);
  const [showSocialSheet, setShowSocialSheet] = useState(false);

  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    let mounted = true;

    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (mounted) {
          setAccessToken(token);
        }
      } catch (err) {
        console.warn('Failed to load access token:', err);
      } finally {
        if (mounted) {
          setTokenReady(true);
        }
      }
    };

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  const fetchProfile = useCallback(
    async (token, isRefresh = false) => {
      if (!token) {
        setError('Please log in to view your profile.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/my_profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load profile');
        }

        setProfile(data);
        setError(null);
      } catch (err) {
        console.warn('Profile fetch error:', err);
        setError(err?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const fetchProfilePhoto = useCallback(async () => {
    if (!accessToken) return;

    try {
      const tokenType = await AsyncStorage.getItem('tokenType');
      const authHeader = `${tokenType || 'Bearer'} ${accessToken}`;
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/me/profile-photo`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        setProfilePhotoUrl(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load profile photo');
      }

      const data = await response.json();
      setProfilePhotoUrl(data?.profile_photo_url || null);
    } catch (err) {
      console.warn('Profile photo fetch error:', err);
      setProfilePhotoUrl(null);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!tokenReady) return;
    if (!accessToken) {
      setLoading(false);
      setError('Please log in to view your profile.');
      return;
    }
    fetchProfile(accessToken);
  }, [tokenReady, accessToken, fetchProfile]);

  useEffect(() => {
    fetchProfilePhoto();
  }, [fetchProfilePhoto]);

  const initializeEditState = useCallback((data) => {
    if (!data) return;
    const profileData = data?.profile || {};
    const incomingSocials = data?.socials || {};
    const knownKeys = ALL_SOCIALS.map((item) => item.key);
    const keysWithValues = knownKeys.filter((key) => incomingSocials[key]);

    setEditState({
      displayName: profileData?.display_name || data?.name || '',
      vibe: profileData?.vibe || '',
      gender: profileData?.gender || '',
    });
    setSocialData(incomingSocials);
    setVisibleSocialKeys(keysWithValues.length ? keysWithValues : DEFAULT_SOCIAL_KEYS);
  }, []);

  useEffect(() => {
    if (!profile) return;
    initializeEditState(profile);
  }, [profile, initializeEditState]);

  const displayName = profile?.profile?.display_name || profile?.name || 'Unknown';
  const username = profile?.username ? `@${profile.username}` : null;
  const vibe = profile?.profile?.vibe || null;
  const gender = profile?.profile?.gender || null;
  const isActive = profile?.is_active;
  const memberSince = useMemo(() => formatDate(profile?.created_at), [profile]);
  const avatarUrl = profilePhotoUrl || buildPhotoUrl(profile?.profile?.profile_photo_key);
  const displayAvatarUrl = isEditing && photoPreviewUri ? photoPreviewUri : avatarUrl;

  const handlePickPhoto = async () => {
    if (!isEditing) return;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.85,
    });

    if (result.didCancel) return;
    const asset = result.assets && result.assets[0];
    if (!asset || !asset.uri) return;

    setPhotoPreviewUri(asset.uri);
    setPhotoAsset(asset);
  };
  const initials = getInitials(displayName);
  const socials = profile?.socials || {};
  const socialEntries = Object.entries(socials).filter(([, value]) => value);

  const visibleSocials = ALL_SOCIALS.filter((item) => visibleSocialKeys.includes(item.key));
  const remainingSocials = ALL_SOCIALS.filter((item) => !visibleSocialKeys.includes(item.key));

  const openSocialSheet = () => {
    setShowSocialSheet(true);
    requestAnimationFrame(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeSocialSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(300);
      setShowSocialSheet(false);
    });
  };

  const addSocialKey = (key) => {
    setVisibleSocialKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    closeSocialSheet();
  };

  const clearSocial = (key) => {
    setSocialData((prev) => ({ ...prev, [key]: '' }));
  };

  const saveProfile = async () => {
    if (!accessToken || saving) return;
    setSaving(true);
    setSaveError('');

    const displayName = editState.displayName.trim();
    const genderValue = editState.gender.trim().toLowerCase();
    const vibeValue = editState.vibe.trim();

    if (!displayName) {
      setSaveError('Display name is required.');
      setSaving(false);
      return;
    }

    if (genderValue && !['male', 'female'].includes(genderValue)) {
      setSaveError('Gender must be male or female.');
      setSaving(false);
      return;
    }

    const cleanedSocials = Object.entries(socialData).reduce((acc, [key, value]) => {
      const trimmedValue = String(value || '').trim();
      if (trimmedValue) {
        acc[key] = trimmedValue;
      }
      return acc;
    }, {});

    const profilePayload = {
      display_name: displayName,
      vibe: vibeValue,
      ...(genderValue ? { gender: genderValue } : {}),
    };

    try {
      if (photoAsset && photoAsset.uri) {
        setUploadingPhoto(true);
        const tokenType = await AsyncStorage.getItem('tokenType');
        const authHeader = `${tokenType || 'Bearer'} ${accessToken}`;
        const formData = new FormData();
        formData.append('file', {
          uri: photoAsset.uri,
          name: photoAsset.fileName || 'profile.jpg',
          type: photoAsset.type || 'image/jpeg',
        });

        const photoResponse = await fetch(`${API_CONFIG.BASE_URL}/api/me/profile-photo`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
          body: formData,
        });

        if (!photoResponse.ok) {
          const payload = await photoResponse.json().catch(() => ({}));
          throw new Error(payload.message || 'Failed to upload photo');
        }

        await fetchProfilePhoto();
        setPhotoPreviewUri('');
        setPhotoAsset(null);
      }

      const detailsResponse = await fetch(`${API_CONFIG.BASE_URL}/my_profile/details`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profilePayload),
      });

      const detailsData = await detailsResponse.json();
      if (!detailsResponse.ok || !detailsData.success) {
        throw new Error(detailsData.error || 'Failed to save profile details');
      }

      if (Object.keys(cleanedSocials).length) {
        const tokenType = await AsyncStorage.getItem('tokenType');
        const authHeader = `${tokenType || 'Bearer'} ${accessToken}`;
        const entries = Object.entries(cleanedSocials);

        for (const [platform, handle] of entries) {
          const socialResponse = await fetch(`${API_CONFIG.BASE_URL}/api/me/socials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({ platform, handle }),
          });

          if (!socialResponse.ok) {
            const payload = await socialResponse.json().catch(() => ({}));
            console.warn(`Failed to save ${platform}:`, payload.message);
          }
        }
      }

      setIsEditing(false);
      fetchProfile(accessToken);
    } catch (err) {
      console.warn('Profile save error:', err);
      setSaveError(err?.message || 'Failed to save profile');
    } finally {
      setUploadingPhoto(false);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    const needsLogin = tokenReady && !accessToken;
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              if (needsLogin) {
                navigation.replace('Login');
                return;
              }
              fetchProfile(accessToken);
            }}
          >
            <Text style={styles.retryText}>{needsLogin ? 'Go to Login' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={[styles.editButton, saving && styles.editButtonDisabled]}
          disabled={saving}
          onPress={() => {
            if (isEditing) {
              saveProfile();
              return;
            }
            setIsEditing(true);
          }}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? (saving ? 'Saving' : 'Save') : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={refreshing}
            onRefresh={() => fetchProfile(accessToken, true)}
          />
        }
      >
        <View style={styles.profileCard}>
          <View style={styles.profileCardGlow} />
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickPhoto}
            activeOpacity={isEditing ? 0.75 : 1}
            disabled={!isEditing}
          >
            {displayAvatarUrl ? (
              <Image source={{ uri: displayAvatarUrl }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </TouchableOpacity>
          {isEditing ? (
            <Text style={styles.avatarHint}>
              {uploadingPhoto ? 'Uploading photo...' : 'Tap avatar to change photo'}
            </Text>
          ) : null}

          <Text style={styles.name}>{displayName}</Text>
          {username ? <Text style={styles.username}>{username}</Text> : null}

          <View style={styles.metaRow}>
            <View style={[styles.pill, isActive ? styles.pillActive : styles.pillMuted]}>
              <Text style={styles.pillText}>{isActive ? 'Active' : 'Hidden'}</Text>
            </View>
          </View>

          {memberSince ? (
            <Text style={styles.memberSince}>Member since {memberSince}</Text>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About</Text>
          {isEditing ? (
            <View style={styles.editStack}>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Display name</Text>
                <TextInput
                  value={editState.displayName}
                  onChangeText={(text) => setEditState((prev) => ({ ...prev, displayName: text }))}
                  placeholder="Your name"
                  placeholderTextColor={colors.subtle}
                  style={styles.input}
                />
              </View>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Vibe</Text>
                <TextInput
                  value={editState.vibe}
                  onChangeText={(text) => setEditState((prev) => ({ ...prev, vibe: text }))}
                  placeholder="Short line about you"
                  placeholderTextColor={colors.subtle}
                  style={[styles.input, styles.inputTall]}
                  multiline
                />
              </View>
              <View style={styles.editRow}>
                <Text style={styles.editLabel}>Gender</Text>
                <TextInput
                  value={editState.gender}
                  onChangeText={(text) => setEditState((prev) => ({ ...prev, gender: text }))}
                  placeholder="Gender"
                  placeholderTextColor={colors.subtle}
                  style={styles.input}
                />
              </View>
            </View>
          ) : (
            <>
              {vibe ? (
                <Text style={styles.bodyText}>"{vibe}"</Text>
              ) : (
                <Text style={styles.bodyMuted}>Add a vibe to help people find you.</Text>
              )}
              {gender ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Gender</Text>
                  <Text style={styles.value}>{gender}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Socials</Text>
          {isEditing ? (
            <View style={styles.editStack}>
              {visibleSocials.map((item) => (
                <View key={item.key} style={styles.socialCard}>
                  <Image source={item.icon} style={styles.socialIcon} />
                  <TextInput
                    value={socialData[item.key] || ''}
                    onChangeText={(text) =>
                      setSocialData((prev) => ({ ...prev, [item.key]: text }))
                    }
                    placeholder={item.label}
                    placeholderTextColor={colors.subtle}
                    style={styles.socialInput}
                    autoCapitalize="none"
                  />
                  {!!socialData[item.key] && (
                    <TouchableOpacity style={styles.socialClear} onPress={() => clearSocial(item.key)}>
                      <Text style={styles.socialClearText}>x</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {remainingSocials.length > 0 && (
                <TouchableOpacity style={styles.addSocialButton} onPress={openSocialSheet}>
                  <Text style={styles.addSocialText}>Add more</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  initializeEditState(profile);
                  setIsEditing(false);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : socialEntries.length ? (
            socialEntries.map(([key, value]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.label}>{key}</Text>
                <Text style={styles.value}>{value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.bodyMuted}>No socials yet.</Text>
          )}
          {isEditing && saveError ? (
            <Text style={styles.saveError}>{saveError}</Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal transparent visible={showSocialSheet} animationType="none">
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetOverlay} onPress={closeSocialSheet} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add a social</Text>
            <View style={styles.sheetGrid}>
              {remainingSocials.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.sheetItem}
                  onPress={() => addSocialKey(item.key)}
                >
                  <Image source={item.icon} style={styles.sheetIcon} />
                  <Text style={styles.sheetText}>
                    {item.key === 'twitter'
                      ? 'Twitter / X'
                      : item.key.charAt(0).toUpperCase() + item.key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={closeSocialSheet}>
              <Text style={styles.sheetCancel}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primarySoft,
    opacity: 0.35,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primarySoft,
    opacity: 0.2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 14,
    color: colors.muted,
    fontSize: 13,
  },
  errorText: {
    color: 'rgba(255,120,120,0.9)',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  back: {
    color: colors.muted,
    fontSize: 14,
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  editButtonDisabled: {
    opacity: 0.6,
  },
  editButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    overflow: 'hidden',
  },
  profileCardGlow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primarySoft,
    opacity: 0.35,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  avatarHint: {
    marginTop: 6,
    color: colors.subtle,
    fontSize: 11,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  username: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(108,255,181,0.12)',
    borderColor: 'rgba(108,255,181,0.35)',
  },
  pillMuted: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: {
    color: colors.text,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  memberSince: {
    marginTop: 10,
    color: colors.subtle,
    fontSize: 12,
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: 'rgba(18,18,26,0.82)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  bodyText: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  bodyMuted: {
    color: colors.muted,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    color: colors.subtle,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  value: {
    color: colors.text,
    fontSize: 13,
  },
  editStack: {
    gap: 12,
  },
  editRow: {
    gap: 8,
  },
  editLabel: {
    color: colors.subtle,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
  },
  inputTall: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  socialIcon: {
    width: 22,
    height: 22,
  },
  socialInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  addSocialButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  addSocialText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    color: colors.muted,
    fontSize: 12,
  },
  socialClear: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,120,120,0.18)',
  },
  socialClearText: {
    color: 'rgba(255,140,140,0.9)',
    fontWeight: '700',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    padding: 20,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  sheetItem: {
    width: '48%',
    backgroundColor: colors.glass,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetIcon: {
    width: 24,
    height: 24,
    marginBottom: 8,
  },
  sheetText: {
    color: colors.text,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  sheetCancel: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
  },
  saveError: {
    marginTop: 12,
    color: 'rgba(255,120,120,0.9)',
    fontSize: 12,
  },
});
