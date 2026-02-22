import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';

const API_BASE = 'https://cinespheres.org';
const ACCESS_TOKEN_KEY = 'accessToken';
const TOKEN_TYPE_KEY = 'tokenType';



export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(18)).current;
  const scaleBtn = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);



const handleLogin = async () => {
  if (!username || !password || loading) return;

  try {
    setLoading(true);

    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);

    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      credentials: 'include', // 🔥 REQUIRED for cookies
    });

    const payload = await res.json().catch(() => ({}));

    // ❌ Login failed
    if (!res.ok) {
      Alert.alert('Login failed', payload.message || 'Invalid credentials');
      return;
    }

    // ❌ Server bug / unexpected response
    if (!payload.access_token) {
      Alert.alert('Login failed', 'Invalid server response');
      return;
    }

    // ✅ Save access token
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token);
    await AsyncStorage.setItem(
      TOKEN_TYPE_KEY,
      payload.token_type || 'Bearer'
    );

    // ✅ Go to app
    navigation.replace('Radar');

  } catch (err) {
    console.log('LOGIN ERROR:', err);
    Alert.alert('Network error', 'Please try again');
  } finally {
    setLoading(false);
  }
};
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Ambient background */}
      <View style={styles.ambient}>
        <View style={styles.glowA} />
        <View style={styles.glowB} />
        <View style={styles.glowC} />
      </View>

      <Animated.View style={[styles.glowHalo, { opacity: glow }]} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [
              { translateY: translate },
              {
                translateY: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -6],
                }),
              },
            ],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>PASS</Text>
          <Text style={styles.tagline}>connections without pressure</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>welcome back</Text>
            <View style={styles.cardLine} />
          </View>

          <Text style={styles.inputLabel}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="your username (no spaces)"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="your password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.helper}>sign in to continue your radar</Text>
        </View>

        {/* CTA */}
        <Animated.View style={{ transform: [{ scale: scaleBtn }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.enterBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.enterText}>
              {loading ? 'ENTERING…' : 'ENTER RADAR'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Welcome')}
          style={styles.footer}
        >
          <View style={styles.footerPill}>
            <Text style={styles.footerText}>new here?</Text>
            <Text style={styles.footerAccent}>create your presence</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },

  ambient: {
    ...StyleSheet.absoluteFillObject,
  },

  glowA: {
    position: 'absolute',
    top: '18%',
    left: '12%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary,
    opacity: 0.08,
  },

  glowB: {
    position: 'absolute',
    bottom: '18%',
    right: '10%',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.success,
    opacity: 0.08,
  },

  glowC: {
    position: 'absolute',
    top: '4%',
    right: '32%',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    opacity: 0.06,
  },

  glowHalo: {
    position: 'absolute',
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124,92,255,0.08)',
  },

  content: {
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logo: {
    fontSize: 34,
    color: colors.text,
    letterSpacing: 10,
    fontWeight: '500',
  },

  tagline: {
    marginTop: 12,
    fontSize: 12,
    color: colors.muted,
    letterSpacing: 3,
    textTransform: 'lowercase',
  },

  card: {
    width: '100%',
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
  },

  cardHeader: {
    marginBottom: 14,
  },

  cardTitle: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  cardLine: {
    width: 46,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  input: {
    height: 54,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
  },

  inputLabel: {
    alignSelf: 'flex-start',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },

  helper: {
    color: colors.subtle,
    fontSize: 12,
    marginTop: 2,
  },

  enterBtn: {
    marginTop: 12,
    height: 56,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 10,
  },

  enterText: {
    color: '#fff',
    fontSize: 13,
    letterSpacing: 5,
    fontWeight: '600',
  },

  footer: {
    marginTop: 18,
    alignItems: 'center',
  },

  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  footerText: {
    fontSize: 12,
    color: colors.muted,
  },

  footerAccent: {
    color: colors.primary,
  },
});
