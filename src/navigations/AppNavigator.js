import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RadarScreen from '../screens/RadarScreen';
import PassScreen  from '../screens/PassScreen';
import MatchScreen from '../screens/MatchScreen'
import UnlockScreen from '../screens/UnlockScreen'
import LoginScreen from '../screens/LoginScreen'
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PresenceScreen from '../screens/onboarding/PresenceScreen';
import AvatarScreen from '../screens/onboarding/AvatarScreen';
import SocialsScreen from '../screens/onboarding/SocialsScreen';
import FinishScreen from '../screens/onboarding/FinishScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import { initializeNotifications, cleanupNotifications } from '../services/notificationService';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [accessToken, setAccessToken] = useState(null);

  /* ---------- LOAD AUTH AND INITIALIZE NOTIFICATIONS ---------- */
  useEffect(() => {
    const loadAuthAndInitNotifications = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        setAccessToken(token);

        if (token) {
          // Initialize global notifications
          await initializeNotifications(token);
          console.log('✅ Global notifications initialized in AppNavigator');
        }
      } catch (err) {
        console.warn('Failed to load auth or initialize notifications:', err);
      }
    };

    loadAuthAndInitNotifications();

    // Poll for token changes (in case of login/logout)
    const interval = setInterval(() => {
      AsyncStorage.getItem('accessToken').then((token) => {
        if (token !== accessToken) {
          setAccessToken(token);
        }
      });
    }, 2000); // Check every 2 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      cleanupNotifications();
    };
  }, [accessToken]);

  /* ---------- RE-INITIALIZE WHEN TOKEN CHANGES ---------- */
  useEffect(() => {
    if (accessToken) {
      initializeNotifications(accessToken);
    }
  }, [accessToken]);

  return (
    <Stack.Navigator
  initialRouteName="Login"
  screenOptions={{ headerShown: false }}
>

      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Radar" component={RadarScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
      <Stack.Screen name="Pass" component={PassScreen} />
      <Stack.Screen name="Match" component={MatchScreen} />
      <Stack.Screen name="Unlock" component={UnlockScreen} />


       <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Presence" component={PresenceScreen} />
      <Stack.Screen name="Avatar" component={AvatarScreen} />
      <Stack.Screen name="Socials" component={SocialsScreen} />
      <Stack.Screen name="Finish" component={FinishScreen} />


    </Stack.Navigator>
  );
}
