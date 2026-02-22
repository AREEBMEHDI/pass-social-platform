// WelcomeScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing } from 'react-native';
import { colors } from '../../theme/colors';

export default function WelcomeScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const fadeIn = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(14)).current;
  const glow = useRef(new Animated.Value(0)).current;

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
        Animated.timing(glow, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleContinue = () => {
    setError('');
    if (!username || !password) {
      setError('Please enter a username and password.');
      return;
    }

    navigation.navigate('Presence', { username, password });
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbRight} />
      <View style={styles.bgOrbBottom} />

      <Animated.View style={[styles.glowHalo, { opacity: glow }]} />

      <Animated.View style={[styles.content, { opacity: fadeIn, transform: [{ translateY: lift }] }]}>
        <Text style={styles.logo}>PASS</Text>
        <Text style={styles.sub}>enter quietly</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>create your pass</Text>
            <View style={styles.cardLine} />
          </View>

          <Text style={styles.inputLabel}>USERNAME</Text>
          <TextInput
            placeholder="choose a unique username (letters, numbers, no spaces)"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            placeholder="create a strong password (min 8 characters)"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.helper}>your details stay private until you choose to share</Text>
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.btn}
          onPress={handleContinue}
        >
          <Text style={styles.btnText}>CONTINUE</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124,92,255,0.16)',
    top: -90,
    left: -40,
  },
  bgOrbRight: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(108,255,181,0.12)',
    right: -80,
    top: 90,
  },
  bgOrbBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(124,92,255,0.12)',
    bottom: -140,
    left: 10,
  },
  glowHalo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124,92,255,0.08)',
  },
  content: {
    width: '100%',
    maxWidth: 420,
  },
  logo: {
    fontSize: 38,
    letterSpacing: 6,
    color: '#fff',
    marginBottom: 6,
  },
  sub: {
    color: colors.muted,
    marginBottom: 24,
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
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
    paddingHorizontal: 18,
    color: '#fff',
    fontSize: 15,
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
  errorText: {
    color: '#ff8a8a',
    marginTop: 2,
  },
  btn: {
    marginTop: 14,
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  btnText: {
    color: '#fff',
    letterSpacing: 2,
    fontWeight: '600',
  },
});
