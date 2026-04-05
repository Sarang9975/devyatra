import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen, CountdownAlertScreen, LiveMapScreen, IncidentHistoryScreen } from './src/screens';
import { FakeCallScreen } from './src/screens/FakeCallScreen';
import { StatusBar, View } from 'react-native';
import { PermissionSetupScreen } from './src/screens/PermissionSetupScreen';
import { checkMultiple, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { initHardwareTriggers } from './src/services/HardwareTriggerService';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  // Start as false — show permission screen by default until we confirm they're all granted
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 🛡️ Shadow-Link Hardware Monitor Start
    const cleanup = initHardwareTriggers();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    checkMultiple([
      PERMISSIONS.ANDROID.RECORD_AUDIO,
      PERMISSIONS.ANDROID.CAMERA,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      PERMISSIONS.ANDROID.SEND_SMS,
      PERMISSIONS.ANDROID.CALL_PHONE,
      (PERMISSIONS.ANDROID as any).POST_NOTIFICATIONS,
    ]).then(results => {
      const allGranted = Object.values(results).every(
        r => r === RESULTS.GRANTED || r === RESULTS.UNAVAILABLE
      );
      setPermissionsGranted(allGranted);
      setChecking(false);
    }).catch(() => {
      setChecking(false); // Show permission screen on error too
    });
  }, []);

  // Show app background color while checking (no black flash)
  if (checking) {
    return <View style={{ flex: 1, backgroundColor: '#0f172a' }} />;
  }

  // Permissions not yet granted — show setup screen first
  if (!permissionsGranted) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <PermissionSetupScreen onAllGranted={() => setPermissionsGranted(true)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
        initialRouteName="Dashboard"
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
          name="CountdownAlert"
          component={CountdownAlertScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="LiveMap"
          component={LiveMapScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="IncidentHistory" component={IncidentHistoryScreen} />
        <Stack.Screen 
          name="FakeCall" 
          component={FakeCallScreen} 
          options={{ animation: 'fade' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
