import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { useStore } from '../store/useStore';

// ── Custom tab icons ──────────────────────────────────────────────

const HomeIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg viewBox="0 0 28 28" width={26} height={26}>
    <Path
      d="M5 14 L14 6 L23 14 V22 a2 2 0 0 1-2 2 H7 a2 2 0 0 1-2-2 z"
      fill={active ? '#FACC15' : 'none'}
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    {active && <Circle cx={14} cy={16} r={2.2} fill="#1F0A2E" />}
  </Svg>
);

const LiveIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg viewBox="0 0 28 28" width={26} height={26}>
    <Path
      d="M16 3 L7 16 H13 L11 25 L21 12 H15 Z"
      fill={active ? '#FACC15' : 'rgba(255,255,255,0.85)'}
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </Svg>
);

const TrophyIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg viewBox="0 0 28 28" width={26} height={26}>
    <Path
      d="M9 4 L14 12 L19 4"
      fill="none"
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Circle
      cx={14}
      cy={18}
      r={6}
      fill={active ? '#FACC15' : 'none'}
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={2}
    />
    {active && (
      <SvgText
        x={14}
        y={21.5}
        textAnchor="middle"
        fontSize={8}
        fontWeight="900"
        fill="#1F0A2E"
      >
        1
      </SvgText>
    )}
  </Svg>
);

const ShopIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg viewBox="0 0 28 28" width={26} height={26} fill="none">
    <Path
      d="M5 8l2.5 10h13L23 8H5z"
      fill={active ? '#FACC15' : 'none'}
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <Path
      d="M5 8l-1-4H2"
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {active ? (
      <>
        <Circle cx={10} cy={22} r={1.5} fill="#1F0A2E" />
        <Circle cx={18} cy={22} r={1.5} fill="#1F0A2E" />
      </>
    ) : (
      <>
        <Circle cx={10} cy={22} r={1.5} fill="rgba(255,255,255,0.7)" />
        <Circle cx={18} cy={22} r={1.5} fill="rgba(255,255,255,0.7)" />
      </>
    )}
    <Path
      d="M11 13v-2a3 3 0 016 0v2"
      stroke={active ? '#1F0A2E' : 'rgba(255,255,255,0.7)'}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const UserIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg viewBox="0 0 28 28" width={26} height={26}>
    <Circle
      cx={14}
      cy={14}
      r={9}
      fill={active ? '#FACC15' : 'none'}
      stroke={active ? '#FACC15' : 'rgba(255,255,255,0.7)'}
      strokeWidth={2}
    />
    <Circle cx={11} cy={13} r={1.2} fill={active ? '#1F0A2E' : 'rgba(255,255,255,0.7)'} />
    <Circle cx={17} cy={13} r={1.2} fill={active ? '#1F0A2E' : 'rgba(255,255,255,0.7)'} />
    <Path
      d="M11 17 q 3 2 6 0"
      fill="none"
      stroke={active ? '#1F0A2E' : 'rgba(255,255,255,0.7)'}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

// ── Tab data ──────────────────────────────────────────────────────

const TABS = [
  { id: 'home',    label: 'Inicio',  Icon: HomeIcon,   isLive: false },
  { id: 'live',    label: 'En vivo', Icon: LiveIcon,   isLive: true  },
  { id: 'rank',    label: 'Ranking', Icon: TrophyIcon, isLive: false },
  { id: 'shop',    label: 'Tienda',  Icon: ShopIcon,   isLive: false },
  { id: 'profile', label: 'Tú',      Icon: UserIcon,   isLive: false },
];

// ── Live dot with pulse animation ─────────────────────────────────

const LiveDot: React.FC = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 700 }),
        withTiming(1, { duration: 700 })
      ),
      -1,
      false
    );
  }, [opacity, scale]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -2,
          right: -8,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#EF4444',
          borderWidth: 2,
          borderColor: '#1F0A2E',
        },
        dotStyle,
      ]}
    />
  );
};

// ── Tab item ──────────────────────────────────────────────────────

const TabItem: React.FC<{
  tab: typeof TABS[0];
  isActive: boolean;
  isLiveAlert: boolean;
  onPress: () => void;
}> = ({ tab, isActive, isLiveAlert, onPress }) => {
  const pillScale = useSharedValue(isActive ? 1 : 0.6);
  const pillOpacity = useSharedValue(isActive ? 1 : 0);
  const alertScale = useSharedValue(1);
  const alertOpacity = useSharedValue(isLiveAlert ? 1 : 0);

  useEffect(() => {
    pillScale.value = withSpring(isActive ? 1 : 0.6, { damping: 15, stiffness: 200 });
    pillOpacity.value = withTiming(isActive ? 1 : 0, { duration: 280 });
  }, [isActive, pillOpacity, pillScale]);

  useEffect(() => {
    alertOpacity.value = withTiming(isLiveAlert ? 1 : 0, { duration: 300 });
    if (isLiveAlert) {
      alertScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    } else {
      alertScale.value = withTiming(1, { duration: 200 });
    }
  }, [isLiveAlert, alertOpacity, alertScale]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pillScale.value }],
    opacity: pillOpacity.value,
  }));

  const alertStyle = useAnimatedStyle(() => ({
    transform: [{ scale: alertScale.value }],
    opacity: alertOpacity.value,
  }));

  return (
    <TouchableOpacity
      style={{
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Live alert glow pill */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 8,
            width: 54,
            height: 40,
            borderRadius: 14,
            backgroundColor: 'rgba(239,68,68,0.22)',
            borderWidth: 1.5,
            borderColor: 'rgba(239,68,68,0.7)',
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 10,
            elevation: 6,
          },
          alertStyle,
        ]}
      />
      {/* Active pill highlight */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 8,
            width: 50,
            height: 38,
            borderRadius: 14,
            backgroundColor: 'rgba(250,204,21,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(250,204,21,0.35)',
          },
          pillStyle,
        ]}
      />
      {/* Icon + live dot */}
      <View style={{ position: 'relative', height: 28, justifyContent: 'center' }}>
        <tab.Icon active={isActive || isLiveAlert} />
        {tab.isLive && <LiveDot />}
      </View>
      {/* Label */}
      <Text
        style={{
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.4,
          color: isActive ? '#FACC15' : isLiveAlert ? '#EF4444' : 'rgba(255,255,255,0.6)',
        }}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
};

// ── Tab bar ───────────────────────────────────────────────────────

interface JuvTabBarProps {
  onTabPress: (key: string) => void;
  activeTab?: string;
}

export const JuvTabBar: React.FC<JuvTabBarProps> = ({ onTabPress, activeTab }) => {
  const { activeTab: storeTab, setActiveTab, hasLiveGame } = useStore();
  const currentTab = activeTab || storeTab;
  const insets = useSafeAreaInsets();

  const handlePress = (id: string) => {
    setActiveTab(id);
    onTabPress(id);
  };

  return (
    <LinearGradient
      colors={['rgba(31,10,46,0.92)', 'rgba(20,8,31,0.96)']}
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14 + (Platform.OS === 'android' ? insets.bottom : 0),
        height: 72,
        borderRadius: 26,
        borderWidth: 1.5,
        borderColor: hasLiveGame && currentTab !== 'live'
          ? 'rgba(239,68,68,0.4)'
          : 'rgba(250,204,21,0.18)',
        flexDirection: 'row',
        paddingHorizontal: 6,
        shadowColor: hasLiveGame && currentTab !== 'live' ? '#EF4444' : '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 20,
      }}
    >
      {TABS.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={currentTab === tab.id}
          isLiveAlert={tab.isLive && hasLiveGame && currentTab !== 'live'}
          onPress={() => handlePress(tab.id)}
        />
      ))}
    </LinearGradient>
  );
};
