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
import {
  SparkleMotif,
  HeartMotif,
  CoinPEMotif,
  SolMotif,
} from '../../components/JuvMotifs';
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

interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  totalPrize: number;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const tabBarHeight = useTabBarHeight();
  const { user, balance, rank, lives, logout, notifications, loadUser } = useStore();
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
  const displayBalance = balance ?? 0;

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
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>VIP</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'Carlos T.'}</Text>
          <Text style={styles.userHandle}>
            @{user?.username || 'carlos_pe'} · #47 esta semana
          </Text>
          <View style={styles.badgesRow}>
            <JuvBadge label="Maestro" color="#FACC15" />
            <JuvBadge label="🔥 Racha 7d" color="#EC4899" />
            <JuvBadge label="Top 50" color="#34D399" />
          </View>
        </View>

        {/* Withdraw hero */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Withdraw')}
          style={styles.withdrawCard}
          activeOpacity={0.9}
        >
          <View style={styles.withdrawSolDecor}>
            <SolMotif size={120} color="#1F0A2E" />
          </View>
          <CoinPEMotif size={48} />
          <View style={styles.withdrawInfo}>
            <Text style={styles.withdrawLabel}>BALANCE</Text>
            <Text style={styles.withdrawAmount}>S/{displayBalance}</Text>
            <Text style={styles.withdrawSub}>· para retirar</Text>
          </View>
          <View style={styles.withdrawBtn}>
            <Text style={styles.withdrawBtnText}>Retirar →</Text>
          </View>
        </TouchableOpacity>

        {/* Lives row */}
        <View style={styles.livesRow}>
          <View style={styles.livesHearts}>
            {[0, 1, 2].map((i) => (
              <HeartMotif key={i} size={26} color={i < (lives ?? 0) ? '#EC4899' : 'rgba(255,255,255,0.18)'} />
            ))}
          </View>
          <View style={styles.livesInfo}>
            <Text style={styles.livesCount}>{lives ?? 0} vida{lives !== 1 ? 's' : ''}</Text>
            <Text style={styles.livesSub}>Se usan si fallás y querés seguir</Text>
          </View>
          <TouchableOpacity
            style={styles.livesBtn}
            onPress={() => { track('tap', 'Profile', 'buy_lives_btn'); navigation.navigate('Shop'); }}
          >
            <Text style={styles.livesBtnText}>+ vidas</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Jugados', value: String(stats?.gamesPlayed ?? '—'), color: undefined },
            { label: 'Ganados', value: String(stats?.gamesWon ?? '—'), color: '#FACC15' },
            { label: 'Premios', value: stats ? `S/${stats.totalPrize.toLocaleString()}` : '—', color: '#34D399' },
          ].map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={[styles.statValue, s.color ? { color: s.color } : {}]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <JuvMenuItem
            icon={<SparkleMotif size={16} color="#FACC15" />}
            label="Comprar entradas VIP"
            sub="Trivia exclusiva con premio mayor"
            onPress={() => { track('tap', 'Profile', 'vip_pay'); navigation.navigate('VipPay'); }}
          />
          <JuvMenuItem
            icon={<HeartMotif size={16} color="#EC4899" />}
            label="Tienda · Vidas y merch"
            sub="Comprá vidas, polos, llaveros y más"
            onPress={() => { track('tap', 'Profile', 'shop'); navigation.navigate('Shop'); }}
          />
          <JuvMenuItem
            icon={<BellIcon />}
            label="Notificaciones"
            sub={unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
            badge={unreadCount > 0 ? unreadCount : undefined}
            onPress={() => { track('tap', 'Profile', 'notifications'); navigation.navigate('Notifications'); }}
          />
          <JuvMenuItem
            icon={<CoinPEMotif size={18} />}
            label="Historial de retiros"
            sub="Ver mis operaciones"
            onPress={() => { track('tap', 'Profile', 'history'); navigation.navigate('History'); }}
          />
          <JuvMenuItem
            icon={<Text style={{ fontSize: 16 }}>📦</Text>}
            label="Mis pedidos"
            sub="Seguimiento de tu merch"
            onPress={() => { track('tap', 'Profile', 'my_orders'); navigation.navigate('MyOrders'); }}
          />
          <JuvMenuItem
            icon={<LockIcon />}
            label="Editar perfil"
            sub="Nombre, teléfono Yape/Plin"
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
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 18,
  },
  hero: {
    alignItems: 'center',
    paddingBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 4,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarText: {
    color: 'white',
    fontSize: 38,
    fontWeight: '900',
  },
  vipBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4C1D95',
  },
  vipBadgeText: {
    color: '#1F0A2E',
    fontSize: 9,
    fontWeight: '900',
  },
  userName: {
    fontSize: 26,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
    marginTop: 12,
  },
  userHandle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  withdrawCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: '#FACC15',
    borderRadius: 22,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#FACC15',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
  },
  withdrawSolDecor: {
    position: 'absolute',
    top: -16,
    right: -16,
    opacity: 0.35,
  },
  withdrawInfo: {
    flex: 1,
  },
  withdrawLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F0A2E',
    opacity: 0.7,
    letterSpacing: 3,
  },
  withdrawAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1F0A2E',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  withdrawSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F0A2E',
    opacity: 0.7,
  },
  withdrawBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1F0A2E',
    borderRadius: 999,
  },
  withdrawBtnText: {
    color: '#FACC15',
    fontSize: 13,
    fontWeight: '800',
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    marginBottom: 12,
  },
  livesHearts: {
    flexDirection: 'row',
    gap: 4,
  },
  livesInfo: {
    flex: 1,
  },
  livesCount: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  livesSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  livesBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EC4899',
  },
  livesBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 2,
  },
  menu: {},
  logoutBtn: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
});
