import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
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
import { ShopScreen } from '../screens/main/ShopScreen';
import { ShopCartScreen } from '../screens/wallet/ShopCartScreen';
import { ShopCheckoutScreen } from '../screens/wallet/ShopCheckoutScreen';
import { MyOrdersScreen } from '../screens/wallet/MyOrdersScreen';
import { OrderDetailScreen } from '../screens/wallet/OrderDetailScreen';
import { YapePaymentScreen } from '../screens/wallet/YapePaymentScreen';
import { CompleteProfileScreen } from '../screens/auth/CompleteProfileScreen';
import { JuvTabBar } from '../components/JuvTabBar';
import { useStore } from '../store/useStore';
import { track } from '../services/analytics';
import { registerForPushNotifications } from '../services/notifications';

export type MainStackParamList = {
  Dashboard: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  ProfileEdit: undefined;
  CompleteProfile: undefined;
  Upcoming: undefined;
  Lobby: { gameId?: string; scheduledAt?: string; prize?: number } | undefined;
  Live: { gameId?: string } | undefined;
  Notifications: undefined;
  Prizes: undefined;
  EventCode: { gameId?: string; game?: any } | undefined;
  Shop: undefined;
  ShopCart: undefined;
  ShopCheckout: undefined;
  YapePayment: { orderData: any; total: number };
  MyOrders: undefined;
  OrderDetail: { order: any };
};

const Stack = createStackNavigator<MainStackParamList>();

const TAB_BAR_VISIBLE_SCREENS = ['Dashboard', 'Leaderboard', 'Shop', 'Profile'];

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
    const screenMap: Record<string, keyof MainStackParamList> = {
      home: 'Dashboard',
      rank: 'Leaderboard',
      shop: 'Shop',
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
  const { setActiveTab, needsProfileCompletion } = useStore();
  const [currentRoute, setCurrentRoute] = useState('Dashboard');

  useEffect(() => {
    if (!needsProfileCompletion) return;
    const timer = setTimeout(() => navigate('CompleteProfile'), 100);
    return () => clearTimeout(timer);
  }, [needsProfileCompletion]);

  // Register push token once on mount (user is authenticated at this point)
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Navigate to the right screen when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (!data?.gameId) return;
      if (data?.type === 'reminder') {
        navigate('Dashboard');
      }
    });
    return () => sub.remove();
  }, []);

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
                Shop: 'shop',
                ShopCart: 'shop',
                ShopCheckout: 'shop',
                YapePayment: 'shop',
                MyOrders: 'shop',
                OrderDetail: 'shop',
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
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="ShopCart" component={ShopCartScreen} />
        <Stack.Screen name="ShopCheckout" component={ShopCheckoutScreen} />
        <Stack.Screen name="YapePayment" component={YapePaymentScreen} />
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      </Stack.Navigator>

      <TabBarController currentRoute={currentRoute} />
    </View>
  );
};

export default MainNavigator;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
