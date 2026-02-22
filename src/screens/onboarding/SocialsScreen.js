import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
  Pressable,
  Easing,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { base } from '../../styles/onboardingBase';
import { socials } from '../../styles/socialsStyles';

/* ----------------------------------------
   ALL SOCIAL OPTIONS
---------------------------------------- */
const ALL_SOCIALS = [
  { key: 'instagram', label: 'instagram username', icon: require('../../assets/icons/insta.png'), style: socials.instagram },
  { key: 'facebook', label: 'facebook username', icon: require('../../assets/icons/fb.png'), style: socials.facebook },
  { key: 'snapchat', label: 'snapchat username', icon: require('../../assets/icons/sc.png'), style: socials.snapchat },
  { key: 'discord', label: 'discord username', icon: require('../../assets/icons/discord.png'), style: socials.discord },
  { key: 'linkedin', label: 'linkedin username', icon: require('../../assets/icons/linkedin.png'), style: socials.linkedin },
  { key: 'twitter', label: 'twitter / x username', icon: require('../../assets/icons/twitter.png'), style: socials.twitter },
  { key: 'website', label: 'website url', icon: require('../../assets/icons/web.png'), style: socials.website },
];

const API_BASE = 'https://cinespheres.org';
const ACCESS_TOKEN_KEY = 'accessToken';
const TOKEN_TYPE_KEY = 'tokenType';

export default function SocialsScreen({ navigation }) {
  const [data, setData] = useState({});
  const [visibleKeys, setVisibleKeys] = useState(['instagram', 'facebook']);
  const [showSheet, setShowSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const visibleSocials = ALL_SOCIALS.filter(s => visibleKeys.includes(s.key));
  const remainingSocials = ALL_SOCIALS.filter(s => !visibleKeys.includes(s.key));

  const clearField = key => {
    setData(prev => ({ ...prev, [key]: '' }));
  };

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  /* ----------------------------------------
     BOTTOM SHEET
  ---------------------------------------- */
  const openSheet = () => {
    setShowSheet(true);
    requestAnimationFrame(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(300);
      setShowSheet(false);
    });
  };

  const addSocial = key => {
    setVisibleKeys(prev => [...prev, key]);
    closeSheet();
  };

  /* ----------------------------------------
     SAVE SOCIALS
  ---------------------------------------- */
  const handleContinue = async () => {
    setError('');

    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const tokenType = await AsyncStorage.getItem(TOKEN_TYPE_KEY);

    if (!token) {
      setError('Authentication missing. Please sign in again.');
      return;
    }

    const entries = Object.entries(data).filter(
      ([_, value]) => value && value.trim()
    );

    try {
      setLoading(true);

      for (const [platform, handle] of entries) {
        const res = await fetch(`${API_BASE}/api/me/socials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${tokenType || 'Bearer'} ${token}`,
          },
          body: JSON.stringify({
            platform,
            handle,
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          console.warn(`Failed to save ${platform}:`, payload.message);
          // ❗ intentionally NOT blocking onboarding
        }
      }

      navigation.navigate('Finish');

    } catch {
      setError('Network error while saving socials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={base.screen}>
      <View style={socials.bgOrbTop} />
      <View style={socials.bgOrbRight} />
      <View style={socials.bgOrbBottom} />
      <Animated.View style={[socials.glowHalo, { opacity: shimmer }]} />

      <View style={base.center}>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: lift }] }}>
          <Text style={base.title}>your socials</Text>
          <Text style={base.subtitle}>choose what to share. all optional.</Text>
        </Animated.View>

        {visibleSocials.map(item => (
          <Animated.View
            key={item.key}
            style={[
              socials.card,
              item.style,
              { opacity: fadeIn, transform: [{ translateY: lift }] },
            ]}
          >
            <Image source={item.icon} style={socials.socialIcon} />

            <TextInput
              placeholder={item.label}
              placeholderTextColor={socials.placeholder}
              value={data[item.key] || ''}
              onChangeText={v =>
                setData(prev => ({ ...prev, [item.key]: v }))
              }
              style={socials.input}
            />

            {!!data[item.key] && (
              <TouchableOpacity onPress={() => clearField(item.key)}>
                <Text style={socials.emojiBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        ))}

        {remainingSocials.length > 0 && (
          <TouchableOpacity style={socials.addMore} onPress={openSheet}>
            <Text style={socials.emojiAdd}>＋</Text>
            <Text style={socials.addMoreText}>add more</Text>
          </TouchableOpacity>
        )}

        <View style={socials.privacyWrap}>
          <Text style={socials.emojiLock}>🔒</Text>
          <View>
            <Text style={socials.privacyTitle}>your socials are private</Text>
            <Text style={socials.privacyText}>
              they only unlock when both people agree
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={base.button}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={base.buttonText}>CONTINUE</Text>}
        </TouchableOpacity>

        {!!error && <Text style={socials.errorText}>{error}</Text>}
        <Text style={base.skip}>skip</Text>

      </View>

      {/* ----------------------------------------
          BOTTOM SHEET
      ---------------------------------------- */}
      <Modal transparent visible={showSheet} animationType="none">
        <View style={{ flex: 1 }}>
          <Pressable style={socials.overlay} onPress={closeSheet} />

          <Animated.View
            style={[
              socials.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={socials.sheetHandle} />
            <Text style={socials.sheetTitle}>add a social</Text>

            <View style={socials.sheetGrid}>
              {remainingSocials.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[socials.sheetItem, item.style]}
                  onPress={() => addSocial(item.key)}
                >
                  <Image source={item.icon} style={socials.sheetIcon} />
                  <Text style={socials.sheetText}>
                    {item.key === 'twitter'
                      ? 'Twitter / X'
                      : item.key.charAt(0).toUpperCase() + item.key.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={closeSheet}>
              <Text style={socials.cancel}>cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
