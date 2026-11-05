import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Loading } from '../components/ui';
import { useAuth } from '../data/auth';
import { SessionProvider } from '../data/session';
import ChatsScreen from '../screens/ChatsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import DirectChatScreen from '../screens/DirectChatScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupListScreen from '../screens/GroupListScreen';
import HomeScreen from '../screens/HomeScreen';
import MyRidesScreen from '../screens/MyRidesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RateRidersScreen from '../screens/RateRidersScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import VerifyScreen from '../screens/VerifyScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { colors, fonts } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
export const navRef = createNavigationContainerRef<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.canvas, card: colors.surface, text: colors.ink900, primary: colors.ink900, border: colors.lineSoft },
};

const TAB_ICONS: Record<keyof TabParamList, [React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']]> = {
  Rides: ['car', 'car-outline'],
  Groups: ['grid', 'grid-outline'],
  Chats: ['chatbubble', 'chatbubble-outline'],
  Profile: ['person', 'person-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink900,
        tabBarInactiveTintColor: colors.ink300,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.lineSoft },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Rides" component={HomeScreen} />
      <Tab.Screen name="Groups" component={MyRidesScreen} options={{ title: 'My rides' }} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

type NotificationData = { screen?: string; groupId?: string; threadId?: string };

function openFromNotification(data: NotificationData) {
  if (!navRef.isReady()) return;
  if (data.screen === 'GroupChat' && data.groupId) navRef.navigate('GroupChat', { groupId: data.groupId });
  else if (data.screen === 'GroupDetail' && data.groupId) navRef.navigate('GroupDetail', { groupId: data.groupId });
  else if (data.screen === 'DirectChat' && data.threadId) navRef.navigate('DirectChat', { threadId: data.threadId });
}

/** Tapping a notification opens that group or chat (also from a cold start). */
function useNotificationTaps(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      setTimeout(() => openFromNotification(last.notification.request.content.data as NotificationData), 300);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      openFromNotification(r.notification.request.content.data as NotificationData),
    );
    return () => sub.remove();
  }, [enabled]);
}

export default function RootNavigator() {
  const { phase } = useAuth();
  useNotificationTaps(phase === 'ready');

  if (phase === 'loading') return <Loading />;

  const stack = (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      {phase === 'signedOut' ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
        </>
      ) : phase === 'awaitingVerification' ? (
        <Stack.Screen name="Verify" component={VerifyScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="GroupList" component={GroupListScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="DirectChat" component={DirectChatScreen} />
          <Stack.Screen name="RateRiders" component={RateRidersScreen} options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack.Navigator>
  );

  return (
    <NavigationContainer ref={navRef} theme={theme}>
      {phase === 'ready' ? <SessionProvider>{stack}</SessionProvider> : stack}
    </NavigationContainer>
  );
}
