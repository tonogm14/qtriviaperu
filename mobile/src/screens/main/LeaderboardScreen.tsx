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
import { SparkleMotif } from '../../components/JuvMotifs';
import { JuvShapes } from '../../components/JuvShapes';
import { Colors } from '../../theme/colors';
import { leaderboardApi } from '../../services/api';
import { useStore } from '../../store/useStore';

type Period = 'Hoy' | 'Semana' | 'Histórico';

const PERIOD_MAP: Record<Period, 'today' | 'week' | 'month' | 'all'> = {
  Hoy: 'today',
  Semana: 'week',
  Histórico: 'all',
};

const AVATAR_HUES = ['#A855F7', '#EC4899', '#3B82F6', '#10B981', '#F97316', '#FACC15'];

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  username: string;
  gamesWon: number;
  isMe?: boolean;
}

interface Props {
  navigation: any;
}

export const LeaderboardScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useTabBarHeight();
  const { user } = useStore();
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
        const data: LeaderboardEntry[] = (res.data.data || []).map((e: any) => ({
          ...e,
          isMe: e.userId === user?.id,
        }));
        setLeaderboard(data);
      })
      .catch(() => setError('No se pudo cargar el ranking. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, [period, user?.id]);

  const showPodium = leaderboard.length >= 3;
  // Podium order: 2nd, 1st, 3rd (visual layout)
  const podium = showPodium
    ? [leaderboard[1], leaderboard[0], leaderboard[2]]
    : [];
  const rest = showPodium ? leaderboard.slice(3) : leaderboard;

  const initial = (name: string) => (name?.[0] ?? '?').toUpperCase();
  const avatarHue = (rank: number) => AVATAR_HUES[rank % AVATAR_HUES.length];

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.6} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period tabs */}
      <View style={styles.tabRow}>
        {(['Hoy', 'Semana', 'Histórico'] as Period[]).map((p) =>
          period === p ? (
            <LinearGradient
              key={p}
              colors={['#EC4899', '#A855F7']}
              style={styles.tabActive}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity onPress={() => setPeriod(p)} activeOpacity={0.8}>
                <Text style={styles.tabTextActive}>{p}</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={styles.tab}
              activeOpacity={0.8}
            >
              <Text style={styles.tabText}>{p}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.yellow} />
          <Text style={styles.loadingText}>Cargando ranking…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setPeriod(period)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 20 }]}
        >
          {/* Podium */}
          {showPodium && (
            <View style={styles.podiumRow}>
              {podium.map((p) => {
                const isFirst = p.rank === 1;
                const size = isFirst ? 84 : 68;
                const hue = avatarHue(p.rank);
                return (
                  <View
                    key={p.rank}
                    style={[styles.podiumCol, isFirst && styles.podiumColFirst]}
                  >
                    {isFirst && (
                      <View style={styles.sparkleWrap}>
                        <SparkleMotif size={20} color="#FACC15" />
                      </View>
                    )}
                    {/* Rank badge */}
                    <View style={[
                      styles.rankBadge,
                      { backgroundColor: isFirst ? '#FACC15' : '#A855F7' },
                    ]}>
                      <Text style={[
                        styles.rankBadgeText,
                        { color: isFirst ? '#1F0A2E' : 'white' },
                      ]}>{p.rank}</Text>
                    </View>
                    {/* Avatar */}
                    <View style={[
                      styles.podiumAvatar,
                      {
                        width: size, height: size, borderRadius: size / 2,
                        borderColor: isFirst ? '#FACC15' : 'white',
                      },
                    ]}>
                      <LinearGradient
                        colors={[hue, '#6B21A8']}
                        style={[styles.avatarGradient, { borderRadius: size / 2 }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      >
                        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
                          {initial(p.name)}
                        </Text>
                      </LinearGradient>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                    <View style={styles.winsBadge}>
                      <Text style={styles.winsBadgeText}>🏆 {p.gamesWon}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* List */}
          <View style={styles.list}>
            {rest.map((p) => (
              <View
                key={`${p.rank}-${p.userId}`}
                style={[styles.row, p.isMe && styles.rowMe]}
              >
                <Text style={[styles.rowRank, p.isMe && { color: 'white' }]}>
                  {p.rank}
                </Text>
                <LinearGradient
                  colors={p.isMe ? ['#EC4899', '#A855F7'] : [avatarHue(p.rank), '#3B0764']}
                  style={styles.rowAvatar}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.rowAvatarText}>{initial(p.name)}</Text>
                </LinearGradient>
                <Text style={[styles.rowName, p.isMe && { color: 'white' }]} numberOfLines={1}>
                  {p.name}{p.isMe ? ' (Tú)' : ''}
                </Text>
                <Text style={[styles.rowWins, p.isMe && { color: 'white' }]}>
                  🏆 {p.gamesWon}
                </Text>
              </View>
            ))}
          </View>

          {leaderboard.length === 0 && (
            <Text style={styles.emptyText}>No hay datos para este período.</Text>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 8, marginBottom: 8 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  tabActive: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999 },
  tabText: { color: 'white', fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: 'white', fontSize: 13, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  errorText: { color: '#F87171', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.yellow, borderRadius: 999, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#1F0A2E', fontSize: 15, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 6,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  podiumCol: { alignItems: 'center', flex: 1 },
  podiumColFirst: { flex: 1.2 },
  sparkleWrap: { marginBottom: 4 },
  rankBadge: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: -10, zIndex: 2,
  },
  rankBadgeText: { fontSize: 11, fontWeight: '900' },
  podiumAvatar: {
    borderWidth: 3,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: 'white', fontWeight: '900' },
  podiumName: {
    color: 'white', fontSize: 13, fontWeight: '800',
    marginTop: 8, textAlign: 'center',
  },
  winsBadge: {
    backgroundColor: '#FACC15', borderRadius: 999,
    paddingHorizontal: 9, paddingVertical: 3, marginTop: 4,
  },
  winsBadgeText: { color: '#1F0A2E', fontSize: 11, fontWeight: '800' },

  // List
  list: { gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowMe: { backgroundColor: 'transparent', borderWidth: 0, overflow: 'hidden' },
  rowRank: {
    width: 26, fontSize: 13, fontWeight: '800',
    color: 'rgba(255,255,255,0.7)', textAlign: 'center',
  },
  rowAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  rowAvatarText: { color: 'white', fontSize: 14, fontWeight: '900' },
  rowName: { flex: 1, fontSize: 14, fontWeight: '800', color: 'white' },
  rowWins: { fontSize: 13, fontWeight: '800', color: '#FACC15' },
  emptyText: {
    color: 'rgba(255,255,255,0.4)', fontSize: 15,
    textAlign: 'center', paddingVertical: 40,
  },
});
