import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigate } from './navigationRef';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { LeaderboardScreen } from '../screens/main/LeaderboardScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { LobbyScreen } from '../screens/game/LobbyScreen';
import { LiveScreen } from '../screens/game/LiveScreen';
import { UpcomingScreen } from '../screens/game/UpcomingScreen';
import { NotificationsScreen } from '../screens/wallet/NotificationsScreen';
import { ProfileEditScreen } from '../screens/main/ProfileEditScreen';
import { PrizesScreen } from '../screens/prizes/PrizesScreen';
import { EventCodeScreen } from '../screens/events/EventCodeScreen';
import { JuvTabBar } from '../components/JuvTabBar';
import { useStore } from '../store/useStore';
import { track } from '../services/analytics';

export type MainStackParamList = {
  Dashboard: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  ProfileEdit: undefined;
  Upcoming: undefined;
  Lobby: { gameId?: string; scheduledAt?: string; prize?: number } | undefined;
  Live: { gameId?: string } | undefined;
  Notifications: undefined;
  Prizes: undefined;
  EventCode: { gameId?: string; game?: any } | undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

const TAB_BAR_VISIBLE_SCREENS = ['Dashboard', 'Leaderboard', 'Profile'];

const TabBarController: React.FC<{ currentRoute: string }> = ({ currentRoute }) => {
  const { activeTab, setActiveTab, gameState } = useStore();

  const showTabBar = TAB_BAR_VISIBLE_SCREENS.includes(currentRoute);

  const handleTabPress = (tab: string) => {
    if (tab === 'live') {
      if (gameState === 'lobby') {
        navigate('Lobby');
      } else if (gameState === 'live') {
        navigate('Live');
      } else {
        navigate('Lobby');
      }
      return;
    }
    const screenMap: Record<string, 'Dashboard' | 'Leaderboard' | 'Profile'> = {
      home: 'Dashboard',
      rank: 'Leaderboard',
      profile: 'Profile',
    };
    const screen = screenMap[tab];
    if (screen) navigate(screen);
  };

  if (!showTabBar) return null;

  return (
    <JuvTabBar
      onTabPress={handleTabPress}
      activeTab={activeTab}
    />
  );
};

export const MainNavigator: React.FC = () => {
  const { setActiveTab } = useStore();
  const [currentRoute, setCurrentRoute] = useState('Dashboard');

  return (
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'transparent' },
        }}
        screenListeners={{
          state: (e) => {
            const routes = (e.data as any)?.state?.routes;
            if (routes && routes.length > 0) {
              const lastRoute = routes[routes.length - 1];
              setCurrentRoute(lastRoute.name);
              track('page_view', lastRoute.name);

              const tabMap: Record<string, string> = {
                Dashboard: 'home',
                Upcoming: 'live',
                Lobby: 'live',
                Live: 'live',
                Leaderboard: 'rank',
                Profile: 'profile',
              };
              if (tabMap[lastRoute.name]) {
                setActiveTab(tabMap[lastRoute.name]);
              }
            }
          },
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Upcoming" component={UpcomingScreen} />
        <Stack.Screen
          name="Lobby"
          component={LobbyScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Live"
          component={LiveScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Prizes" component={PrizesScreen} />
        <Stack.Screen name="EventCode" component={EventCodeScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      </Stack.Navigator>

      <TabBarController currentRoute={currentRoute} />
    </View>
  );
};

export default MainNavigator;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
