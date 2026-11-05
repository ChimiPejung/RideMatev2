// Android and iOS: keep the user signed in between app launches.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from '@firebase/auth';
import type { Persistence } from 'firebase/auth';

// getReactNativePersistence only exists in the React Native build of
// @firebase/auth (which Metro picks on phones), so the default type
// definitions don't list it.
const { getReactNativePersistence, initializeAuth } = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

export function createAuth(app: FirebaseApp) {
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}
