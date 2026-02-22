import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View } from 'react-native';
import AppNavigator from './src/navigations/AppNavigator';
import { initSocket, disconnectSocket } from './src/socket';
import SplashOverlay from './src/components/SplashOverlay';

const SOCKET_URL = 'https://cinespheres.org';

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    let mounted = true;

    const startSocket = async () => {
      try {
        if (!mounted) return;

        console.log('🚀 App: Initializing global socket');
        await initSocket(SOCKET_URL);
        console.log('✅ App: Global socket ready');
      } catch (err) {
        console.warn('⚠️ App: Socket init skipped:', err.message);
      }
    };

    startSocket();

    return () => {
      mounted = false;
      console.log('🔌 App: Disconnecting global socket');
      disconnectSocket();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B12' }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <SplashOverlay
        visible={splashVisible}
        onFinish={() => setSplashVisible(false)}
      />
    </View>
  );
}
