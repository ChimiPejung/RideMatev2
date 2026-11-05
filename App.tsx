import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { isFirebaseConfigured } from './src/firebaseConfig';
import { colors } from './src/theme';

function SetupNeeded() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: colors.canvas, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink900 }}>Connect Firebase first</Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: colors.ink700 }}>
        Open src/firebaseConfig.ts and paste the config of your Firebase Web app. The README explains where to find it.
        Save the file and the app reloads by itself.
      </Text>
    </ScrollView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  if (!isFirebaseConfigured) {
    return (
      <SafeAreaProvider>
        <SetupNeeded />
      </SafeAreaProvider>
    );
  }

  // Loaded lazily so the app can show the setup screen without a valid config.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AuthProvider } = require('./src/data/auth') as typeof import('./src/data/auth');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RootNavigator = (require('./src/navigation/RootNavigator') as typeof import('./src/navigation/RootNavigator')).default;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
