import React, { useState, useEffect } from 'react';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../theme/colors';
import { leaderboardApi } from '../../services/api';

type Period = 'Hoy' | 'Semana' | 'Histórico';

const PERIOD_MAP: Record<Period, 'today' | 'week' | 'month' | 'all'> = {
  Hoy: 'today',
  Semana: 'week',
  Histórico: 'all',
};

const AVATAR_COLORS = [
  '#EC4899', '#34D399', '#FACC15', '#A855F7', '#F472B6',
  '#60A5FA', '#F97316', '#34D399',
];

interface LeaderboardEntry {
  rank: number;
  name: string;
  username: string;
  gamesWon: number;
  isMe: boolean;
}

interface Props {
  navigation: any;
}

export const LeaderboardScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useTabBarHeight();
  const [period, setPeriod] = useState<Period>('Semana');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    leaderboardApi
      .get(PERIOD_MAP[period])
      .then((res) => {
        const data = res.data.data || [];
        setLeaderboard(data);
      })
      .catch(() => {
        setError('No se pudo cargar el ranking. Intenta de nuevo.');
      })
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();

  return (
    <LinearGradient
      colors={[Colors.bgGradientStart, Colors.bgGradientMid, Colors.bgGradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period filter */}
      <View style={styles.filterRow}>
        {(['Hoy', 'Semana', 'Histórico'] as Period[]).map((p) => (
          period === p ? (
            <LinearGradient
              key={p}
              colors={['#EC4899', '#A855F7']}
              style={[styles.filterBtn, styles.filterBtnActive]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity onPress={() => setPeriod(p)} activeOpacity={0.8}>
                <Text style={styles.filterTxtActive}>{p}</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={styles.filterBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.filterTxt}>{p}</Text>
            </TouchableOpacity>
          )
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.yellow} />
          <Text style={styles.loadingText}>Cargando ranking...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => setPeriod(period)}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}
        >
          {/* Podium */}
          {top3.length >= 3 && (
            <View style={styles.podiumContainer}>
              {/* 2nd place */}
              <View style={[styles.podiumPlayer, styles.podiumSecond]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>2</Text>
                </View>
                <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[1] }]}>
                  <Text style={styles.avatarText}>{getInitials(top3[1]?.name || 'P')}</Text>
                </View>
                <Text style={styles.podiumName}>{top3[1]?.name}</Text>
                <Text style={styles.podiumScore}>🏆 {top3[1]?.gamesWon ?? 0}</Text>
                <View style={[styles.podiumPedestal, { height: 60, backgroundColor: Colors.purple + 'CC' }]} />
              </View>

              {/* 1st place */}
              <View style={[styles.podiumPlayer, styles.podiumFirst]}>
                <Text style={styles.crownEmoji}>👑</Text>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>1</Text>
                </View>
                <View style={[styles.avatar, styles.avatarLarge, { backgroundColor: Colors.yellow }]}>
                  <Text style={[styles.avatarText, { fontSize: 22, color: Colors.dark }]}>
                    {getInitials(top3[0]?.name || 'A')}
                  </Text>
                </View>
                <Text style={styles.podiumName}>{top3[0]?.name}</Text>
                <Text style={[styles.podiumScore, { color: Colors.yellow, fontSize: 18 }]}>
                  🏆 {top3[0]?.gamesWon ?? 0}
                </Text>
                <View style={[styles.podiumPedestal, { height: 85, backgroundColor: Colors.yellow + 'CC' }]} />
              </View>

              {/* 3rd place */}
              <View style={[styles.podiumPlayer, styles.podiumThird]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>3</Text>
                </View>
                <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[4] }]}>
                  <Text style={styles.avatarText}>{getInitials(top3[2]?.name || 'L')}</Text>
                </View>
                <Text style={styles.podiumName}>{top3[2]?.name}</Text>
                <Text style={styles.podiumScore}>🏆 {top3[2]?.gamesWon ?? 0}</Text>
                <View style={[styles.podiumPedestal, { height: 45, backgroundColor: Colors.pinkLight + 'CC' }]} />
              </View>
            </View>
          )}

          {/* Rest of leaderboard */}
          <View style={styles.listSection}>
            {rest.map((player) => (
              <View
                key={`${player.rank}-${player.username}`}
                style={[
                  styles.rankRow,
                  player.isMe && styles.rankRowMe,
                ]}
              >
                <Text style={[styles.rankNum, player.isMe && { color: Colors.yellow }]}>
                  #{player.rank}
                </Text>
                <View style={[
                  styles.rankAvatar,
                  { backgroundColor: player.isMe ? Colors.pink : AVATAR_COLORS[player.rank % AVATAR_COLORS.length] }
                ]}>
                  <Text style={styles.rankAvatarText}>{getInitials(player.name)}</Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, player.isMe && { color: Colors.yellow }]}>
                    {player.name}{player.isMe ? ' (Tú)' : ''}
                  </Text>
                  <Text style={styles.rankUsername}>@{player.username}</Text>
                </View>
                <Text style={[styles.rankScore, player.isMe && { color: Colors.yellow }]}>
                  🏆 {player.gamesWon ?? 0}
                </Text>
              </View>
            ))}
          </View>

          {leaderboard.length === 0 && (
            <Text style={styles.emptyText}>No hay datos para este período.</Text>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  filterBtnActive: {
    backgroundColor: Colors.yellow,
    borderColor: Colors.yellow,
  },
  filterTxt: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  filterTxtActive: {
    color: Colors.textOnYellow,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    color: Colors.red,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.yellow,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: Colors.textOnYellow,
    fontSize: 15,
    fontWeight: '800',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  podiumPlayer: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  podiumFirst: {
    marginBottom: 0,
  },
  podiumSecond: {
    marginBottom: 0,
  },
  podiumThird: {
    marginBottom: 0,
  },
  crownEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.dark,
    borderWidth: 2,
    borderColor: Colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  rankBadgeText: {
    color: Colors.yellow,
    fontSize: 11,
    fontWeight: '900',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.yellow,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  podiumName: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  podiumScore: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  podiumPedestal: {
    width: '80%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  listSection: {
    gap: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  rankRowMe: {
    backgroundColor: '#A855F7',
    borderColor: 'transparent',
  },
  rankNum: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '800',
    width: 36,
  },
  rankAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  rankUsername: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  rankScore: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
