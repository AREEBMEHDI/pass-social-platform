import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { colors } from '../theme/colors';

export default function UnlockScreen({ navigation, route }) {
  const user = route?.params?.user;
  const revealAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!user) {
    navigation.popToTop();
    return null;
  }

  return (
    <View style={styles.container}>

      {/* TITLE */}
      <Text style={styles.title}>Connected</Text>
      <Text style={styles.subtitle}>
        You both chose to connect
      </Text>

      {/* CARD */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity: revealAnim,
            transform: [
              {
                translateY: revealAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.name}>{user.name}</Text>

        <View style={styles.socialRow}>
          <View style={styles.socialPill}>
            <Text style={styles.socialIcon}>📸</Text>
            <Text style={styles.socialText}>Instagram</Text>
          </View>

          <View style={styles.socialPill}>
            <Text style={styles.socialIcon}>💼</Text>
            <Text style={styles.socialText}>LinkedIn</Text>
          </View>
        </View>
      </Animated.View>

      {/* DONE */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.doneBtn}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.doneText}>Done</Text>
      </TouchableOpacity>

    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  title: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },

  subtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    marginBottom: 30,
  },

  card: {
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 22,
    borderRadius: 26,
    backgroundColor: 'rgba(20,20,30,0.92)',
    alignItems: 'center',

    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 18,
  },

  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 22,
  },

  socialRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flex: 1,
    marginHorizontal: 6,
  },

  socialIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  socialText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  doneBtn: {
    marginTop: 32,
    paddingHorizontal: 70,
    paddingVertical: 14,
    borderRadius: 40,
    backgroundColor: colors.primary,

    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 20,
  },

  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
