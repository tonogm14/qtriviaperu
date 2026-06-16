import React, { useEffect, useState } from 'react';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { JuvShapes } from '../../components/JuvShapes';
import { JuvBadge } from '../../components/JuvBadge';
import { JuvMenuItem } from '../../components/JuvMenu';
import { SparkleMotif } from '../../components/JuvMotifs';
import { useStore } from '../../store/useStore';
import { authApi } from '../../services/api';
import { track } from '../../services/analytics';
import Svg, { Path, Rect } from 'react-native-svg';

interface Props {
  navigation: any;
}

const BellIcon = () => (
  <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
    <Path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0" />
  </Svg>
);

const LockIcon = () => (
  <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={4} y={11} width={16} height={10} rx={2} />
    <Path d="M8 11V7a4 4 0 018 0v4" />
  </Svg>
);

const TrophyIcon = () => (
  <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#FACC15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M8 21h8M12 17v4M7 4H4a2 2 0 00-2 2v3c0 2.2 1.8 4 4 4h1M17 4h3a2 2 0 012 2v3c0 2.2-1.8 4-4 4h-1" />
    <Path d="M7 4h10v9a5 5 0 01-10 0V4z" />
  </Svg>
);

interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  totalPrize: number;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useTabBarHeight();
  const { user, rank, logout, notifications, loadUser } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadUser();
    track('page_view', 'Profile');
  }, [loadUser]);

  useEffect(() => {
    if (!user?.id) return;
    authApi.myStats(user.id)
      .then((r) => {
        const d = r.data?.data;
        if (d) setStats({ gamesPlayed: d.gamesPlayed ?? 0, gamesWon: d.gamesWon ?? 0, totalPrize: d.totalPrize ?? 0 });
      })
      .catch(() => {});
  }, [user?.id]);

  const initial = user?.name?.[0]?.toUpperCase() || 'C';

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.7} seed={1} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight }]}
      >
        {/* Avatar hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={['#FACC15', '#EC4899', '#A855F7']}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LinearGradient
                colors={['#EC4899', '#6B21A8']}
                style={styles.avatarInner}
              >
                <Text style={styles.avatarText}>{initial}</Text>
              </LinearGradient>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{user?.name || 'Jugador'}</Text>
          <Text style={styles.userHandle}>
            @{user?.username || 'usuario'}{rank > 0 ? ` · #${rank} esta semana` : ''}
          </Text>
          <View style={styles.badgesRow}>
            <JuvBadge label="Maestro" color="#FACC15" />
            <JuvBadge label="🔥 Racha 7d" color="#EC4899" />
            <JuvBadge label="Top 50" color="#34D399" />
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Jugados',  value: String(stats?.gamesPlayed ?? '—'), color: undefined },
            { label: 'Ganados',  value: String(stats?.gamesWon ?? '—'),    color: '#FACC15' },
            { label: 'Premios',  value: stats ? `S/${stats.totalPrize.toLocaleString()}` : '—', color: '#34D399' },
          ].map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={[styles.statValue, s.color ? { color: s.color } : {}]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <JuvMenuItem
            icon={<TrophyIcon />}
            label="Mis Premios"
            sub={stats && stats.gamesWon > 0 ? `${stats.gamesWon} premios · S/${stats.totalPrize.toLocaleString()} histórico` : 'Ver historial de premios recibidos'}
            onPress={() => { track('tap', 'Profile', 'prizes'); navigation.navigate('Prizes'); }}
          />
          <JuvMenuItem
            icon={<BellIcon />}
            label="Notificaciones"
            sub={unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
            badge={unreadCount > 0 ? unreadCount : undefined}
            onPress={() => { track('tap', 'Profile', 'notifications'); navigation.navigate('Notifications'); }}
          />
          <JuvMenuItem
            icon={<SparkleMotif size={16} color="#A855F7" />}
            label="Eventos Especiales"
            sub="Torneos exclusivos por invitación"
            onPress={() => { track('tap', 'Profile', 'events'); navigation.navigate('Dashboard'); }}
          />
          <JuvMenuItem
            icon={<LockIcon />}
            label="Editar perfil"
            sub="Nombre y teléfono"
            onPress={() => { track('tap', 'Profile', 'edit_profile'); navigation.navigate('ProfileEdit'); }}
          />
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 60, paddingHorizontal: 18 },
  hero: { alignItems: 'center', paddingBottom: 28 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarGradient: { width: 110, height: 110, borderRadius: 55, padding: 4 },
  avatarInner: {
    flex: 1, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'white',
  },
  avatarText: { color: 'white', fontSize: 38, fontWeight: '900' },
  userName: { fontSize: 26, fontWeight: '900', color: 'white', letterSpacing: -0.5, marginTop: 12 },
  userHandle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginTop: 4 },
  badgesRow: { flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCell: {
    flex: 1, padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  menu: {},
  logoutBtn: { alignItems: 'center', padding: 16, marginTop: 8 },
  logoutText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '700' },
});
