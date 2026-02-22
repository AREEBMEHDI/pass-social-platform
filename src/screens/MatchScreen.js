import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';

export default function MatchScreen({ navigation, route }) {
  const { user } = route.params;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>

      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0.8],
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.matchText}>IT’S A MATCH</Text>

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.vibe}>{user.vibe}</Text>

        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={() =>
            navigation.navigate('Unlock', { user })
          }
        >
          <Text style={styles.unlockText}>Unlock socials</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* BACKGROUND GLOW */
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: colors.primary,
  },

  /* MATCH CARD */
  card: {
    width: '82%',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 28,
    backgroundColor: 'rgba(20,20,30,0.92)',
    alignItems: 'center',

    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 25,
  },

  /* MAIN TEXT */
  matchText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 18,
  },

  /* USER NAME */
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 6,
  },

  /* USER VIBE */
  vibe: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 28,
  },

  /* UNLOCK BUTTON */
  unlockBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 40,

    shadowColor: colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },

  unlockText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});


