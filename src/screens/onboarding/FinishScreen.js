import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
} from 'react-native';

import { base } from '../../styles/onboardingBase';
import { finish } from '../../styles/finishStyles';

export default function FinishScreen({ navigation }) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Text fade
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Radar pulses
    Animated.loop(
      Animated.stagger(800, [
        Animated.timing(pulse1, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse2, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto enter radar
    const t = setTimeout(() => {
      navigation.replace('Radar');
    }, 4200);

    return () => clearTimeout(t);
  }, []);

  const scale1 = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1.6],
  });

  const scale2 = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 2.2],
  });

  const opacity = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });

  return (
    <View style={base.screen}>
      <View style={finish.bgOrbTop} />
      <View style={finish.bgOrbRight} />
      <View style={finish.bgOrbBottom} />
      <Animated.View style={[finish.glowHalo, { opacity: shimmer }]} />

      <View style={finish.center}>

        {/* RADAR CIRCLES */}
        <View style={finish.radarWrap}>
          <Animated.View
            style={[
              finish.pulse,
              {
                transform: [{ scale: scale1 }],
                opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              finish.pulse,
              {
                transform: [{ scale: scale2 }],
                opacity,
              },
            ]}
          />

          {/* CENTER DOT */}
          <View style={finish.dot} />
        </View>

        {/* TEXT */}
        <Animated.View style={{ opacity: fadeIn }}>
          <Text style={finish.title}>you&apos;re in</Text>
          <Text style={finish.subtitle}>
            visibility is always your choice
          </Text>
        </Animated.View>

      </View>
    </View>
  );
}
