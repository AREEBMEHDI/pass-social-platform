// AvatarScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { base } from '../../styles/onboardingBase';
import { avatar } from '../../styles/avatarStyles';

const AVATARS = [
  { id: 'coder', label: 'Coder', emoji: '🧑‍💻' },
  { id: 'reader', label: 'Reader', emoji: '📖' },
  { id: 'vibe', label: 'Vibing', emoji: '🎧' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮' },
  { id: 'chill', label: 'Chill', emoji: '☕' },
  { id: 'explore', label: 'Explorer', emoji: '🧭' },
];

const API_BASE = 'https://cinespheres.org';
const ACCESS_TOKEN_KEY = 'accessToken';
const TOKEN_TYPE_KEY = 'tokenType';

export default function AvatarScreen({ navigation, route }) {
  const params = route.params || {};
  const [selected, setSelected] = useState(null);
  const [photoUri, setPhotoUri] = useState('');
  const [photoAsset, setPhotoAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;
  const cardAnims = useRef(AVATARS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.stagger(
      80,
      cardAnims.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const handlePickPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.85,
    });

    if (result.didCancel) return;
    const asset = result.assets && result.assets[0];
    if (!asset || !asset.uri) return;

    setPhotoUri(asset.uri);
    setPhotoAsset(asset);
    setSelected(null);
  };

  const uploadProfilePhoto = async () => {
    if (!photoAsset || !photoAsset.uri) return true;

    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const tokenType = await AsyncStorage.getItem(TOKEN_TYPE_KEY);
    if (!token) {
      setError('Please sign in again to upload your photo.');
      return false;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: photoAsset.uri,
      name: photoAsset.fileName || 'profile.jpg',
      type: photoAsset.type || 'image/jpeg',
    });

    const res = await fetch(`${API_BASE}/api/me/profile-photo`, {
      method: 'POST',
      headers: {
        Authorization: `${tokenType || 'Bearer'} ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.message || 'Failed to upload photo.');
      return false;
    }

    return true;
  };

  const handleContinue = async () => {
    setError('');
    if (photoUri) {
      try {
        setUploading(true);
        const ok = await uploadProfilePhoto();
        if (!ok) return;
      } finally {
        setUploading(false);
      }
    }

    navigation.navigate('Socials', {
      ...params,
      avatar: selected,
      photoUri,
    });
  };

  return (
    <View style={base.screen}>
      <View style={avatar.bgOrbTop} />
      <View style={avatar.bgOrbRight} />
      <View style={avatar.bgOrbBottom} />

      <View style={base.center}>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: lift }] }}>
          <Text style={base.title}>choose your avatar</Text>
          <Text style={base.subtitle}>
            pick one that feels like you
          </Text>
        </Animated.View>

        <Animated.View style={[avatar.photoWrap, { opacity: fadeIn, transform: [{ translateY: lift }] }]}>
          <Pressable style={avatar.photoCard} onPress={handlePickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={avatar.photoPreview} />
            ) : (
              <View style={avatar.photoPlaceholder}>
                <Text style={avatar.photoTitle}>upload profile photo</Text>
                <Text style={avatar.photoSub}>optional • recommended</Text>
              </View>
            )}
          </Pressable>

          {photoUri ? (
            <TouchableOpacity
              style={avatar.photoClear}
              onPress={() => {
                setPhotoUri('');
                setPhotoAsset(null);
              }}
            >
              <Text style={avatar.photoClearText}>remove photo</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>

        {!!error && <Text style={avatar.errorText}>{error}</Text>}

        <View style={avatar.divider}>
          <View style={avatar.dividerLine} />
          <Text style={avatar.dividerText}>or choose an avatar</Text>
          <View style={avatar.dividerLine} />
        </View>

        <View style={avatar.grid}>
          {AVATARS.map((a, index) => {
            const active = selected === a.id;

            return (
              <Animated.View
                key={a.id}
                style={{
                  opacity: cardAnims[index],
                  transform: [
                    {
                      translateY: cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => setSelected(a.id)}
                  style={[
                    avatar.card,
                    active && avatar.cardActive,
                  ]}
                >
                  <Text style={avatar.emoji}>{a.emoji}</Text>
                  <Text
                    style={[
                      avatar.label,
                      active && avatar.labelActive,
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <TouchableOpacity
          style={base.button}
          disabled={!selected && !photoUri}
          onPress={handleContinue}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={base.buttonText}>CONTINUE</Text>}
        </TouchableOpacity>

        <Text style={avatar.helper}>
          avatars help you appear without sharing a photo
        </Text>

      </View>
    </View>
  );
}
