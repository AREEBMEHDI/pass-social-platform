// PresenceScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { base } from '../../styles/onboardingBase';
import { presence } from '../../styles/presenceStyles';
import { colors } from '../../theme/colors';

const API_BASE = 'https://cinespheres.org';
const ACCESS_TOKEN_KEY = 'accessToken';
const TOKEN_TYPE_KEY = 'tokenType';

const VIBES = [
  'coding',
  'open to conversation',
  'just chilling',
  'focused',
  'here quietly',
  'exploring',
];

export default function PresenceScreen({ navigation, route }) {
  const { username, password } = route.params || {};

  const [name, setName] = useState('');
  const [gender, setGender] = useState(null);
  const [vibe, setVibe] = useState(null);
  const [customVibe, setCustomVibe] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;

  const finalVibe = customVibe.trim() || vibe;

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
  }, []);

  // 🔐 REGISTER USER HERE
  const handleRegister = async () => {
    if (!name || !gender || !finalVibe) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          display_name: name,
          gender,
          vibe: finalVibe,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        Alert.alert('Error', payload.message || 'Registration failed');
        return;
      }

      // ✅ STORE TOKENS
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
      await AsyncStorage.setItem(
        TOKEN_TYPE_KEY,
        payload.token_type || 'Bearer'
      );

      // ✅ USER NOW EXISTS
      navigation.navigate('Avatar', {
        displayName: name,
        gender,
        vibe: finalVibe,
      });

    } catch {
      Alert.alert('Network error', 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={base.screen}>
      <View style={base.center}>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: lift }] }}>
          <Text style={base.title}>your presence</Text>
          <Text style={base.subtitle}>how you appear on the radar</Text>
        </Animated.View>

        <Text style={presence.label}>DISPLAY NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="what should we call you?"
          placeholderTextColor={colors.muted}
          style={base.input}
        />

        <Text style={presence.label}>GENDER</Text>
        <View style={presence.genderWrap}>
          {['male', 'female'].map(g => {
            const active = gender === g;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGender(g)}
                style={[presence.gender, active && presence.genderActive]}
              >
                <Text style={[presence.genderText, active && { color: '#fff' }]}>
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={presence.label}>VIBE</Text>
        <View style={presence.vibeWrap}>
          {VIBES.map(v => {
            const active = vibe === v && !customVibe;
            return (
              <TouchableOpacity
                key={v}
                onPress={() => {
                  setVibe(v);
                  setCustomVibe('');
                }}
                style={[presence.vibe, active && presence.vibeActive]}
              >
                <Text style={[presence.vibeText, active && { color: '#fff' }]}>
                  {v}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          value={customVibe}
          onChangeText={text => {
            setCustomVibe(text);
            if (text) setVibe(null);
          }}
          placeholder="type your own vibe"
          placeholderTextColor={colors.muted}
          style={base.input}
        />

        <TouchableOpacity
          style={base.button}
          disabled={!name || !gender || !finalVibe || loading}
          onPress={handleRegister}
        >
          <Text style={base.buttonText}>
            {loading ? 'CREATING...' : 'NEXT'}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
