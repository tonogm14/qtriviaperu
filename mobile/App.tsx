import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useStore } from './src/store/useStore';
import { registerForPushNotifications } from './src/services/notifications';
import { navigate } from './src/navigation/navigationRef';
import { gamesApi } from './src/services/api';
import { track, setAnalyticsAuth, flush as flushAnalytics } from './src/services/analytics';

function AppInner() {
  const authState = useStore((s) => s.authState);
  const loadUser = useStore((s) => s.loadUser);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const prevAuthState = useRef<string | null>(null);

  useEffect(() => {
    if (authState === 'authenticated' && prevAuthState.current !== 'authenticated') {
      setAnalyticsAuth(true);
      track('login');
      loadUser();
      registerForPushNotifications();
    }
    if (authState === 'unauthenticated' && prevAuthState.current === 'authenticated') {
      track('logout');
      flushAnalytics();
      setAnalyticsAuth(false);
    }
    prevAuthState.current = authState;
  }, [authState, loadUser]);

  // Handle push notification tap → deep-link to Lobby
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      const gameId: string | undefined = data?.gameId;
      const type: string | undefined = data?.type;

      if (!gameId) return;

      track('push_open', 'App', 'notification_tap', { gameId, type });

      if (type === 'game_reminder' || type === 'reminder') {
        // Auto-join if not already registered, then go to lobby
        gamesApi.getMyEntry(gameId)
          .then((r) => {
            if (!r.data.data.joined) {
              return gamesApi.join(gameId);
            }
          })
          .catch(() => {})
          .finally(() => {
            navigate('Lobby', { gameId });
          });
      } else {
        navigate('Lobby', { gameId });
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppInner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
