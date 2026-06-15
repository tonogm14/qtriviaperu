import React, { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { navigate } from './navigationRef';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { LeaderboardScreen } from '../screens/main/LeaderboardScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { LobbyScreen } from '../screens/game/LobbyScreen';
import { ShopScreen } from '../screens/main/ShopScreen';
import { LiveScreen } from '../screens/game/LiveScreen';
import { UpcomingScreen } from '../screens/game/UpcomingScreen';
import { NotificationsScreen } from '../screens/wallet/NotificationsScreen';
import { WithdrawScreen } from '../screens/wallet/WithdrawScreen';
import { WithdrawSuccessScreen } from '../screens/wallet/WithdrawSuccessScreen';
import { HistoryScreen } from '../screens/wallet/HistoryScreen';
import { VipPayScreen } from '../screens/wallet/VipPayScreen';
import { ShopPayScreen } from '../screens/wallet/ShopPayScreen';
import { ShopCartScreen } from '../screens/wallet/ShopCartScreen';
import { ShopCheckoutScreen } from '../screens/wallet/ShopCheckoutScreen';
import { MyOrdersScreen } from '../screens/wallet/MyOrdersScreen';
import { OrderDetailScreen } from '../screens/wallet/OrderDetailScreen';
import { ProfileEditScreen } from '../screens/main/ProfileEditScreen';
import { JuvTabBar } from '../components/JuvTabBar';
import { useStore } from '../store/useStore';
import { track } from '../services/analytics';

export type MainStackParamList = {
  Dashboard: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  ProfileEdit: undefined;
  Shop: undefined;
  ShopCart: undefined;
  ShopCheckout: undefined;
  MyOrders: undefined;
  OrderDetail: { type: 'merch' | 'life' | 'vip'; order: any };
  Upcoming: undefined;
  Lobby: { gameId?: string; scheduledAt?: string; prize?: number } | undefined;
  Live: { gameId?: string } | undefined;
  Notifications: undefined;
  Withdraw: undefined;
  WithdrawSuccess: { amount: number; code: string };
  History: undefined;
  VipPay: { gameId?: string; entryFee?: number } | undefined;
  ShopPay: {
    type: 'lives' | 'merch';
    pack?: 'single' | 'pack3' | 'pack5';
    lives?: number;
    itemId?: string;
    emoji?: string;
    label: string;
    price: number;
    quantity: number;
    gradient: [string, string];
  };
};

const Stack = createStackNavigator<MainStackParamList>();

// Screens that show the tab bar
const TAB_BAR_VISIBLE_SCREENS = ['Dashboard', 'Leaderboard', 'Profile', 'Shop'];

// Inner component — uses global navigationRef to avoid context mismatch
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
    const screenMap: Record<string, 'Dashboard' | 'Leaderboard' | 'Profile' | 'Shop'> = {
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
                Shop: 'shop',
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
        <Stack.Screen name="Shop" component={ShopScreen} />
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
        <Stack.Screen name="Withdraw" component={WithdrawScreen} />
        <Stack.Screen name="WithdrawSuccess" component={WithdrawSuccessScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="VipPay" component={VipPayScreen} />
        <Stack.Screen name="ShopPay" component={ShopPayScreen} />
        <Stack.Screen name="ShopCart" component={ShopCartScreen} />
        <Stack.Screen name="ShopCheckout" component={ShopCheckoutScreen} />
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      </Stack.Navigator>

      <TabBarController currentRoute={currentRoute} />
    </View>
  );
};

export default MainNavigator;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
